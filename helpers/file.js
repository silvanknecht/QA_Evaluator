const fs = require("fs");

module.exports = {
  saveFile: function(filePath, content) {
    let pathToSaveAt = filePath;
    fs.access(pathToSaveAt, fs.F_OK, err => {
      if (err) {
        fs.writeFile(pathToSaveAt, content, () => {});
        return;
      }
      console.log("File exists already!");
    });
  }
};
