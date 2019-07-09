var MockDate = require("mockdate");
const Evaluation = require("../../../models/evaluation");

let mockTimestamp = 1434319925275;
let mockEvaluation;
let evaluatedQuestions;
let evaluatedQuestionsP20;
let emptyQuestion = [
  {
    head: {
      vars: ["c"]
    },
    results: {
      bindings: []
    }
  }
];

let multiAnswer = [
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

let multiVarAnswers = [
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

let multiVarsDublicatAnswer = [
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

beforeEach(() => {
  MockDate.set(mockTimestamp);
  try {
    let dataset = require("../../testData/testDataset.json");
    let testResultset = require("../../testData/testResultset.json");
    evaluatedQuestions = require("../../testData/testEvaluatedQuestions.json");
    evaluatedQuestionsP20 = require("../../testData/testEvaluatedQuestionsP20.json");

    datasets["testDataset"] = dataset;
    let timestamp = Date.now();
    mockEvaluation = new Evaluation(
      timestamp,
      "test",
      "testDataset",
      "http://testsystem.url/",
      12
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
  it("should return a evaluation object that has the id property", () => {
    expect(mockEvaluation).toHaveProperty("id", mockTimestamp);
  });
  it("should return a evaluation object that has the status property", () => {
    expect(mockEvaluation).toHaveProperty("status", "starting...");
  });
  it("should return a evaluation object that has the totalQuestions property", () => {
    expect(mockEvaluation).toHaveProperty("totalQuestions", 12);
  });
});

describe("findNextQuestion", () => {
  it("should return question Id '99'", () => {
    mockEvaluation.processedQuestions = 2;
    let { qId } = mockEvaluation.findNextQuestion();

    expect(qId).toMatch("99");
  });
  it("should return the questionUrl", () => {
    mockEvaluation.processedQuestions = 2;
    let { questionUrl } = mockEvaluation.findNextQuestion();

    expect(questionUrl).toMatch(
      mockEvaluation.systemUrl +
        "?query=" +
        encodeURI("What is the time zone of Salt Lake City?")
    );
  });
});

describe("evaluateQuestions", () => {
  it("should return 1 NrSystem for the 1th question in the resultset", async () => {
    await mockEvaluation.evaluateQuestions();
    expect(mockEvaluation.results[0].NrSystem).toBe(1);
  });
  it("should return 1 NrExpected for the 1th question in the resultset", async () => {
    await mockEvaluation.evaluateQuestions();
    expect(mockEvaluation.results[0].NrExpected).toBe(1);
  });
  it("should return 1 NrCorrect for the 1th question in the resultset", async () => {
    await mockEvaluation.evaluateQuestions();
    expect(mockEvaluation.results[0].NrCorrect).toBe(1);
  });
  it("should return 22 NrSystem for the 10th question in the resultset", async () => {
    await mockEvaluation.evaluateQuestions();
    expect(mockEvaluation.results[9].NrSystem).toBe(22);
  });
  it("should return 22 NrExpected for the 10th question in the resultset", async () => {
    await mockEvaluation.evaluateQuestions();
    expect(mockEvaluation.results[9].NrExpected).toBe(22);
  });
  it("should return 22 NrCorrect for the 10th question in the resultset", async () => {
    await mockEvaluation.evaluateQuestions();
    expect(mockEvaluation.results[9].NrCorrect).toBe(22);
  });
  it("should add NrSystem = 0  when the system doesn't give an answer to the 1 question in the resultset", async () => {
    mockEvaluation.results[0].data.questions[0].answers = [];
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrSystem).toBe(0);
  });
  it("should add NrExpected =1 when the system doesn't give an answer to the 1 question in the resultset", async () => {
    mockEvaluation.results[0].data.questions[0].answers = [];
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrExpected).toBe(1);
  });
  it("should add NrCorrect = 0 when the system doesn't give an answer to the 1 question in the resultset", async () => {
    mockEvaluation.results[0].data.questions[0].answers = [];
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrCorrect).toBe(0);
  });
  it("should add NrSystem = 0  when the system doesn't give an answer to the first question, when the answer Array contains an object but still no answer", async () => {
    mockEvaluation.results[0].data.questions[0].answers = emptyQuestion;
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrSystem).toBe(0);
  });
  it("should add NrExpected =1 when the system doesn't give an answer to the first question, when the answer Array contains an object but still no answer", async () => {
    mockEvaluation.results[0].data.questions[0].answers = emptyQuestion;
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrExpected).toBe(1);
  });
  it("should add NrCorrect = 0 when the system doesn't give an answer to the first question, when the answer Array contains an object but still no answer", async () => {
    mockEvaluation.results[0].data.questions[0].answers = emptyQuestion;
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrCorrect).toBe(0);
  });

  //tests with muliple answers
  it("should add NrSystem = 2 when the system gives 2 wrong answers", async () => {
    mockEvaluation.results[0].data.questions[0].answers = multiAnswer;
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrSystem).toBe(2);
  });
  it("should add NrExpected =1 when the system gives 2 wrong answers", async () => {
    mockEvaluation.results[0].data.questions[0].answers = multiAnswer;
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrExpected).toBe(1);
  });
  it("should add NrCorrect = 0 when the system gives 2 wrong answers", async () => {
    mockEvaluation.results[0].data.questions[0].answers = multiAnswer;
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrCorrect).toBe(0);
  });

  // tests with multiple answers and vars

  it("should add NrSystem = 4 when the system gives 2 wrong answers with 2 diffrent vars", async () => {
    mockEvaluation.results[0].data.questions[0].answers = multiVarAnswers;
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrSystem).toBe(4);
  });
  it("should add NrExpected =1 when the system gives 2 wrong answers with 2 diffrent vars", async () => {
    mockEvaluation.results[0].data.questions[0].answers = multiVarAnswers;
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrExpected).toBe(1);
  });
  it("should add NrCorrect = 0 when the system gives 2 wrong answers with 2 diffrent vars", async () => {
    mockEvaluation.results[0].data.questions[0].answers = multiVarAnswers;
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrCorrect).toBe(0);
  });
  debugger;
  it("should add NrSystem = 3 when the system gives 2 wrong answers with 2 diffrent vars (4Answers), but  2 answers are the same", async () => {
    mockEvaluation.results[0].data.questions[0].answers = multiVarsDublicatAnswer;
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrSystem).toBe(3);
  });

  it("should add NrExpected = 1  when the system gives 2 wrong answers with 2 diffrent vars (4Answers), but  2 answers are the same", async () => {
    mockEvaluation.results[0].data.questions[0].answers = multiVarsDublicatAnswer;
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrExpected).toBe(1);
  });
  it("should add NrCorrect = 0 when the system gives 2 wrong answers with 2 diffrent vars (4Answers), but  2 answers are the same", async () => {
    mockEvaluation.results[0].data.questions[0].answers = multiVarsDublicatAnswer;
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.results[0].NrCorrect).toBe(0);
  });

  // TESTs counting found Entities, Properties, Classes and Queries
  it("should add 11 for totalFound entities", async () => {
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.evalResults.totalFound.entities).toBe(12);
  });
  it("should add 9 for totalFound properties", async () => {
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.evalResults.totalFound.properties).toBe(11);
  });

  it("should add 2 for totalFound classes", async () => {
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.evalResults.totalFound.classes).toBe(3);
  });
  it("should add 12 for totalFound queries", async () => {
    await mockEvaluation.evaluateQuestions();

    expect(mockEvaluation.evalResults.totalFound.queries).toBe(12);
  });
});

describe("calculateSystemResult with 100% correct Answers", () => {
  //test with a 100% correct answer(s)
  it("should add 1 as recall from the quesiton", async () => {
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.results[0].calc[0].recall).toBe(1);
  });
  it("should add 1 as precision from the quesiton", async () => {
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.results[0].calc[0].precision).toBe(1);
  });
  it("should add 1 as qaldPrecision from the quesiton", async () => {
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.results[0].calc[0].qaldPrecision).toBe(1);
  });
  it("should add 1 as fMeasure from the quesiton", async () => {
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.results[0].calc[0].fMeasure).toBe(1);
  });

  it("should add 1 as grc for the entire system", async () => {
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.evalResults.metrics.grc).toBe(1);
  });

  it("should add 1 as gpr for the entire system", async () => {
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.evalResults.metrics.gpr).toBe(1);
  });
  it("should add 1 as QALDgpr for the entire system", async () => {
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.evalResults.metrics.QALDgpr).toBe(1);
  });

  it("should add 1 as gfm for the entire system", async () => {
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.evalResults.metrics.gfm).toBe(1);
  });
  it("should add 1 as QALDgfm for the entire system", async () => {
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.evalResults.metrics.QALDgfm).toBe(1);
  });
});

describe("calculateSystemResult including wrong answers", () => {
  // tests with custom values
  it("should add 1/3 as recall from the quesiton", async () => {
    evaluatedQuestions[0] = {
      id: "1",
      NrExpected: 6,
      NrSystem: 5,
      NrCorrect: 2
    };
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.results[0].calc[0].recall).toBe(1 / 3);
  });

  it("should add 0.3636363636363636 as fmeasure from the quesiton", async () => {
    evaluatedQuestions[0] = {
      id: "1",
      NrExpected: 6,
      NrSystem: 5,
      NrCorrect: 2
    };
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.results[0].calc[0].fMeasure).toBe(0.3636363636363636);
  });

  // none qald precision
  it("should add 2/5 as precision from the quesiton", async () => {
    evaluatedQuestions[0] = {
      id: "1",
      NrExpected: 6,
      NrSystem: 0,
      NrCorrect: 0
    };
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.results[0].calc[0].precision).toBe(0);
  });

  // qaldPrecision
  it("should add 1 as qaldPrecision from the quesiton", async () => {
    evaluatedQuestions[0] = {
      id: "1",
      NrExpected: 6,
      NrSystem: 0,
      NrCorrect: 0
    };
    mockEvaluation.results = evaluatedQuestions;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.results[0].calc[0].qaldPrecision).toBe(1);
  });
});

describe("calculateSystemResult of the results from qanary pipeline 20 containing correct and wrong answers", () => {
  // tests with custom values
  it("should add 0.432 as recall from the quesiton", async () => {
    mockEvaluation.results = evaluatedQuestionsP20;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.evalResults.metrics.grc).toBe(0.432);
  });

  it("should add 0.400 as gpr for the entire system", async () => {
    mockEvaluation.results = evaluatedQuestionsP20;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.evalResults.metrics.gpr).toBe(0.4);
  });
  it("should add 0.650 as QALDgpr for the entire system", async () => {
    mockEvaluation.results = evaluatedQuestionsP20;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.evalResults.metrics.QALDgpr).toBe(0.65);
  });

  it("should add 0.386 as gfm for the entire system", async () => {
    mockEvaluation.results = evaluatedQuestionsP20;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.evalResults.metrics.gfm).toBe(0.386);
  });

  it("should add 1 as gfm for the entire system", async () => {
    mockEvaluation.results = evaluatedQuestionsP20;
    await mockEvaluation.calculateSystemResult();

    expect(mockEvaluation.evalResults.metrics.gfm).toBe(0.386);
  });
});
