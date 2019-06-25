let express = require("express");
let router = express.Router();

const pagesController = require("../controllers/pages");

router.get("/", pagesController.index);

module.exports = router;
