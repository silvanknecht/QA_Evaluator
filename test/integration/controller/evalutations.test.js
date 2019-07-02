const request = require("supertest");
let evaluationController = require("../../../controllers/evaluations");

let server;

beforeEach(() => {
  server = require("../../../app");
});
afterEach(async () => {
  await server.close();
});

describe("start evaluation", () => {
  let payload;
  const exec = () => {
    return request(server)
      .post("/evaluations/evaluate")
      .send(payload);
  };

  beforeEach(() => {
    payload = {
      systemUrl:
        "http://localhost:8080/gerbil-execute/NER-Stanford,%20NED-AGDISTIS,%20EarlRelationLinking,%20DiambiguationClass,%20QueryBuilder/",
      dataset: "testData20",
      name: "testk"
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

  // it("should return 200 and the current evaluation when valid input was provided", async () => {
  //   evaluationController.askQuestion = function() {
  //     console.log("Quesiton is asked to the System!");
  //   };
  //   const res = await exec();
  //   expect(res.status).toBe(200);
  // });

  // it("should return a valid currentEval object when valid input was provided", async () => {
  //   evaluationController.askQuestion = function() {
  //     console.log("Quesiton is asked to the System!");
  //   };
  //   const res = await exec();
  //   console.log(res.body);
  //   expect(res.body).toEqual({
  //     id: res.body.startTimestamp,
  //     name: "testk",
  //     startTimestamp: res.body.startTimestamp,
  //     endTimestamp: null,
  //     dataset: "testData20",
  //     systemUrl:
  //     "http://localhost:8080/gerbil-execute/NER-Stanford,%20NED-AGDISTIS,%20EarlRelationLinking,%20DiambiguationClass,%20QueryBuilder/",
  //     evaluatorVersion: "3.0.0",
  //     results: [],
  //     errors: [],
  //     totalQuestions: 12,
  //     processedQuestions: 0,
  //     progress: "0%",
  //     status: "starting..."
  //   });
  // });
});

// describe("start evaluation", () => {
//   let payload;
//   const exec = () => {
//     return request(server)
//       .post("/evaluations/evaluate")
//       .send(payload);
//   };
//   it("should ")
// });
