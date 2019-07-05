const fs = require("fs");

let Evaluation = require("../models/evaluation.js");

module.exports = {
  evaluateSystem: async function(req, res, next) {
    let { dataset, systemUrl, name } = req.body;
    let totalQuestions = datasets[dataset].questions.length;
    name = name.replace(/[/\\?%*:|"<>]/g, "-");

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
    res.json(currentEval);

    currentEval.updateStatus("questioning...");
    while (currentEval.processedQuestions < currentEval.totalQuestions) {
      let { qId, questionUrl } = currentEval.findNextQuestion();
      try {
        let data = await currentEval.askQuestion(questionUrl);
        //let data = await response.json();

        currentEval.results.push({ id: qId, data: data });
        currentEval.updateProgress();

        console.log(
          "processedQuestions: ",
          currentEval.processedQuestions + " / " + currentEval.totalQuestions
        );
      } catch (error) {
        console.log("Looks like there was a problem: xS " + error);

        currentEval.errors.push({
          id: qId,
          error: error.message
        });

        currentEval.updateProgress();
      }
    }

    // save system answers before evaluation (in case something goes wrong with the evaluation)
    let filePath = `./data/systemAnswers/${currentEval.name}-${
      currentEval.id
    }.json`;
    let dataToSave = JSON.stringify(currentEval.results);
    saveFile(filePath, dataToSave);

    currentEval.updateStatus("evaluating");
    try {
      await currentEval.evaluateQuestions();
    } catch (error) {
      currentEval.updateStatus("failed");
      currentEval.updateEvalsFile();

      delete runningEvals[String(currentEval.id)];
      return;
    }

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
  },
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
          message: `Evaluation with name: ${name} and id: ${id} has been successfully deleted!`
        });
      } catch (err) {
        console.error(err);
        return res.status(404).json({ message: "File not found!" });
      }
    } else {
      return res
        .status(400)
        .json({ message: "You must send a number as a query id!" });
    }
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
