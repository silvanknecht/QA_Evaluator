const fetch = require("node-fetch");
const fs = require("fs");

module.exports = {
  evaluateSystem: async function(req, res, next) {
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
    io.sockets.emit("evalStarted", JSON.stringify(currentEval));
    res.json(currentEval);

    while (currentEval.processedQuestions < currentEval.totalQuestions) {
      currentEval.status = "questioning";
      let { q, questionUrl } = module.exports.findNextQuestion(currentEval);
      try {
        let data = await module.exports.askQuestion(questionUrl);
        //let data = await response.json();

        currentEval.results.push({ id: q.id, data: data });
        currentEval.processedQuestions++;
        currentEval.progress = module.exports.updateProgress(currentEval);
        io.sockets.emit("updateStatus", JSON.stringify(currentEval));

        console.log(
          "processedQuestions: ",
          currentEval.processedQuestions + " / " + currentEval.totalQuestions
        );
      } catch (error) {
        console.log("Looks like there was a problem: xS " + error);

        currentEval.errors.push({
          questionId: q.id,
          error: error.message
        });
        currentEval.processedQuestions++;
        currentEval.progress = module.exports.updateProgress(currentEval);
        io.sockets.emit("updateStatus", JSON.stringify(currentEval));
      }
    }

    // save system answers before evaluation (in case something goes wrong with the evaluation)
    let filePath = `./data/systemAnswers/${currentEval.name}-${
      currentEval.id
    }.json`;
    let dataToSave = JSON.stringify(currentEval.results);
    saveFile(filePath, dataToSave);

    currentEval.status = "evaluating";
    io.sockets.emit("updateStatus", JSON.stringify(currentEval));
    try {
      let evaluatedQuestions = await module.exports.evaluateQuestions(
        currentEval.results,
        currentEval.dataset
      );
      currentEval.results = evaluatedQuestions;
    } catch (error) {
      fs.readFile("./data/evaluations.json", "utf8", (err, data) => {
        if (err) {
          console.log(err);
        } else {
          currentEval.status = "failed";
          io.sockets.emit("evalEnded", JSON.stringify(currentEval));
          obj = JSON.parse(data);
          delete currentEval.results;
          obj[String(currentEval.id)] = currentEval;
          fs.writeFile(
            "./data/evaluations.json",
            JSON.stringify(obj),
            "utf8",
            () => {}
          );
        }
      });
      delete runningEvals[String(currentEval.id)];
      return;
    }

    currentEval.status = "calculating";
    io.sockets.emit("updateStatus", JSON.stringify(currentEval));

    try {
      let {
        editedResults,
        evalResults
      } = await module.exports.calculateSystemResult(
        currentEval.id,
        currentEval.name,
        currentEval.results
      );
      currentEval.results = editedResults;
      currentEval.evalResults = evalResults;
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
          obj = JSON.parse(data);
          delete currentEval.results;
          obj[String(currentEval.id)] = currentEval;
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
      delete runningEvals[String(currentEval.id)];

      console.log("========== Evaluation Result =========== ");
      console.log("grc", currentEval.evalResults.grc);
      console.log("gpr", currentEval.evalResults.gpr);
      console.log("QALDgpr", currentEval.evalResults.QALDgpr);
      console.log("gfm", currentEval.evalResults.gfm);
      console.log("QALDgfm", currentEval.evalResults.QALDgfm);
    } catch (error) {
      console.log("System Evaluation Failed: ", error);
    }

    return;
  }, // next question or end the evaluation
  findNextQuestion: function(currentEval) {
    let { dataset, processedQuestions, systemUrl } = currentEval;
    let q = datasets[dataset].questions[processedQuestions];
    let question = (() => {
      for (let lang of q.question) {
        if (lang.language === "en") return lang.string;
      }
    })();

    let questionUrl = systemUrl + "?query=" + encodeURI(question);
    return { q, questionUrl };
  },
  askQuestion: function(questionUrl) {
    console.log("============ Question asked ============");
    console.log("RequestUrl: ", questionUrl);
    return fetch(questionUrl, {
      method: "POST"
    }).then(res => {
      if (res.status >= 200 && res.status < 300) {
        return res.json();
      } else {
        var error = new Error(res.statusText || res.status);
        error.res = res;
        return Promise.reject(error);
      }
    });
  }, // updating the status of an evaluation
  updateProgress: function(currentEval) {
    let { processedQuestions, totalQuestions } = currentEval;

    let progress =
      ((processedQuestions * 100) / totalQuestions).toFixed(0) + "%";

    return progress;
  },
  evaluateQuestions: function(results, dataset) {
    return new Promise((resolve, reject) => {
      if (results.length > 0) {
        console.log("=== Evaluation started ===");
        let evalCount = 0;
        for (let r of results) {
          for (let q of datasets[dataset].questions) {
            if (r.id === q.id) {
              evalCount++;
              console.log(
                "Eval Progress: ",
                evalCount + " / " + results.length
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

        resolve(results);
      } else {
        console.log("Evaluation aborted, no restults found");
        reject("Evaluation aborted, no restults found");
      }
    });
  },
  calculateSystemResult: function(id, name, results) {
    /** Calculate recall, precision and f-measure for every question.
                Calculate F-measure for the entire pipeline*/

    return new Promise((resolve, reject) => {
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

      if (
        (evalResults.grc || evalResults.grc === 0) &&
        (evalResults.gpr || evalResults.gpr === 0) &&
        (evalResults.QALDgpr || evalResults.QALDgpr === 0) &&
        (evalResults.gfm || evalResults.gfm === 0) &&
        (evalResults.QALDgfm || evalResults.QALDgfm === 0)
      ) {
        resolve({ editedResults: results, evalResults });
      } else {
        reject("Calculation failed!");
      }
    });
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