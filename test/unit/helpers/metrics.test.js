const Metrics = require("../../../helpers/metrics");

let mockQuestion;

beforeEach(() => {
  mockQuestion = {
    NrExpected: 1,
    NrSystem: 1,
    NrCorrect: 1
  };
});

describe("Calculate recall", () => {
  it("should return 1 when NrExpected = 0 and NrSystem = 0", () => {
    mockQuestion.NrExpected = 0;
    mockQuestion.NrSystem = 0;
    let recall = Metrics.calcRecall(mockQuestion);

    expect(recall).toBe(1);
  });

  it("should return 0 when NrExpected = 0 and NrSystem > 0", () => {
    mockQuestion.NrExpected = 0;
    mockQuestion.NrSystem = 2;
    let recall = Metrics.calcRecall(mockQuestion);

    expect(recall).toBe(0);
  });

  it("should return 0 when NrExpected > 0 and NrSystem = 0", () => {
    mockQuestion.NrExpected = 2;
    mockQuestion.NrSystem = 0;
    let recall = Metrics.calcRecall(mockQuestion);

    expect(recall).toBe(0);
  });

  it("should return 0.75 when NrExpected > 0 and NrSystem > 0", () => {
    mockQuestion.NrExpected = 4;
    mockQuestion.NrSystem = 3;
    mockQuestion.NrCorrect = 3;
    let recall = Metrics.calcRecall(mockQuestion);

    expect(recall).toBe(0.75);
  });
});

describe("Calculate precision", () => {
  it("should return 1 when NrExpected = 0 and NrSystem = 0", () => {
    mockQuestion.NrExpected = 0;
    mockQuestion.NrSystem = 0;
    let precision = Metrics.calcPrecision(mockQuestion);

    expect(precision).toBe(1);
  });

  it("should return 0 when NrExpected = 0 and NrSystem > 0", () => {
    mockQuestion.NrExpected = 0;
    mockQuestion.NrSystem = 2;
    let precision = Metrics.calcPrecision(mockQuestion);

    expect(precision).toBe(0);
  });

  it("should return 0 when NrExpected > 0 and NrSystem = 0", () => {
    mockQuestion.NrExpected = 2;
    mockQuestion.NrSystem = 0;
    let precision = Metrics.calcPrecision(mockQuestion, false);

    expect(precision).toBe(0);
  });

  it("should return 1 (QALD-Precision) when NrExpected > 0 and NrSystem = 0", () => {
    mockQuestion.NrExpected = 2;
    mockQuestion.NrSystem = 0;
    let precision = Metrics.calcPrecision(mockQuestion);

    expect(precision).toBe(1);
  });

  it("should return 0 when NrExpected > 0 and NrSystem > 0", () => {
    mockQuestion.NrExpected = 4;
    mockQuestion.NrSystem = 3;
    mockQuestion.NrCorrect = 2;
    let precision = Metrics.calcPrecision(mockQuestion);

    expect(precision).toBe(2 / 3);
  });
});

describe("Calculate FMeasure", () => {
  it("should return 0 when recall and precision = 0", () => {
    let rec = 0;
    let prec = 0;
    let fMeasure = Metrics.calcFMeasure(rec, prec);

    expect(fMeasure).toBe(0);
  });

  it("should return 1 when recall and precision = 1", () => {
    let rec = 1;
    let prec = 1;
    let fMeasure = Metrics.calcFMeasure(rec, prec);

    expect(fMeasure).toBe(1);
  });

  it("should return 0 when either recall or precision = 0", () => {
    let rec = 1;
    let prec = 0;
    let fMeasure = Metrics.calcFMeasure(rec, prec);

    expect(fMeasure).toBe(0);
  });
});
