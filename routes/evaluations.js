let express = require("express");

let router = express.Router();

const evaluationsController = require("../controllers/evaluations");
const validate = require("../middleware/validate");
const { validateSystemToEvaluate } = require("../models/evaluation");

router.post(
  "/evaluate",
  validate(validateSystemToEvaluate),
  function(req, res, next) {
    let choosenDataset = req.body.dataset;
    if (!datasets.hasOwnProperty(choosenDataset)) {
      try {
        let dataset = require("../datasets/" + choosenDataset);
        datasets[choosenDataset] = dataset;
        console.log("dataset has been loaded!");
      } catch (error) {
        console.log("Dataset couldn't be loaded", error);
        return res.status(500);
      }
    } else {
      console.log("dataset already loaded!");
    }
    next();
  },
  evaluationsController.evaluateSystem
);

router.delete("/", evaluationsController.deleteEvaluation);
router.get("/evaluatedAnswers", evaluationsController.getEvaluatedAnswers);
router.get("/systemAnswers", evaluationsController.getSystemAnswers);
router.get("/finished", evaluationsController.getFinishedEvals);
router.get("/running", evaluationsController.getRunningEvals);

module.exports = router;
