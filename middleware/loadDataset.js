module.exports = function(req, res, next) {
  let choosenDataset = req.body.dataset;
  if (!datasets.hasOwnProperty(choosenDataset)) {
    try {
      let dataset = require("../datasets/" + choosenDataset);
      datasets[choosenDataset] = dataset;
      if (typeof jest == "undefined") {
        console.log("dataset has been loaded!");
      }
    } catch (error) {
      console.log("Dataset couldn't be loaded", error);
      return res.status(500);
    }
  } else {
    console.log("dataset already loaded!");
  }
  next();
};
