module.exports = {
  getAnswers: function(req, res, next) {
    try {
      let systemAnswers = require(`../data/systemAnswers/${req.params.name}-${
        req.params.id
      }.json`);
      res.json(systemAnswers);
    } catch (error) {
      res.status(404).json({
        message: "File not found!"
      });
    }
  }
};
