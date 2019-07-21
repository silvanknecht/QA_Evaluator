const fetch_retry = require("node-fetch-retry");
const fs = require("fs");
let Joi = require("joi");

const Metrics = require("../helpers/metrics");
let { saveFile } = require("../helpers/file");

class Evaluation {
  constructor(timestamp, name, dataset, systemUrl, totalQuestions) {
    this.id = timestamp;
    this.name = name;
    this.startTimestamp = timestamp;
    this.endTimestamp = null;
    this.datasetKey = dataset;
    this.systemUrl = systemUrl;
    this.isQanaryPipeline = null;
    this.evaluatorVersion = evaluatorVersion;
    this.results = [];
    this.errors = [];
    this.totalQuestions = totalQuestions;
    this.processedQuestions = 0;
    this.progress = "0%";
    this.status = "starting...";
    this.evalResults = {
      answerTypes: {},
      metrics: {},
      totalFound: { entities: 0, properties: 0, classes: 0, queries: 0 }
    };
  }

  // finds the next available question in the dataset and returns its id and question url
  findNextQuestion() {
    let q = datasets[this.datasetKey].questions[this.processedQuestions];
    let question = (() => {
      for (let lang of q.question) {
        if (lang.language === "en") return lang.string;
      }
    })();

    let questionUrl = this.systemUrl + "?query=" + encodeURI(question);
    return { qId: q.id, questionUrl };
  }

  // sends a question to QA system, requires the entire questionUrl for the system
  // id makes it easier for integration testing
  async askQuestion(questionUrl) {
      return fetch_retry(questionUrl, {
      method: "POST",
      retry: 3
    }).then(res => {
      if (res.status >= 200 && res.status < 300) {
        return res.json();
      } else {
        var error = new Error(res.statusText || res.status);
        error.res = res;
        return Promise.reject(error);
      }
    });
  }

  // updates the progress of the evaluation
  updateProgress() {
    this.processedQuestions++;
    this.progress =
      ((this.processedQuestions * 100) / this.totalQuestions).toFixed(0) + "%";
       io.sockets.emit("update", JSON.stringify(this));
  }

  // updates the status of the evaluation progress
  updateStatus(status) {
    this.status = status;
    switch (status) {
      case "failed":
        this.updateEvalsFile();
        io.sockets.emit("evalEnded", JSON.stringify(this));
        delete runningEvals[String(this.id)];
        break;
      case "successful":
        this.endTimestamp = Date.now();
        io.sockets.emit("evalEnded", JSON.stringify(this));
        this.updateEvalsFile();
        delete runningEvals[String(this.id)];

        break;
      default:
        io.sockets.emit("update", JSON.stringify(this));
        break;
    }
  }

  evaluateQuestions() {
    // save system answers before evaluation (in case something goes wrong with the evaluation)
    let filePath = `./data/systemAnswers/${this.name}-${this.id}.json`;
    let dataToSave = JSON.stringify(this.results);
    saveFile(filePath, dataToSave);

    if (this.results.length > 0) {
      if (typeof jest == "undefined") {
        console.log("=== Evaluation started ===");
      }
      let evalCount = 0;
      for (let r of this.results) {
        for (let q of datasets[this.datasetKey].questions) {
          if (r.id === q.id) {
            evalCount++;
            if (typeof jest == "undefined") {
              console.log(
                "Eval Progress: ",
                evalCount + " / " + this.results.length
              );
            }

            // count all classes, properties, entities and queries that are found by the system
            let question = r.data.questions[0];
            if (question.qanaryAnno !== undefined) {
              this.isQanaryPipeline = true;
              this.evalResults.totalFound.properties += countUris(
                question.qanaryAnno.properties
              );
              this.evalResults.totalFound.classes += countUris(
                question.qanaryAnno.classes
              );
              this.evalResults.totalFound.entities += countUris(
                question.qanaryAnno.entities
              );
              this.evalResults.totalFound.queries += countUris(question.query);
            } else {
              this.isQanaryPipeline = false;
            }

            // gather all the expected answers
            let expectedAnswers = gatherExpectedAnswers(q);

            // gather all the given answers
            let givenAnswers = gatherGivenAnswers(question);

            // summery and figure out how many answers were correct
            r.NrExpected = expectedAnswers.length;
            r.NrSystem = givenAnswers.length;
            r.NrCorrect = 0;

            for (let e of expectedAnswers) {
              for (let g of givenAnswers) {
                if (e === g) {
                  r.NrCorrect++;
                  break;
                }
              }
            }
            if (r.NrCorrect === r.NrExpected && r.NrSystem === r.NrCorrect) {
              let answerTypeToUpdate = this.evalResults.answerTypes[
                q.answertype
              ];
              if (answerTypeToUpdate) {
                this.evalResults.answerTypes[q.answertype]++;
              } else {
                this.evalResults.answerTypes[q.answertype] = 1;
              }
            }
            if (typeof jest == "undefined") {
              console.log("========================================");
              console.log("Evaluated Question: ", r);
            }

            break;
          }
        }
      }
      return true;
    } else {
      console.log("Evaluation aborted, no restults found");
      return false;
    }
  }

  /** Calculate recall, precision and f-measure for every question.
                Calculate F-measure for the entire pipeline*/

  calculateSystemResult() {
    let recallTot = 0;
    let qaldPrecisionTot = 0;
    let precisionTot = 0;
    let fMeasureTot = 0;

    for (let q of this.results) {
      q.calc = [];
      let recall = Metrics.calcRecall(q);
      let qaldPrecision = Metrics.calcPrecision(q, true);
      let precision = Metrics.calcPrecision(q, false);
      let fMeasure = Metrics.calcFMeasure(recall, precision);

      q.calc.push({
        recall,
        precision,
        qaldPrecision,
        fMeasure
      });

      recallTot += recall;
      precisionTot += precision;
      qaldPrecisionTot += qaldPrecision;
      fMeasureTot += fMeasure;
    }

    /** Add global Recall, Precicion and FMeasure to the Pipeline */
    let totalResults = this.results.length; // don't consider errors

    this.evalResults.metrics.grc = Number(
      (recallTot / totalResults).toFixed(3)
    );

    this.evalResults.metrics.gpr = Number(
      (precisionTot / totalResults).toFixed(3)
    );

    this.evalResults.metrics.QALDgpr = Number(
      (qaldPrecisionTot / totalResults).toFixed(3)
    );

    this.evalResults.metrics.gfm = Number(
      (fMeasureTot / totalResults).toFixed(3)
    );

    this.evalResults.metrics.QALDgfm = Number(
      Metrics.calcFMeasure(
        parseFloat(this.evalResults.metrics.grc),
        parseFloat(this.evalResults.metrics.QALDgpr)
      ).toFixed(3)
    );

    if (
      (this.evalResults.metrics.grc || this.evalResults.metrics.grc === 0) &&
      (this.evalResults.metrics.gpr || this.evalResults.metrics.gpr === 0) &&
      (this.evalResults.metrics.QALDgpr ||
        this.evalResults.metrics.QALDgpr === 0) &&
      (this.evalResults.metrics.gfm || this.evalResults.metrics.gfm === 0) &&
      (this.evalResults.metrics.QALDgfm ||
        this.evalResults.metrics.QALDgfm === 0)
    ) {
      // Save the evaluated answers
      let filePath = `./data/evaluatedAnswers/${this.name}-${this.id}.json`;
      let dataToSave = JSON.stringify(this.results);
      saveFile(filePath, dataToSave);

      if (typeof jest == "undefined") {
        console.log("========== Evaluation Result =========== ");
        console.log("grc", this.evalResults.metrics.grc);
        console.log("gpr", this.evalResults.metrics.gpr);
        console.log("QALDgpr", this.evalResults.metrics.QALDgpr);
        console.log("gfm", this.evalResults.metrics.gfm);
        console.log("QALDgfm", this.evalResults.metrics.QALDgfm);
      }

      return true;
    } else {
      console.log("System Evaluation Failed: ", error);
      return false;
    }
  }

  updateEvalsFile() {
    fs.readFile("./data/evaluations.json", "utf8", (err, data) => {
      if (err) {
        console.log(err);
      } else {
        let evaluations = JSON.parse(data);
        delete this.results;
        evaluations[String(this.id)] = this;
        fs.writeFile(
          "./data/evaluations.json",
          JSON.stringify(evaluations),
          "utf8",
          () => {}
        );
      }
    });
  }
}

function countUris(arr) {
  let nArr = arr.split(",").length;
  if (nArr >= 1) {
    nArr--;
  }
  return nArr;
}

function gatherExpectedAnswers(q) {
  let variable;
  let expectedAnswers = [];

  if (q.answers[0].head.vars === undefined) {
    variable = "boolean";
    expectedAnswers.push(q.answers[0].boolean);
  } else {
    variable = q.answers[0].head.vars[0];
    if (q.answers[0].results.bindings) {
      for (let a of q.answers[0].results.bindings) {
        expectedAnswers.push(a[variable].value);
      }
    }
  }
  return expectedAnswers;
}

function gatherGivenAnswers(question) {
  let givenAnswers = [];
  if (question.answers.length !== 0) {
    let cond1 = Object.entries(question.answers[0]).length === 0; // answers array can contain an empty object, filter these

    if (!cond1) {
      // empty answers
      let answer = question.answers[0];
      if (answer.head.vars === undefined) {
        givenAnswers.push(answer.boolean);
      } else {
        let cond2 = answer.results.bindings;
        if (cond2) {
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
      }
    }
  }
  return givenAnswers;
}

function validateSystemToEvaluate(req, res, next) {
  // schema for body validation
  const schema = Joi.object().keys({
    systemUrl: Joi.string()
      .max(400)
      .required(),
    name: Joi.string()
      .min(3)
      .max(25)
      .required(),
    dataset: Joi.valid(availableDatasets)
  });
  return Joi.validate(req, schema);
}

function validateResultsetToEvaluate(req, res, next) {
  // schema for body validation
  const schema = Joi.object().keys({
    resultset: Joi.required(),
    name: Joi.string()
      .min(3)
      .max(25)
      .required(),
    dataset: Joi.valid(availableDatasets)
  });
  return Joi.validate(req, schema);
}

module.exports = Evaluation;
module.exports.validateSystemToEvaluate = validateSystemToEvaluate;
module.exports.validateResultsetToEvaluate = validateResultsetToEvaluate;
