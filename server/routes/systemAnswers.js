let express = require("express");
let router = express.Router();

const systemAnswersController = require("../controllers/systemAnswers");

router.get("/:name/:id", systemAnswersController.getAnswers);

module.exports = router;
