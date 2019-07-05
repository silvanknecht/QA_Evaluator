let express = require("express");
let router = express.Router();

const evaluatedAnswersController = require("../controllers/evaluatedAnswers");

router.get("/", evaluatedAnswersController.getAnswers);

module.exports = router;
