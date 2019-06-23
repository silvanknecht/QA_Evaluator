const express = require("express");
const path = require("path");
const fetch = require("node-fetch");
const fs = require("fs");
const Joi = require("joi");

const app = express();

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`App listening on port ${port}!`));

//set the template engine ejs
app.set("view engine", "ejs");

app.use(express.json());

app.use(express.static(__dirname + "/public"));
app.get("/", (req, res) => {
  res.render("index");
});

let runningEvals = {};
let datasets = ["qald-9", "testData20", "1question"];

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

app.post("/evaluate", (req, res) => {
  const result = Joi.validate(req.body, schema);
  if (result.error !== null)
    return res.json({ message: result.error.details[0].message });
  let choosenDataset = req.body.dataset;
  let systemUrl = req.body.systemUrl;
  let name = req.body.name;
  let totalQuestions;

  if (datasets.includes(choosenDataset)) {
    let dataset;
    try {
      dataset = require(__dirname + "/datasets/" + choosenDataset);
      totalQuestions = dataset.questions.length;
    } catch (error) {
      console.log("Dataset couldn't be loaded", error);
      return res.json({ message: "Dataset couldn't be loaded" });
    }
    let date = Date.now();

    let currentEval = {
      id: date,
      name,
      dataset: choosenDataset,
      systemUrl,
      runningUrl: "http://localhost:3000/runningEvals/" + date,
      results: [],
      errors: [],
      totalQuestions,
      count: 0,
      progress: 0 + "%",
      status: "preparing"
    };
    runningEvals[String(date)] = currentEval;
    console.log("Evaluation with dataset: " + choosenDataset + " has started.");
    let url = systemUrl + "?query=";

    currentEval.status = "questioning the system";

    askQuestion(url, 0, totalQuestions, currentEval, dataset);

    res.json({ currentEval });
  } else {
    res.json({ message: "Dataset not available!" });
  }
});

function askQuestion(url, questionIndex, totalQuestions, currentEval, dataset) {
  let q = dataset.questions[questionIndex];
  let question = (function() {
    for (let lang of q.question) {
      if (lang.language === "en") return lang.string;
    }
  })();

  fetch(url + encodeURI(question), {
    method: "POST"
  })
    .then(function(response) {
      if (response.status !== 200) {
        console.log(
          "Looks like there was a problem. Status Code: " + response.status
        );

        currentEval.errors.push(q.id);
        updatesStatus(currentEval, totalQuestions);

        return;
      }
      // Examine the text in the response
      response.json().then(function(data) {
        currentEval.results.push({ id: q.id, data: data });
        updatesStatus(currentEval, totalQuestions);

        if (currentEval.count === totalQuestions) {
          let filePath = `logs/systemAnswers/${currentEval.name}-${
            currentEval.id
          }.json`;
          let dataToSave = JSON.stringify(currentEval.results);
          currentEval.status = "starting calculations...";
          saveFile(filePath, dataToSave);
          evaluate(currentEval, dataset);
        } else {
          askQuestion(
            url,
            ++questionIndex,
            totalQuestions,
            currentEval,
            dataset
          );
        }
        console.log(currentEval.count);
      });
    })
    .catch(function(err) {
      currentEval.errors.push(q.id);
      updatesStatus(currentEval, totalQuestions);
      console.log("Fetch Error :-S", err);
    });
}

// updating the status of an evaluation
function updatesStatus(currentEval, totalQuestions) {
  currentEval.progress =
    ((++currentEval.count * 100) / totalQuestions).toFixed(3) + "%";
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
  let evalCount = 0;
  for (let r of currentEval.results) {
    for (let q of dataset.questions) {
      if (r.id === q.id) {
        console.log("id" + r.id);
        evalCount++;
        console.log("Eval count: ", evalCount);
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

        let vars;
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
              vars = answer.head.vars[0];
              for (let s of answer.results.bindings) {
                givenAnswers.push(s[vars].value);
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

        console.log("expecte " + expectedAnswers);
        console.log("given " + givenAnswers);
        console.log(r);
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
  let filePath = `logs/evaluatedAnswers/${currentEval.name}-${
    currentEval.id
  }.json`;
  let dataToSave = JSON.stringify(currentEval.results);
  saveFile(filePath, dataToSave);

  fs.readFile("./logs/evaluations.json", "utf8", (err, data) => {
    if (err) {
      console.log(err);
    } else {
      obj = JSON.parse(data); //now it an object
      delete currentEval.results;
      obj[String(currentEval.id)] = currentEval;
      fs.writeFile(
        "./logs/evaluations.json",
        JSON.stringify(obj),
        "utf8",
        function() {}
      );
    }
  });
  currentEval.status = "done";
  delete runningEvals[String(currentEval.id)];

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

// returns all currently running evaluations
app.get("/runningEvals/:id?", (req, res) => {
  if (req.params.id === undefined) {
    res.json(runningEvals);
  } else {
    let jsonToReturn = runningEvals[String(req.params.id)];
    if (jsonToReturn === undefined) {
      res.redirect("/finishedEvals/" + req.params.id);
      // res.status(404).json({
      //   message: "Evaluation with id: " + req.params.id + " not found!"
      // });
    }
    res.json(runningEvals[String(req.params.id)]);
  }
});

// returns all finished evaluations
app.get("/finishedEvals/:id?", (req, res) => {
  let evaluations = require("./logs/evaluations.json");
  if (req.params.id === undefined) {
    res.json(evaluations);
  } else {
    console.log(req.params.id);
    let jsonToReturn = evaluations[String(req.params.id)];
    if (jsonToReturn === undefined)
      res.status(404).json({
        message: "Evaluation with id: " + req.params.id + " not found!"
      });
    res.json(evaluations[String(req.params.id)]);
  }
});

// returns the answers of a system without evaluations
app.get("/systemAnswers/:name/:id", (req, res) => {
  try {
    let systemAnswers = require(`./logs/systemAnswers/${req.params.name}-${
      req.params.id
    }.json`);
    res.json(systemAnswers);
  } catch (error) {
    res.status(404).json({
      message: "File not found!"
    });
  }
});
