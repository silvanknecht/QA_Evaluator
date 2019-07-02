const fetch = require("node-fetch");
const fetch_retry = require("node-fetch-retry");

const fs = require("fs");

const Metrics = require("../helpers/metrics");

class Evaluation {
  constructor(timestamp, name, dataset, systemUrl, totalQuestions) {
    this.id = timestamp;
    this.name = name;
    this.startTimestamp = timestamp;
    this.endTimestamp = null;
    this.datasetKey = dataset;
    this.systemUrl = systemUrl;
    this.evaluatorVersion = evaluatorVersion;
    this.results = [];
    this.errors = [];
    this.totalQuestions = totalQuestions;
    this.processedQuestions = 0;
    this.progress = 0 + "%";
    this.status = "starting...";
  }

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

  async askQuestion(questionUrl) {
    console.log("============ Question asked ============");
    console.log("RequestUrl: ", questionUrl);
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

  updateProgress() {
    this.processedQuestions++;
    this.progress =
      ((this.processedQuestions * 100) / this.totalQuestions).toFixed(0) + "%";
    io.sockets.emit("update", JSON.stringify(this));
  }

  updateStatus(status) {
    this.status = status;
    switch (status) {
      case "failed":
        io.sockets.emit("evalEnded", JSON.stringify(this));
        break;
      case "successful":
        this.endTimestamp = Date.now();
        io.sockets.emit("evalEnded", JSON.stringify(this));
        break;
      default:
        io.sockets.emit("update", JSON.stringify(this));
        break;
    }
  }

  evaluateQuestions() {
    return new Promise((resolve, reject) => {
      if (this.results.length > 0) {
        console.log("=== Evaluation started ===");
        let evalCount = 0;
        for (let r of this.results) {
          for (let q of datasets[this.datasetKey].questions) {
            if (r.id === q.id) {
              evalCount++;
              console.log(
                "Eval Progress: ",
                evalCount + " / " + this.results.length
              );
              let answerType;
              let expectedAnswers = [];

              if (q.answers[0].head.vars === undefined) {
                answerType = "boolean";
                expectedAnswers.push(q.answers[0].boolean);
              } else {
                answerType = q.answers[0].head.vars[0];
                // if (answerType === "c") {
                //   expectedAnswers.push(
                //     Number(q.answers[0].results.bindings[0][answerType].value)
                //   );
                // } else {
                if (q.answers[0].results.bindings) {
                  for (let a of q.answers[0].results.bindings) {
                    expectedAnswers.push(a[answerType].value);
                  }
                  //}
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
              console.log("========================================");
              console.log("Evaluated Question: ", r);

              break;
            }
          }
        }

        resolve("Questions evaluated!");
      } else {
        console.log("Evaluation aborted, no restults found");
        reject("Evaluation aborted, no restults found");
      }
    });
  }

  /** Calculate recall, precision and f-measure for every question.
                Calculate F-measure for the entire pipeline*/

  calculateSystemResult() {
    return new Promise((resolve, reject) => {
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
      let totalResults = this.results.length; // don't consider errors

      let evalResults = {};
      evalResults.grc = recallTot / totalResults;
      evalResults.gpr = precisionTot / totalResults;
      evalResults.QALDgpr = qaldPrecisionTot / totalResults;
      evalResults.gfm = fMeasureTot / totalResults;

      if (evalResults.grc === 0 && evalResults.QALDgpr === 0) {
        evalResults.QALDgfm = 0;
      } else {
        evalResults.QALDgfm =
          (2 * evalResults.grc * evalResults.QALDgpr) /
          (evalResults.grc + evalResults.QALDgpr);
      }

      this.evalResults = evalResults;

      if (
        (evalResults.grc || evalResults.grc === 0) &&
        (evalResults.gpr || evalResults.gpr === 0) &&
        (evalResults.QALDgpr || evalResults.QALDgpr === 0) &&
        (evalResults.gfm || evalResults.gfm === 0) &&
        (evalResults.QALDgfm || evalResults.QALDgfm === 0)
      ) {
        resolve();
      } else {
        reject("Calculate system results failed! ");
      }
    });
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

module.exports = Evaluation;
