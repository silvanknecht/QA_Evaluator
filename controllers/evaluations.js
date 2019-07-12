const fs = require("fs");

let Evaluation = require("../models/evaluation.js");
let { saveFile } = require("../helpers/file");

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
    console.log("Evaluation with dataset: " + dataset + " has started.");
    io.sockets.emit("evalStarted", JSON.stringify(currentEval));

    // QUESTIONING
    currentEval.updateStatus("questioning...");
    while (currentEval.processedQuestions < currentEval.totalQuestions) {
      let { qId, questionUrl } = currentEval.findNextQuestion();
      try {
        let data = await currentEval.askQuestion(questionUrl, qId);

        // // Fix for TeBaQA, resultset looks different so it needs to be converted into the right one
        // // ! BREAKS QANARY EVALUATION
        // if (data.questions[0].question) {
        //   console.log("TeBaQa");
        //   answers = JSON.parse(data.questions[0].question.answers);
        //   data.questions[0].answers = [];
        //   data.questions[0].answers.push(answers);
        // }
        currentEval.results.push({ id: qId, data: data });
        currentEval.updateProgress();
        if(typeof jest == "undefined"){
        console.log(
          "processedQuestions: ",
          currentEval.processedQuestions + " / " + currentEval.totalQuestions
        );
        }
      } catch (error) {
        console.log("Looks like there was a problem: xS " + error);

        currentEval.errors.push({
          id: qId,
          error: error.message
        });

        // if the system has 10 errors the evaluation is terminated
        if (currentEval.errors.length > 9) {
          currentEval.updateStatus("failed");
          currentEval.updateEvalsFile();

          delete runningEvals[String(currentEval.id)];
          return res.status(500).json(currentEval);
        }

        currentEval.updateProgress();
      }
    }

    // save system answers before evaluation (in case something goes wrong with the evaluation)
    let filePath = `./data/systemAnswers/${currentEval.name}-${
      currentEval.id
    }.json`;
    let dataToSave = JSON.stringify(currentEval.results);
    saveFile(filePath, dataToSave);

    // EVALUATING
    currentEval.updateStatus("evaluating...");
    try {
      await currentEval.evaluateQuestions();
    } catch (error) {
      currentEval.updateStatus("failed");
      currentEval.updateEvalsFile();

      delete runningEvals[String(currentEval.id)];
      return res.status(500).json(currentEval);
    }

    // CALCULATING
    currentEval.updateStatus("calculating...");
    try {
      await currentEval.calculateSystemResult();
      let filePath = `./data/evaluatedAnswers/${currentEval.name}-${
        currentEval.id
      }.json`;
      let dataToSave = JSON.stringify(currentEval.results);
      saveFile(filePath, dataToSave);

      currentEval.updateStatus("successful");
      currentEval.updateEvalsFile();

      if (typeof jest == "undefined") {
        console.log("========== Evaluation Result =========== ");
        console.log("grc", currentEval.evalResults.metrics.grc);
        console.log("gpr", currentEval.evalResults.metrics.gpr);
        console.log("QALDgpr", currentEval.evalResults.metrics.QALDgpr);
        console.log("gfm", currentEval.evalResults.metrics.gfm);
        console.log("QALDgfm", currentEval.evalResults.metrics.QALDgfm);
      }
    } catch (error) {
      console.log("System Evaluation Failed: ", error);
    }
    res.json(currentEval);
    delete runningEvals[String(currentEval.id)];
  }, //this function will delete all files and its insert (evaluations.js), if the file is not available it will print an error. The file evaluatedAnswers can be unavailable if the evaluation already failed at some point!
  deleteEvaluation: function(req, res, next) {
    let { id, name } = req.query;

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
      return res
        .status(400)
        .json({ message: "You must send a number as a query id and the name of the Experiment as query name!" });
    }
  },
  getEvaluatedAnswers: function(req, res, next) {
    let { name, id } = req.query;
    if ((name !== undefined) & (id !== undefined)) {
      try {
        let evaluatedAnswers = require(`../data/evaluatedAnswers/${name}-${id}.json`);
        res.json(evaluatedAnswers);
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
    let { name, id } = req.query;
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
    let { datasetKey } = req.query;
    fs.readFile("./data/evaluations.json", "utf8", (err, data) => {
      if (err) {
        console.log(err);
      } else {
        evaluations = JSON.parse(data);
        if (datasetKey === undefined && req.params.id === undefined) {
          res.json(evaluations);
        } else if (req.params.id !== undefined) {
          let jsonToReturn = evaluations[String(req.params.id)];
          if (jsonToReturn === undefined)
            res.status(404).json({
              message: "Evaluation with Id: " + req.params.id + " not found!"
            });
          res.json(evaluations[String(req.params.id)]);
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
