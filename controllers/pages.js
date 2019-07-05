module.exports = {
  index: function(req, res, next) {
    res.render("index");
  },
  compare: function(req, res, next) {
    res.render("compare");
  }
};
