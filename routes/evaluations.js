let express = require("express");

let router = express.Router();

const evaluationsController = require("../controllers/evaluations");
const validate = require("../middleware/validate");
const loadDataset = require("../middleware/loadDataset");
const {
  validateSystemToEvaluate,
  validateResultsetToEvaluate
} = require("../models/evaluation");

router.post(
  "/",
  validate(validateSystemToEvaluate),
  loadDataset,
  evaluationsController.evaluateSystem
);
router.post(
  "/resultset",
  validate(validateResultsetToEvaluate),
  loadDataset,
  evaluationsController.evaluateResultset
);
router.get("/", evaluationsController.getEvaluations);
router.delete("/:id/:name", evaluationsController.deleteEvaluation);
router.get("/running", evaluationsController.getRunningEvals);
router.get("/systemAnswers/:id/:name", evaluationsController.getSystemAnswers);
router.get(
  "/evaluatedAnswers/:id/:name",
  evaluationsController.getEvaluatedAnswers
); //query Parame qid to filter for certain question
router.post("/askquestion", evaluationsController.askQuestion); 

module.exports = router;
