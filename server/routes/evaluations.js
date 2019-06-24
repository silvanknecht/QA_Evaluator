let express = require("express");
let router = express.Router();

const evaluationsController = require("../controllers/evaluations");

router.post("/evaluate", evaluationsController.evaluate);

module.exports = router;
