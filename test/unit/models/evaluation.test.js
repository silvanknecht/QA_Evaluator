var MockDate = require("mockdate");
const Evaluation = require("../../../models/evaluation");

let mockTimestamp = 1434319925275;
let mockEvaluation;

beforeEach(() => {
  MockDate.set(mockTimestamp);
  let timestamp = Date.now();
  mockEvaluation = new Evaluation(
    timestamp,
    "test",
    "testDataset",
    "http://testsystem.url/",
    150
  );
  try {
    let dataset = require("../../testDatasets/testDataset.json");
    datasets["testDataset"] = dataset;
    console.log("dataset has been loaded!");
  } catch (error) {
    console.log("Dataset couldn't be loaded", error);
  }
});
afterEach(() => {
  MockDate.reset();
  datasets = {};
});

describe("Evaluation Model", () => {
  it("should return a evaluation object with certain properties", () => {
    expect(mockEvaluation).toHaveProperty("id", mockTimestamp);
    expect(mockEvaluation).toHaveProperty(
      "runningUrl",
      evaluationUrl + "runningEvals/" + mockTimestamp
    );
    expect(mockEvaluation).toHaveProperty("status", "starting...");
    expect(mockEvaluation).toHaveProperty("totalQuestions", 150);
  });
});

describe("findNextQuestion", () => {
  it("should return question Id '99' and the questionUrl", () => {
    mockEvaluation.processedQuestions = 2;
    let { qId, questionUrl } = mockEvaluation.findNextQuestion();

    expect(qId).toMatch("99");
    expect(questionUrl).toMatch(mockEvaluation.systemUrl+"?query="+encodeURI("What is the time zone of Salt Lake City?"));
  });
});
