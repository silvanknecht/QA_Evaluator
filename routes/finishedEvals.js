let express = require("express");
let router = express.Router();

const finishedEvalsController = require("../controllers/finishedEvals");

router.get("/:datasetKey?", finishedEvalsController.getAll);

module.exports = router;
