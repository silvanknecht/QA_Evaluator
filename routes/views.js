let express = require("express");
let router = express.Router();

const viewsController = require("../controllers/views");

router.get("/", viewsController.index);
router.get("/compare", viewsController.compare);
router.get("/askquestion", viewsController.askquestion);


module.exports = router;
