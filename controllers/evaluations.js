const fs = require("fs");

let Evaluation = require("../models/evaluation.js");

module.exports = {
  evaluateSystem: async function(req, res, next) {
    let { dataset, systemUrl, name } = req.body;
    let totalQuestions = datasets[dataset].questions.length;

    let timestamp = Date.now();
    let currentEval = new Evaluation(
      timestamp,
      name,
      dataset,
      systemUrl,
      totalQuestions
    );
    runningEvals[String(timestamp)] = currentEval;

    // send accepted and the started eval to the user
    res.status(202).json(currentEval);
    if (typeof jest === "undefined") {
      console.log("Evaluation with dataset: " + dataset + " has started.");
    }
    io.sockets.emit("evalStarted", JSON.stringify(currentEval));

    // QUESTIONING
    currentEval.updateStatus("questioning...");
    while (currentEval.processedQuestions < currentEval.totalQuestions) {
      let { qId, questionUrl } = currentEval.findNextQuestion();
      if (typeof jest == "undefined") {
        console.log("============ Question asked ============");
        console.log("RequestUrl: ", questionUrl);
      }
      try {
        let data = await currentEval.askQuestion(questionUrl, qId);

        // some QA systems (TeBaQA, WDAqua) give the answer back in a string as property of the question, this is not correct but can be fixt with the following code
        if (data.questions[0].question) {
          if (typeof data.questions[0].question.answers === "string") {
            console.log(
              "Answers is a string --> converted to Object and placed at the right position"
            );
            answers = JSON.parse(data.questions[0].question.answers);
            data.questions[0].answers = [];
            data.questions[0].answers.push(answers);
          } else if (typeof data.questions[0].question.answers === "object") {
            console.log(
              "Answers is a string --> converted to Object and placed at the right position"
            );
            data.questions[0].answers = [];
          }
        }
        currentEval.results.push({ id: qId, data: data });
        currentEval.updateProgress();
      } catch (error) {
        console.log("Asking the question failed: " + error);

        currentEval.errors.push({
          id: qId,
          error: error.message
        });

        // if the system has 10 errors the evaluation is terminated
        if (currentEval.errors.length > 9) {
          return currentEval.updateStatus("failed");
        }
        currentEval.updateProgress();
      }
      if (typeof jest == "undefined") {
        console.log(
          "processedQuestions: ",
          currentEval.processedQuestions + " / " + currentEval.totalQuestions
        );
      }
    }

    // EVALUATING
    currentEval.updateStatus("evaluating...");
    if (!currentEval.evaluateQuestions()) {
      return currentEval.updateStatus("failed");
    }

    // CALCULATING
    currentEval.updateStatus("calculating...");
    if (!currentEval.calculateSystemResult()) {
      return currentEval.updateStatus("failed");
    } else {
      return currentEval.updateStatus("successful");
    }
  },
  evaluateResultset: async function(req, res, next) {
    let { dataset, resultset, name } = req.body;
    let totalQuestions = datasets[dataset].questions.length;

    let timestamp = Date.now();
    let currentEval = new Evaluation(
      timestamp,
      name,
      dataset,
      "Resultset-Evaluation: " + name,
      totalQuestions
    );
    currentEval.results = JSON.parse(resultset);
    currentEval.processedQuestions = 0;
    currentEval.progress = "0%";
    runningEvals[String(timestamp)] = currentEval;

    // send accepted and the started eval to the user
    res.status(202).json(currentEval);
    if (typeof jest === "undefined") {
      console.log(
        "Resultset evaluation with dataset: " + dataset + " has started."
      );
    }
    io.sockets.emit("evalStarted", JSON.stringify(currentEval));

    // EVALUATING
    currentEval.updateStatus("evaluating...");
    if (!currentEval.evaluateQuestions()) {
      return currentEval.updateStatus("failed");
    }

    if (currentEval.results.length !== totalQuestions) {
      console.log("testing for errors");
      for (let q of datasets[dataset].questions) {
        for (let [i, a] of currentEval.results.entries()) {
          if (q.id === a.id) break;
          if (i === currentEval.results.length - 1) {
            currentEval.errors.push({
              id: q.id,
              error: "Not part of the resultset"
            });
          }
        }
      }
    }

    // CALCULATING
    currentEval.updateStatus("calculating...");
    if (!currentEval.calculateSystemResult()) {
      return currentEval.updateStatus("failed");
    } else {
      return currentEval.updateStatus("successful");
    }
  },
  //this function will delete all files and its insert in ./data/evaluations.json, if the file is not available it will print an error. The file evaluatedAnswers can be unavailable if the evaluation already failed at some point!
  deleteEvaluation: function(req, res, next) {
    let { id, name } = req.params;

    if (id !== undefined && name !== undefined) {
      let path = name + "-" + id + ".json";

      //delete system answers
      try {
        fs.unlinkSync("./data/systemAnswers/" + path);
      } catch (error) {
        console.log(error);
      }

      //delete evaluated answers
      try {
        fs.unlinkSync("./data/evaluatedAnswers/" + path);
      } catch (error) {
        console.log(error);
      }

      //delete from evaluations
      try {
        fs.readFile("./data/evaluations.json", "utf8", (error, data) => {
          if (error) {
            console.log(error);
          } else {
            let evaluations = JSON.parse(data);
            delete evaluations[id];
            fs.writeFile(
              "./data/evaluations.json",
              JSON.stringify(evaluations),
              "utf8",
              () => {}
            );
          }
        });

        return res.status(200).json({
          message: `Evaluation with name: ${name} and id: ${id} has been deleted successfully!`
        });
      } catch (err) {
        console.error(err);
        return res.status(404).json({ message: "File not found!" });
      }
    } else {
      return res.status(400).json({
        message:
          "You must send a number as a query id and the name of the Experiment as query name!"
      });
    }
  },
  getEvaluatedAnswers: function(req, res, next) {
    let { name, id } = req.params;
    let { qid } = req.query;

    if ((name !== undefined) & (id !== undefined)) {
      try {
        let evaluatedAnswers = require(`../data/evaluatedAnswers/${name}-${id}.json`);
        if (qid === undefined) {
          res.json(evaluatedAnswers);
        } else {
          for (answer of evaluatedAnswers) {
            if (answer.id === qid) {
              return res.json(answer);
            }
          }
          res.json({
            message:
              "Question with id " + qid + " is not part of the resultset!"
          });
        }
      } catch (error) {
        res.status(404).json({
          message: "File not found!"
        });
      }
    } else {
      res
        .status(400)
        .json({ message: "You need to add the query parameters id and name" });
    }
  },
  getSystemAnswers: function(req, res, next) {
    let { name, id } = req.params;
    if ((name !== undefined) & (id !== undefined)) {
      try {
        let systemAnswers = require(`../data/systemAnswers/${name}-${id}.json`);
        res.json(systemAnswers);
      } catch (error) {
        res.status(404).json({
          message: "File not found!"
        });
      }
    } else {
      res
        .status(400)
        .json({ message: "You need to add the query parameters id and name" });
    }
  },
  getEvaluations: function(req, res, next) {
    let evaluations;
    let { datasetKey, id } = req.query;
    fs.readFile("./data/evaluations.json", "utf8", (err, data) => {
      if (err) {
        console.log(err);
      } else {
        evaluations = JSON.parse(data);
        if (datasetKey === undefined && id === undefined) {
          res.json(evaluations);
        } else if (id !== undefined) {
          let jsonToReturn = evaluations[String(id)];
          if (jsonToReturn === undefined)
            res.status(404).json({
              message: "Evaluation with Id: " + id + " not found!"
            });
          res.json(evaluations[String(id)]);
        } else if (datasetKey !== undefined) {
          let filteredEvals = {};
          for (let i in evaluations) {
            if (evaluations[String(i)].datasetKey === datasetKey) {
              filteredEvals[String(i)] = evaluations[String(i)];
            }
          }
          res.json(filteredEvals);
        }
      }
    });
  },
  getRunningEvals: function(req, res, next) {
    let { id } = req.query;
    if (id === undefined) {
      res.json(runningEvals);
    } else {
      let jsonToReturn = runningEvals[String(id)];
      if (jsonToReturn === undefined) {
        res.status(404).json({
          message: "not found, or the evaluations is already finished"
        });
      }
      res.json(runningEvals[String(id)]);
    }
  }
};
