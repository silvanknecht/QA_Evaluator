let express = require("express");

let router = express.Router();

const evaluationsController = require("../controllers/evaluations");
const validate = require("../middleware/validate");
const loadDataset = require("../middleware/loadDataset");
const { validateSystemToEvaluate } = require("../models/evaluation");

router.post(
  "/",
  validate(validateSystemToEvaluate),
  loadDataset,
  evaluationsController.evaluateSystem
);
router.get("/", evaluationsController.getEvaluations);
router.delete("/", evaluationsController.deleteEvaluation);
router.get("/running", evaluationsController.getRunningEvals);
router.get("/systemAnswers", evaluationsController.getSystemAnswers);
router.get("/evaluatedAnswers", evaluationsController.getEvaluatedAnswers);



module.exports = router;
