const fetch = require("node-fetch");
const fs = require("fs");

module.exports = {
  startEvaluation: function(req, res, next) {
    let { dataset, systemUrl, name } = req.body;
    let totalQuestions = datasets[dataset].questions.length;

    let date = Date.now();

    let currentEval = {
      id: date,
      name,
      startTimestamp: date,
      endTimestamp: null,
      dataset,
      systemUrl,
      runningUrl: evaluationUrl + "runningEvals/" + date,
      evaluatorVersion,
      results: [],
      errors: [],
      totalQuestions,
      processedQuestions: 0,
      progress: 0 + "%",
      status: "starting..."
    };
    runningEvals[String(date)] = currentEval;
    console.log("Evaluation with dataset: " + dataset + " has started.");

    module.exports.findNextQuestion(currentEval);
    io.sockets.emit("evalStarted", JSON.stringify(currentEval));
    res.json(currentEval);

  }, // next question or end the evaluation
  findNextQuestion: function(currentEval) {
    let { id, name, processedQuestions, totalQuestions, results } = currentEval;

    if (processedQuestions === totalQuestions) {
      // if the evaluation doesn't find any
      if (results.length === 0) {
        fs.readFile("./data/evaluations.json", "utf8", (err, data) => {
          if (err) {
            console.log(err);
          } else {
            currentEval.status = "failed";
            io.sockets.emit("evalEnded", JSON.stringify(currentEval));
            obj = JSON.parse(data);
            delete currentEval.results;
            obj[String(id)] = currentEval;
            fs.writeFile(
              "./data/evaluations.json",
              JSON.stringify(obj),
              "utf8",
              () => {}
            );
          }
        });
        delete runningEvals[String(id)];
        console.log("Evaluation aborted, no restults found");
        return;
      }

      // save system answers before evaluation (in case something goes wrong with the evaluation)
      let filePath = `./data/systemAnswers/${name}-${id}.json`;
      let dataToSave = JSON.stringify(results);
      saveFile(filePath, dataToSave);
      module.exports.evaluate(currentEval);
      return;
    } else {
      module.exports.askQuestion(processedQuestions, currentEval);
      return;
    }
  },
  askQuestion: function(questionIndex, currentEval) {
    let { dataset, systemUrl, totalQuestions } = currentEval;
    currentEval.status = "questioning";
    let q = datasets[dataset].questions[questionIndex];
    let question = (() => {
      for (let lang of q.question) {
        if (lang.language === "en") return lang.string;
      }
    })();

    let questionUrl = systemUrl + "?query=" + encodeURI(question);
    console.log("============ Question asked ============");
    console.log("RequestUrl: ", questionUrl);
    fetch(questionUrl, {
      method: "POST"
    })
      .then(response => {
        if (response.status !== 200) {
          console.log(
            "Looks like there was a problem. Status Code: " + response.status
          );

          currentEval.errors.push({ questionId: q.id, error: response.status });
          currentEval.processedQuestions++;
          module.exports.updatesStatus(currentEval);
          module.exports.findNextQuestion(currentEval);
          return;
        }
        // Examine the text in the response
        response.json().then(data => {
          currentEval.results.push({ id: q.id, data: data });
          currentEval.processedQuestions++;
          module.exports.updatesStatus(currentEval);
          module.exports.findNextQuestion(currentEval);

          console.log(
            "processedQuestions: ",
            currentEval.processedQuestions + " / " + totalQuestions
          );
          return data;
        });
      })
      .catch(err => {
        console.log("Fetch Error :-S", err);
        currentEval.errors.push({ questionId: q.id, error: err });
        //updatesStatus(currentEval, totalQuestions);
        currentEval.processedQuestions++;
        module.exports.findNextQuestion(currentEval);
      });
  }, // updating the status of an evaluation
  updatesStatus: function(currentEval) {
    let { processedQuestions, totalQuestions } = currentEval;

    currentEval.progress =
      ((processedQuestions * 100) / totalQuestions).toFixed(0) + "%";
    io.sockets.emit("updateStatus", JSON.stringify(currentEval));
  },
  evaluate: function(currentEval) {
    let { dataset, results } = currentEval;
    console.log("=== Evaluation started ===");
    currentEval.status = "evaluating";
    let evalCount = 0;
    for (let r of results) {
      for (let q of datasets[dataset].questions) {
        if (r.id === q.id) {
          evalCount++;
          console.log("Eval Progress: ", evalCount + " / " + results.length);
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
    module.exports.calculateResult(currentEval);
  },
  calculateResult: function(currentEval) {
    let { id, name, results } = currentEval;
    currentEval.status = "calculating";
    /** Calculate recall, precision and f-measure for every question.
                Calculate F-measure for the entire pipeline*/
    let recallTot = 0;
    let qaldPrecisionTot = 0;
    let precisionTot = 0;
    let fMeasureTot = 0;

    for (let q of results) {
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
    let totalResults = results.length; // don't consider errors

    currentEval.evalResults = {};
    currentEval.evalResults.grc = recallTot / totalResults;
    currentEval.evalResults.gpr = precisionTot / totalResults;
    currentEval.evalResults.QALDgpr = qaldPrecisionTot / totalResults;
    currentEval.evalResults.gfm = fMeasureTot / totalResults;

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
    let filePath = `./data/evaluatedAnswers/${name}-${id}.json`;
    let dataToSave = JSON.stringify(currentEval.results);
    saveFile(filePath, dataToSave);

    // TODO:  remove doublicated Code
    fs.readFile("./data/evaluations.json", "utf8", (err, data) => {
      if (err) {
        console.log(err);
      } else {
        obj = JSON.parse(data);
        delete currentEval.results;
        obj[String(id)] = currentEval;
        fs.writeFile(
          "./data/evaluations.json",
          JSON.stringify(obj),
          "utf8",
          () => {}
        );
      }
    });
    currentEval.status = "successful";
    currentEval.endTimestamp = Date.now();
    io.sockets.emit("evalEnded", JSON.stringify(currentEval));
    delete runningEvals[String(id)];

    console.log("========== Evaluation Result =========== ");
    console.log("grc", currentEval.evalResults.grc);
    console.log("gpr", currentEval.evalResults.gpr);
    console.log("QALDgpr", currentEval.evalResults.QALDgpr);
    console.log("gfm", currentEval.evalResults.gfm);
    console.log("QALDgfm", currentEval.evalResults.QALDgfm);
  }
};

function saveFile(filePath, content) {
  let pathToSaveAt = filePath;
  fs.access(pathToSaveAt, fs.F_OK, err => {
    if (err) {
      fs.writeFile(pathToSaveAt, content, () => {});
      return;
    }
    console.log("File exists already!");
  });
}

/* metrics */
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
