const Joi = require("joi");
const fetch = require("node-fetch");
const fs = require("fs");

module.exports = {
  evaluate: function(req, res, next) {
    const result = Joi.validate(req.body, schema);
    if (result.error !== null)
      return res.status(400).json({ message: result.error.details[0].message });
    let choosenDataset = req.body.dataset;
    let systemUrl = req.body.systemUrl;
    let name = req.body.name;
    let totalQuestions;

    if (datasets.includes(choosenDataset)) {
      let dataset;
      try {
        dataset = require("../datasets/" + choosenDataset);
        totalQuestions = dataset.questions.length;
      } catch (error) {
        console.log("Dataset couldn't be loaded", error);
        return res.status(500);
      }
      let date = Date.now();

      let currentEval = {
        id: date,
        startTimestamp: date,
        endTimestamp: null,
        name,
        dataset: choosenDataset,
        systemUrl,
        runningUrl: "http://localhost:3000/runningEvals/" + date,
        results: [],
        errors: [],
        totalQuestions,
        processedQuestions: 0,
        progress: 0 + "%",
        status: "preparing"
      };
      runningEvals[String(date)] = currentEval;
      console.log(
        "Evaluation with dataset: " + choosenDataset + " has started."
      );
      let url = systemUrl + "?query=";

      currentEval.status = "questioning";

      askQuestion(url, 0, totalQuestions, currentEval, dataset);
      res.json(currentEval);
    } else {
      res.json({ message: "Dataset not available!" });
    }
  }
};

// schema for body validatino
const schema = Joi.object().keys({
  systemUrl: Joi.string()
    .max(400)
    .required(),
  name: Joi.string()
    .min(3)
    .max(25)
    .required(),
  dataset: Joi.string()
    .min(4)
    .max(25)
    .required()
});

function askQuestion(url, questionIndex, totalQuestions, currentEval, dataset) {
  let q = dataset.questions[questionIndex];
  let question = (function() {
    for (let lang of q.question) {
      if (lang.language === "en") return lang.string;
    }
  })();

  let questionUrl = url + encodeURI(question);
  console.log("============ Question asked ============");
  console.log("RequestUrl: ", questionUrl);
  fetch(questionUrl, {
    method: "POST"
  })
    .then(function(response) {
      if (response.status !== 200) {
        console.log(
          "Looks like there was a problem. Status Code: " + response.status
        );

        currentEval.errors.push({ questionId: q.id, error: response.status });
        currentEval.processedQuestions++;
        updatesStatus(currentEval, totalQuestions);
        nextQuestion(currentEval, totalQuestions, dataset, questionIndex, url);

        return;
      }
      // Examine the text in the response
      response.json().then(function(data) {
        currentEval.results.push({ id: q.id, data: data });
        currentEval.processedQuestions++;
        updatesStatus(currentEval, totalQuestions);
        nextQuestion(currentEval, totalQuestions, dataset, questionIndex, url);

        console.log(
          "processedQuestions: ",
          currentEval.processedQuestions + " / " + totalQuestions
        );
      });
    })
    .catch(function(err) {
      console.log("Fetch Error :-S", err);
      currentEval.errors.push({ questionId: q.id, error: err });
      //updatesStatus(currentEval, totalQuestions);
      currentEval.processedQuestions++;
      nextQuestion(currentEval, totalQuestions, dataset, questionIndex, url);
    });
}

// next question or end the evaluation
function nextQuestion(
  currentEval,
  totalQuestions,
  dataset,
  questionIndex,
  url
) {
  if (currentEval.processedQuestions === totalQuestions) {
    if (currentEval.results.length === 0) {
      fs.readFile("./data/evaluations.json", "utf8", (err, data) => {
        if (err) {
          console.log(err);
        } else {
          currentEval.status = "failed";
          obj = JSON.parse(data);
          delete currentEval.results;
          obj[String(currentEval.id)] = currentEval;
          fs.writeFile(
            "./data/evaluations.json",
            JSON.stringify(obj),
            "utf8",
            function() {}
          );
        }
      });
      delete runningEvals[String(currentEval.id)];
      return console.log("Evaluation aborted, no restults found");
    }
    currentEval.status = "calculating";
    evaluate(currentEval, dataset);
  } else {
    askQuestion(url, ++questionIndex, totalQuestions, currentEval, dataset);
  }
}

// updating the status of an evaluation
function updatesStatus(currentEval, totalQuestions) {
  currentEval.progress =
    ((currentEval.processedQuestions * 100) / totalQuestions).toFixed(0) + "%";
  io.sockets.emit("updateStatus", JSON.stringify(currentEval));
}

function saveFile(filePath, content) {
  let pathToSaveAt = filePath;
  fs.access(pathToSaveAt, fs.F_OK, err => {
    if (err) {
      fs.writeFile(pathToSaveAt, content, function() {});
      return;
    }
    console.log("File exists already!");
  });
}

function evaluate(currentEval, dataset) {
  console.log("=== Evaluation started ===");
  let evalCount = 0;
  for (let r of currentEval.results) {
    for (let q of dataset.questions) {
      if (r.id === q.id) {
        console.log("QuestionID: " + r.id);
        evalCount++;
        console.log(
          "Eval Progress: ",
          evalCount + " / " + currentEval.results.length
        );
        let answerType;
        let expectedAnswers = [];

        if (q.answers[0].head.vars === undefined) {
          answerType = "boolean";
          expectedAnswers.push(q.answers[0].boolean);
        } else {
          answerType = q.answers[0].head.vars[0];
          if (answerType === "c") {
            expectedAnswers.push(
              Number(q.answers[0].results.bindings[0][answerType].value)
            );
          } else {
            if (q.answers[0].results.bindings) {
              for (let a of q.answers[0].results.bindings) {
                expectedAnswers.push(a[answerType].value);
              }
            }
          }
        }

        let givenAnswers = [];

        let question = r.data.questions[0];
        if (question.answers.length !== 0) {
          let cond1 = Object.entries(question.answers[0]).length === 0; // answers array can contain an empty object, filter these

          if (!cond1) {
            // empty answers
            let answer = question.answers[0];
            if (answer.head.vars === undefined) {
              givenAnswers.push(answer.boolean);
            } else {
              for (let vars of answer.head.vars) {
                for (let s of answer.results.bindings) {
                  let i = 0;
                  if (givenAnswers.length === 0) {
                    givenAnswers.push(s[vars].value);
                  } else {
                    // Filter for answers that are already in the givenAnswers array
                    for (; i < givenAnswers.length; i++) {
                      if (givenAnswers[i] == s[vars].value) {
                        break;
                      } else if (i === givenAnswers.length - 1) {
                        givenAnswers.push(s[vars].value);
                      }
                    }
                  }
                }
              }
            }
          } else {
            //givenAnswers.push({});
          }
        }

        r.NrExpected = expectedAnswers.length;
        r.NrSystem = givenAnswers.length;
        r.NrCorrect = 0;

        for (let e of expectedAnswers) {
          for (let g of givenAnswers) {
            if (e == g) {
              r.NrCorrect++;
            }
          }
        }

        // console.log("expecte " + expectedAnswers);
        // console.log("given " + givenAnswers);

        console.log("========================================");
        console.log("Evaluated Question: ", r);

        break;
      }
    }
  }
  calculateResult(currentEval);
}

function calculateResult(currentEval) {
  /** Calculate recall, precision and f-measure for every question.
              Calculate F-measure for the entire pipeline*/
  let recallTot = 0;
  let qaldPrecisionTot = 0;
  let precisionTot = 0;
  let fMeasureTot = 0;

  for (let q of currentEval.results) {
    q.calc = [];
    let recall = calcRecall(q);
    let qaldPrecision = calcPrecision(q, true);
    let precision = calcPrecision(q, false);
    let fMeasure = calcFMeasure(recall, precision);

    recallTot += recall;
    precisionTot += precision;
    qaldPrecisionTot += qaldPrecision;
    fMeasureTot += fMeasure;

    q.calc.push({
      recall,
      precision,
      qaldPrecision,
      fMeasure
    });
  }

  /** Add global Recall, Precicion and FMeasure to the Pipeline */
  let totalQuestions = currentEval.results.length - currentEval.errors.length;

  currentEval.evalResults = {};
  currentEval.evalResults.grc = recallTot / totalQuestions;
  currentEval.evalResults.gpr = precisionTot / totalQuestions;
  currentEval.evalResults.QALDgpr = qaldPrecisionTot / totalQuestions;
  currentEval.evalResults.gfm = fMeasureTot / totalQuestions;

  if (
    currentEval.evalResults.grc === 0 &&
    currentEval.evalResults.QALDgpr === 0
  ) {
    currentEval.evalResults.QALDgfm = 0;
  } else {
    currentEval.evalResults.QALDgfm =
      (2 * currentEval.evalResults.grc * currentEval.evalResults.QALDgpr) /
      (currentEval.evalResults.grc + currentEval.evalResults.QALDgpr);
  }
  let filePath = `./data/evaluatedAnswers/${currentEval.name}-${
    currentEval.id
  }.json`;
  let dataToSave = JSON.stringify(currentEval.results);
  saveFile(filePath, dataToSave);

  // TODO:  remove doublicated Code
  fs.readFile("./data/evaluations.json", "utf8", (err, data) => {
    if (err) {
      console.log(err);
    } else {
      obj = JSON.parse(data); //now it an object
      delete currentEval.results;
      obj[String(currentEval.id)] = currentEval;
      fs.writeFile(
        "./data/evaluations.json",
        JSON.stringify(obj),
        "utf8",
        function() {}
      );
    }
  });
  currentEval.status = "successful";
  currentEval.endTimestamp = Date.now();
  io.sockets.emit("evalEnded", JSON.stringify(currentEval));
  delete runningEvals[String(currentEval.id)];

  console.log("========== Evaluation Result =========== ");
  console.log("grc", currentEval.evalResults.grc);
  console.log("gpr", currentEval.evalResults.gpr);
  console.log("QALDgpr", currentEval.evalResults.QALDgpr);
  console.log("gfm", currentEval.evalResults.gfm);
  console.log("QALDgfm", currentEval.evalResults.QALDgfm);
}

/* calculations */
function calcRecall(q) {
  if (q.NrExpected === 0 && q.NrSystem === 0) return 1;
  if (q.NrExpected === 0 && q.NrSystem > 0) return 0;
  if (q.NrExpected > 0 && q.NrSystem === 0) return 0;
  return q.NrCorrect / q.NrExpected;
}

function calcPrecision(q, isQald) {
  if (q.NrExpected === 0 && q.NrSystem === 0) return 1;
  if (q.NrExpected === 0 && q.NrSystem > 0) return 0;
  // QALD
  if (isQald) {
    if (q.NrExpected > 0 && q.NrSystem === 0) return 1;
  } else {
    if (q.NrExpected > 0 && q.NrSystem === 0) return 0;
  }
  return q.NrCorrect / q.NrSystem;
}

function calcFMeasure(rec, prec) {
  if (rec === 0 && prec === 0) return 0;
  return (2 * rec * prec) / (rec + prec);
}
