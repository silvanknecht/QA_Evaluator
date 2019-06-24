const fs = require("fs");

module.exports = {
  getAll: function(req, res, next) {
    let evaluations;
    fs.readFile("./data/evaluations.json", "utf8", (err, data) => {
      if (err) {
        console.log(err);
      } else {
        evaluations = JSON.parse(data);
        if (req.params.id === undefined) {
          res.json(evaluations);
        } else {
          console.log(req.params.id);
          let jsonToReturn = evaluations[String(req.params.id)];
          if (jsonToReturn === undefined)
            res.status(404).json({
              message: "Evaluation with id: " + req.params.id + " not found!"
            });
          res.json(evaluations[String(req.params.id)]);
        }
      }
    });
  }
};
