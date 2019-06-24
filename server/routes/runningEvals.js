let express = require("express");
let router = express.Router();

const runningEvalsController = require("../controllers/runningEvals");

router.get("/:id?", runningEvalsController.getAll);

module.exports = router;
