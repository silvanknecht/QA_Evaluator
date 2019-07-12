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
      return res.json(availableDatasets);
    }
  }
};
