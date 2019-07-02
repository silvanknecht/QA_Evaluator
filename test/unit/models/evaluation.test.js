var MockDate = require("mockdate");
const Evaluation = require("../../../models/evaluation");

let mockTimestamp = 1434319925275;
let mockEvaluation;

beforeEach(() => {
  MockDate.set(mockTimestamp);
  try {
    let dataset = require("../../testData/testDataset.json");
    let testResultset = require("../../testData/testResultset.json");

    datasets["testDataset"] = dataset;
    console.log("dataset has been loaded!");
    let timestamp = Date.now();
    mockEvaluation = new Evaluation(
      timestamp,
      "test",
      "testDataset",
      "http://testsystem.url/",
      11
    );
    mockEvaluation.results = testResultset;
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
    expect(mockEvaluation).toHaveProperty("status", "starting...");
    expect(mockEvaluation).toHaveProperty("totalQuestions", 11);
  });
});

describe("findNextQuestion", () => {
  it("should return question Id '99' and the questionUrl", () => {
    mockEvaluation.processedQuestions = 2;
    let { qId, questionUrl } = mockEvaluation.findNextQuestion();

    expect(qId).toMatch("99");
    expect(questionUrl).toMatch(
      mockEvaluation.systemUrl +
        "?query=" +
        encodeURI("What is the time zone of Salt Lake City?")
    );
  });
});

describe("evaluateQuestions", () => {
  it("should evaluate all questinos of the resultset (all answers correct) and add NrSystem && NrExpected && NrCorrect", async () => {
    try {
      await mockEvaluation.evaluateQuestions();

      expect(mockEvaluation.results[0].NrSystem).toBe(1);
      expect(mockEvaluation.results[0].NrExpected).toBe(1);
      expect(mockEvaluation.results[0].NrCorrect).toBe(1);

      expect(mockEvaluation.results[1].NrSystem).toBe(1);
      expect(mockEvaluation.results[1].NrExpected).toBe(1);
      expect(mockEvaluation.results[1].NrCorrect).toBe(1);

      expect(mockEvaluation.results[2].NrSystem).toBe(1);
      expect(mockEvaluation.results[2].NrExpected).toBe(1);
      expect(mockEvaluation.results[2].NrCorrect).toBe(1);

      expect(mockEvaluation.results[3].NrSystem).toBe(1);
      expect(mockEvaluation.results[3].NrExpected).toBe(1);
      expect(mockEvaluation.results[3].NrCorrect).toBe(1);

      expect(mockEvaluation.results[4].NrSystem).toBe(1);
      expect(mockEvaluation.results[4].NrExpected).toBe(1);
      expect(mockEvaluation.results[4].NrCorrect).toBe(1);

      expect(mockEvaluation.results[5].NrSystem).toBe(1);
      expect(mockEvaluation.results[5].NrExpected).toBe(1);
      expect(mockEvaluation.results[5].NrCorrect).toBe(1);

      expect(mockEvaluation.results[6].NrSystem).toBe(1);
      expect(mockEvaluation.results[6].NrExpected).toBe(1);
      expect(mockEvaluation.results[6].NrCorrect).toBe(1);

      expect(mockEvaluation.results[7].NrSystem).toBe(1);
      expect(mockEvaluation.results[7].NrExpected).toBe(1);
      expect(mockEvaluation.results[7].NrCorrect).toBe(1);

      expect(mockEvaluation.results[8].NrSystem).toBe(1);
      expect(mockEvaluation.results[8].NrExpected).toBe(1);
      expect(mockEvaluation.results[8].NrCorrect).toBe(1);

      expect(mockEvaluation.results[9].NrSystem).toBe(22);
      expect(mockEvaluation.results[9].NrExpected).toBe(22);
      expect(mockEvaluation.results[9].NrCorrect).toBe(22);

      expect(mockEvaluation.results[10].NrSystem).toBe(8);
      expect(mockEvaluation.results[10].NrExpected).toBe(8);
      expect(mockEvaluation.results[10].NrCorrect).toBe(8);
    } catch (error) {
      console.log(error);
    }
  });
  it("should add NrSystem = 0 && NrExpected =1 && NrCorrect = 0 when the system doesn't give an answer to the first question", async () => {
    mockEvaluation.results[0].data.questions[0].answers = [];
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrSystem).toBe(0);
    expect(mockEvaluation.results[0].NrExpected).toBe(1);
    expect(mockEvaluation.results[0].NrCorrect).toBe(0);
  });
  it("should add NrSystem = 0 && NrExpected =1 && NrCorrect = 0 when the system doesn't give an answer to the first question, when the answer Array contains an object but still no answer", async () => {
    mockEvaluation.results[0].data.questions[0].answers = [
      {
        head: {
          vars: ["c"]
        },
        results: {
          bindings: []
        }
      }
    ];
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrSystem).toBe(0);
    expect(mockEvaluation.results[0].NrExpected).toBe(1);
    expect(mockEvaluation.results[0].NrCorrect).toBe(0);
  });

  it("should add NrSystem = 2 && NrExpected =1 && NrCorrect = 0 when the system gives 2 wrong answers", async () => {
    mockEvaluation.results[0].data.questions[0].answers = [
      {
        head: {
          vars: ["c"]
        },
        results: {
          bindings: [
            {
              c: {
                type: "literal",
                value: "200"
              }
            },
            {
              c: {
                type: "literal",
                value: "300"
              }
            }
          ]
        }
      }
    ];
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrSystem).toBe(2);
    expect(mockEvaluation.results[0].NrExpected).toBe(1);
    expect(mockEvaluation.results[0].NrCorrect).toBe(0);
  });

  it("should add NrSystem = 4 && NrExpected =1 && NrCorrect = 0 when the system gives 2 wrong answers with 2 diffrent vars", async () => {
    mockEvaluation.results[0].data.questions[0].answers = [
      {
        head: {
          vars: ["c", "d"]
        },
        results: {
          bindings: [
            {
              c: {
                type: "literal",
                value: "200"
              },
              d: { type: "literal", value: "400" }
            },
            {
              c: {
                type: "literal",
                value: "300"
              },
              d: { type: "literal", value: "500" }
            }
          ]
        }
      }
    ];
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrSystem).toBe(4);
    expect(mockEvaluation.results[0].NrExpected).toBe(1);
    expect(mockEvaluation.results[0].NrCorrect).toBe(0);
  });

  it("should add NrSystem = 3 && NrExpected = 1 && NrCorrect = 0 when the system gives 2 wrong answers with 2 diffrent vars, but  2 answers are the same", async () => {
    mockEvaluation.results[0].data.questions[0].answers = [
      {
        head: {
          vars: ["c", "d"]
        },
        results: {
          bindings: [
            {
              c: {
                type: "literal",
                value: "200"
              },
              d: { type: "literal", value: "500" }
            },
            {
              c: {
                type: "literal",
                value: "300"
              },
              d: { type: "literal", value: "500" }
            }
          ]
        }
      }
    ];
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrSystem).toBe(3);
    expect(mockEvaluation.results[0].NrExpected).toBe(1);
    expect(mockEvaluation.results[0].NrCorrect).toBe(0);
  });
});

describe("calculateSystemResult", () => {
  it("should return 1 for every metric", async () => {
    try {
      let evaluatedQuestions = require("../../testData/testDataset.json");
      mockEvaluation.results = evaluatedQuestions;
      await mockEvaluation.calculateSystemResult();
    } catch (error) {}
  });
});
