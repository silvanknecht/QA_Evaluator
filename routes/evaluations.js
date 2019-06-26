let express = require("express");
let Joi = require("joi");

let router = express.Router();

const evaluationsController = require("../controllers/evaluations");

router.post(
  "/evaluate",
  function(req, res, next) {
    const result = Joi.validate(req.body, schema);
    if (result.error !== null)
      return res.status(400).json({ message: result.error.details[0].message });
    next();
  },
  function(req, res, next) {
    let choosenDataset = req.body.dataset;
    if (!datasets.hasOwnProperty(choosenDataset)) {
      try {
        let dataset = require("../datasets/" + choosenDataset);
        datasets[choosenDataset] = dataset;
        console.log("dataset has been loaded!")
      } catch (error) {
        console.log("Dataset couldn't be loaded", error);
        return res.status(500);
      }
    }else{
      console.log("dataset already loaded!")
    }
    next();
  },
  evaluationsController.startEvaluation
);

// schema for body validatino
const schema = Joi.object().keys({
  systemUrl: Joi.string()
    .max(400)
    .required(),
  name: Joi.string()
    .min(3)
    .max(25)
    .required(),
  dataset: Joi.valid(availableDatasets)
});

module.exports = router;
