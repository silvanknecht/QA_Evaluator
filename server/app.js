const express = require("express");
const app = express();
var server = require("http").Server(app);
global.io = require("socket.io")(server);

const port = process.env.PORT || 3000;
server.listen(port, () => console.log(`App listening on port ${port}!`));

// set the template engine ejs
app.set("view engine", "ejs");

// middleware
app.use(express.json());
app.use(express.static(__dirname + "/public"));

// global variables
global.runningEvals = {};
global.datasets = ["qald-9", "testData20", "1question"];

// routes and routers
const pages = require("./routes/pages");
const evaluations = require("./routes/evaluations");
const runningEvals = require("./routes/runningEvals");
const finishedEvals = require("./routes/finishedEvals");
const systemAnswers = require("./routes/systemAnswers");


app.use("/", pages);
app.use("/evaluations", evaluations);
app.use("/runningEvals", runningEvals);
app.use("/finishedEvals", finishedEvals);
app.use("/systemAnswers", systemAnswers);
