let express = require("express");
let router = express.Router();

const datasetsController = require("../controllers/datasets");

router.get("/", datasetsController.dataset);

module.exports = router;
