module.exports = {
  getAll: function(req, res, next) {
    if (req.params.id === undefined) {
      res.json(runningEvals);
    } else {
      let jsonToReturn = runningEvals[String(req.params.id)];
      if (jsonToReturn === undefined) {
        res.redirect("/finishedEvals/" + req.params.id);
        // res.status(404).json({
        //   message: "Evaluation with id: " + req.params.id + " not found!"
        // });
      }
      res.json(runningEvals[String(req.params.id)]);
    }
  }
};
