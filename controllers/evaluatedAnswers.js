module.exports = {
  getAnswers: function(req, res, next) {
    try {
      let evaluatedAnswers = require(`../data/evaluatedAnswers/${
        req.query.name
      }-${req.query.id}.json`);
      res.json(evaluatedAnswers);
    } catch (error) {
      res.status(404).json({
        message: "File not found!"
      });
    }
  }
};
