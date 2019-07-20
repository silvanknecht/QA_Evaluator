// do not allow writing to a file during tests
jest.mock("fs");
const request = require("supertest");

let Evaluation = require("../../../models/evaluation");

let socket;
let server;
let result;
let resultset;
let resultset20;

beforeAll(() => {
  server = require("../../../app");
});

afterAll(() => {
  server.close();
});

beforeEach(done => {
  resultset = require("../../testData/testResultset.json");
  resultset20 = require("../../testData/testResultset20.json");
  try {
    socket = require("socket.io-client")("http://localhost:3000");
    socket.on("connect", () => {
      socket.on("evalEnded", message => {
        result = JSON.parse(message);
        // Check that the message matches
      });
      done();
    });
  } catch (error) {
    console.log(error);
  }
});
afterEach(() => {
  if (socket.connected) {
    socket.disconnect();
  }
});

describe("start evaluation 100% correct answers", () => {
  let payload;
  const exec = () => {
    return request(server)
      .post("/evaluations/")
      .send(payload);
  };

  beforeEach(() => {
    Evaluation.prototype.updateEvalsFile = jest.fn().mockReturnValue();
    Evaluation.prototype.askQuestion = jest
      .fn()
      .mockImplementationOnce(async () => {
        return { questions: resultset[0].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset[1].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset[2].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset[3].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset[4].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset[5].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset[6].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset[7].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset[8].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset[9].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset[10].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset[11].data.questions };
      });
    payload = {
      systemUrl: "http://testurl.ch",
      dataset: "testData",
      name: "testEvaluation"
    };
  });

  it("should return 400 if the input systemUrl was invalid", async () => {
    payload.systemUrl = "";

    const res = await exec();

    expect(res.status).toBe(400);
  });

  it("should return 400 if the input dataset was invalid", async () => {
    payload.dataset = "blblb";

    const res = await exec();

    expect(res.status).toBe(400);
  });

  it("should return 400 if the input name was invalid", async () => {
    payload.name = "1";

    const res = await exec();

    expect(res.status).toBe(400);
  });

  it("should add number:2 to the answerTypes property", async done => {
    let res = await exec();

    setTimeout(function() {
      expect(result.evalResults.answerTypes.number).toBe(2);
      done();
    }, 50);
  });
  it("should add resource:5 to the answerTypes property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.answerTypes.resource).toBe(5);
      done();
    }, 50);
  });
  it("should add boolean:1 to the answerTypes property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.answerTypes.boolean).toBe(1);
      done();
    }, 50);
  });
  it("should add date:2 to the answerTypes property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.answerTypes.date).toBe(2);
      done();
    }, 50);
  });
  it("should add string:2 to the answerTypes property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.answerTypes.string).toBe(2);
      done();
    }, 50);
  });
  it("should add 1 to every metric", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.metrics.grc).toBe(1);
      expect(result.evalResults.metrics.gpr).toBe(1);
      expect(result.evalResults.metrics.QALDgpr).toBe(1);
      expect(result.evalResults.metrics.gfm).toBe(1);
      expect(result.evalResults.metrics.QALDgfm).toBe(1);
      done();
    }, 50);
  });
  it("should add entities:12 to the totalFound property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.totalFound.entities).toBe(12);
      done();
    }, 50);
  });
  it("should add properties:11 to the totalFound property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.totalFound.properties).toBe(11);
      done();
    }, 50);
  });
  it("should add classes:3 to the totalFound property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.totalFound.classes).toBe(3);
      done();
    }, 50);
  });
  it("should add queries:12 to the totalFound property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.totalFound.queries).toBe(12);
      done();
    }, 50);
  });
});

describe("start evaluation answers from Pipeline 20, some are wrong, some right", () => {
  let payload;
  const exec = () => {
    return request(server)
      .post("/evaluations/")
      .send(payload);
  };

  beforeEach(() => {
    Evaluation.prototype.updateEvalsFile = jest.fn().mockReturnValue();
    Evaluation.prototype.askQuestion = jest
      .fn()
      .mockImplementationOnce(async () => {
        return { questions: resultset20[0].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset20[1].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset20[2].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset20[3].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset20[4].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset20[5].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset20[6].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset20[7].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset20[8].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset20[9].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset20[10].data.questions };
      })
      .mockImplementationOnce(async () => {
        return { questions: resultset20[11].data.questions };
      });
    payload = {
      systemUrl: "http://testurl.ch",
      dataset: "testData",
      name: "testEvaluation"
    };
  });

  it("should add number:1 to the answerTypes property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.answerTypes.number).toBe(1);

      done();
    }, 50);
  });
  it("should add resource:1 to the answerTypes property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.answerTypes.resource).toBe(1);

      done();
    }, 50);
  });
  it("should add boolean: undefined to the answerTypes property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.answerTypes.boolean).toBeUndefined();
      done();
    }, 50);
  });
  it("should add date:1 to the answerTypes property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.answerTypes.date).toBe(1);

      done();
    }, 50);
  });
  it("should add string:undefined to the answerTypes property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.answerTypes.string).toBeUndefined();
      done();
    }, 50);
  });
  it("should add 0.432 as grp to the metrics", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.metrics.grc).toBe(0.432);
      done();
    }, 50);
  });
  it("should add 0.4 as gpr to the metrics", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.metrics.gpr).toBe(0.4);
      done();
    }, 50);
  });
  it("should add 0.65 as QALDgpr to the metrics", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.metrics.QALDgpr).toBe(0.65);
      done();
    }, 50);
  });
  it("should add 0.386 as gfm to the metrics", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.metrics.gfm).toBe(0.386);

      done();
    }, 50);
  });
  it("should add 0.519 as QALDgfm to the metrics", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.metrics.QALDgfm).toBe(0.519);

      done();
    }, 50);
  });
  it("should add entities:13 to the totalFound property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.totalFound.entities).toBe(13);

      done();
    }, 50);
  });
  it("should add properties:12 to the totalFound property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.totalFound.properties).toBe(12);
      done();
    }, 50);
  });
  it("should add classes:1 to the totalFound property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.totalFound.classes).toBe(1);
      done();
    }, 50);
  });
  it("should add queries:11 to the totalFound property", async done => {
    const res = await exec();

    setTimeout(function() {
      expect(result.evalResults.totalFound.queries).toBe(11);
      done();
    }, 50);
  });
});
