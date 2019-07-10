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

router.delete("/", evaluationsController.deleteEvaluation);
router.get("/", evaluationsController.getEvaluations);
router.get("/evaluatedAnswers", evaluationsController.getEvaluatedAnswers);
router.get("/running", evaluationsController.getRunningEvals);
router.get("/systemAnswers", evaluationsController.getSystemAnswers);



module.exports = router;
