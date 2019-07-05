module.exports = {
  dataset: function(req, res, next) {
    let { dataset } = req.query;
    if (dataset) {
      try {
        let data = require(`../datasets/${dataset}.json`);
        return res.json(data);
      } catch (error) {
        res.json({ message: "Requestd dataset not found!" });
      }
    } else {
      res.status(404).json({
        message: "You need to send your required dataset as query param!"
      });
    }
  }
};
