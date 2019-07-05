let express = require("express");
let router = express.Router();

const pagesController = require("../controllers/pages");

router.get("/", pagesController.index);
router.get("/compare", pagesController.compare);

module.exports = router;
