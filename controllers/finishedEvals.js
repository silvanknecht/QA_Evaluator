const fs = require("fs");

module.exports = {
  getAll: function (req, res, next) {
    let evaluations;
    let { datasetKey } = req.query;
    fs.readFile("./data/evaluations.json", "utf8", (err, data) => {
      if (err) {
        console.log(err);
      } else {
        evaluations = JSON.parse(data);
        if (datasetKey === undefined && req.params.id === undefined) {
          res.json(evaluations);
        } else if (req.params.id !== undefined) {
          let jsonToReturn = evaluations[String(req.params.id)];
          if (jsonToReturn === undefined)
            res.status(404).json({
              message: "Evaluation with Id: " + req.params.id + " not found!"
            });
          res.json(evaluations[String(req.params.id)]);
        } else if (datasetKey !== undefined) {
          let filteredEvals = {};
          for (let i in evaluations) {
            if (evaluations[String(i)].datasetKey === datasetKey) {
              filteredEvals[String(i)] = evaluations[String(i)];
            }
          }
          res.json(filteredEvals);
        }
      }
    });
  }
};
