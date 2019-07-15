let dataset;
let evaluations;
let answers = [];
let answerTypesTot;

const datasetPlot = document.getElementById("answerTypes");
const datasetComp = document.getElementById("datasetComp");

const selectSystem1 = document.getElementById("selectSystem1");
const selectSystem2 = document.getElementById("selectSystem2");

const selectSystem1Same = document.getElementById("selectSystem1Same");
const selectSystem2Same = document.getElementById("selectSystem2Same");
const selectSystem1SameScatter = document.getElementById(
  "selectSystem1SameScatter"
);
const selectSystem2SameScatter = document.getElementById(
  "selectSystem2SameScatter"
);
let resultsBelongingTogether = {};

const answerTypesDiv = [
  document.getElementById("answerTypes1"),
  document.getElementById("answerTypes2")
];

const metricsDiv = [
  document.getElementById("metrics1"),
  document.getElementById("metrics2")
];

const barcodeDivs = [
  document.getElementById("barcode1"),
  document.getElementById("barcode2")
];

const informationDivs = [
  document.getElementById("information1"),
  document.getElementById("information2")
];

const totalFoundMainDivs = [
  document.getElementById("totalFoundMain1"),
  document.getElementById("totalFoundMain2")
];
const totalFoundDivs = [
  document.getElementById("totalFound1"),
  document.getElementById("totalFound2")
];

const closeTable = document.getElementById("closeTable");
const compareSystemTable = document.getElementById("compareSystemsTable");

const compareSystemsTableBody = document
  .getElementById("compareSystemsTable")
  .getElementsByTagName("tbody")[0];
const compareSystemsCaption = document
  .getElementById("compareSystemsTable")
  .getElementsByTagName("caption")[0];

const tableTrs = [
  document.getElementById("tr1"),
  document.getElementById("tr2")
];

window.onresize = function() {
  Plotly.Plots.resize(datasetPlot);
  Plotly.Plots.resize(selectSystem1SameScatter);
  Plotly.Plots.resize(selectSystem2SameScatter);

  buildComparisons();
};

function buildSameResults(selectSystem, selectSystemSame, scatterPlotId) {
  selectSystemSame.innerHTML = "";
  document.getElementById(scatterPlotId).innerHTML = "";
  let valueSelect = selectSystem.options[selectSystem.selectedIndex].value;
  if (valueSelect !== "-- no results available --") {
    let QALDgfms = [];
    let dates = [];
    let ids = [];
    for (let id of resultsBelongingTogether[valueSelect].reverse()) {
      QALDgfms.push(evaluations[id].evalResults.metrics.QALDgfm);
      ids.push(id);
      // if it is the first of the SAME Results it needs to be added first
      if (selectSystemSame.length === 0) {
        let gmt2 = evaluations[id].startTimestamp + 7200000;
        let date = new Date(gmt2)
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");
        dates.push(date);

        selectSystemSame[selectSystemSame.options.length] = new Option(
          date,
          evaluations[id].id,
          true
        );
      } else {
        let gmt2 = evaluations[id].startTimestamp + 7200000;
        let date = new Date(gmt2)
          .toISOString()
          .slice(0, 19)
          .replace("T", " ");
        dates.push(date);

        selectSystemSame[selectSystemSame.options.length] = new Option(
          date,
          evaluations[id].id,
          false
        );
      }
    }
    if (dates.length > 1) {
      plotScatter(scatterPlotId, QALDgfms, dates, ids);
    }
  } else {
    selectSystemSame[selectSystemSame.options.length] = new Option(
      "-- no results available --"
    );
  }
}

(async function() {
  try {
    await fillDatasetsSelect();
  } catch (error) {
    console.log(error);
  }

  if (localStorage.dataset) {
    datasetComp.value = localStorage.dataset;
  }
  buildDatasetVisual(datasetComp.value);
  datasetComp.addEventListener("change", async e => {
    buildDatasetVisual(e.target.value);
    try {
      await buildSystemSelection(datasetComp.value);
    } catch (error) {
      console.log(error);
    }

    buildSameResults(
      selectSystem1,
      selectSystem1Same,
      "selectSystem1SameScatter"
    );
    buildSameResults(
      selectSystem2,
      selectSystem2Same,
      "selectSystem2SameScatter"
    );

    buildComparisons();
  });

  try {
    await buildSystemSelection(datasetComp.value);
  } catch (error) {
    console.log(error);
  }
  buildSameResults(
    selectSystem1,
    selectSystem1Same,
    "selectSystem1SameScatter"
  );
  buildSameResults(
    selectSystem2,
    selectSystem2Same,
    "selectSystem2SameScatter"
  );

  if (localStorage.itemsToCompare) {
    let itemsToCompare = localStorage.itemsToCompare.split(",");
    if (itemsToCompare.length > 1) {
      let ids = {};
      for (let parentId in resultsBelongingTogether) {
        if (
          resultsBelongingTogether[parentId].indexOf(itemsToCompare[0]) !== -1
        ) {
          ids["0"] = parentId;
        }
        if (
          resultsBelongingTogether[parentId].indexOf(itemsToCompare[1]) !== -1
        ) {
          ids["1"] = parentId;
        }
      }
      try {
        await buildSystemSelection(datasetComp.value, ids["0"], ids["1"]);
      } catch (error) {
        console.log(error);
      }
      buildSameResults(
        selectSystem1,
        selectSystem1Same,
        "selectSystem1SameScatter"
      );
      buildSameResults(
        selectSystem2,
        selectSystem2Same,
        "selectSystem2SameScatter"
      );
      selectSystem1Same.value = itemsToCompare[0];
      selectSystem2Same.value = itemsToCompare[1];
    } else {
      let id1;
      for (let parentId in resultsBelongingTogether) {
        if (
          resultsBelongingTogether[parentId].indexOf(itemsToCompare[0]) !== -1
        ) {
          id1 = parentId;
          break;
        }
      }
      try {
        await buildSystemSelection(datasetComp.value, id1);
      } catch (error) {
        console.log(error);
      }
      buildSameResults(
        selectSystem1,
        selectSystem1Same,
        "selectSystem1SameScatter"
      );
      buildSameResults(
        selectSystem2,
        selectSystem2Same,
        "selectSystem2SameScatter"
      );
      selectSystem1Same.value = itemsToCompare[0];
    }
  }

  selectSystem1.addEventListener("change", e => {
    hideCompareTable();
    buildSameResults(
      selectSystem1,
      selectSystem1Same,
      "selectSystem1SameScatter"
    );
    buildComparison(1, e.target.value);
    refreshComparison();
  });

  selectSystem1Same.addEventListener("change", e => {
    hideCompareTable();
    buildComparison(1, e.target.value);
    refreshComparison();
  });
  selectSystem2.addEventListener("change", e => {
    hideCompareTable();
    buildSameResults(
      selectSystem2,
      selectSystem2Same,
      "selectSystem2SameScatter"
    );
    buildComparison(2, e.target.value);
    refreshComparison();
  });
  selectSystem2Same.addEventListener("change", e => {
    hideCompareTable();
    buildComparison(2, e.target.value);
    refreshComparison();
  });

  closeTable.addEventListener("click", () => {
    hideCompareTable();
  });

  buildComparisons();
})();

function fillDatasetsSelect() {
  return new Promise(async (resolve, reject) => {
    try {
      let datasets = await availableDatasets();
      datasets = await datasets.json();

      datasets.forEach(function(dataset, key) {
        if (dataset == "qald-9") {
          datasetComp[datasetComp.options.length] = new Option(
            dataset,
            dataset,
            true
          );
        } else {
          datasetComp[datasetComp.options.length] = new Option(
            dataset,
            dataset,
            false
          );
        }
      });

      resolve();
    } catch (error) {
      reject(error);
    }
  });
}

function buildComparison(systemNr, id) {
  informationDivs[systemNr - 1].innerHTML = "";
  metricsDiv[systemNr - 1].innerHTML = "";
  answerTypesDiv[systemNr - 1].innerHTML = "";
  barcodeDivs[systemNr - 1].innerHTML = "";
  totalFoundDivs[systemNr - 1].innerHTML = "";

  if (evaluations[id] !== undefined) {
    buildAnswerTypes(systemNr, evaluations[id].evalResults.answerTypes);
    buildMetrics(systemNr, evaluations[id].evalResults);
    buildInformation(systemNr, evaluations[id]);
    buildTotalFound(
      evaluations[id].isQanaryPipeline,
      systemNr,
      evaluations[id].evalResults.totalFound
    );
    buildChars(systemNr, id, evaluations[id].name);
  }
}

function buildComparisons() {
  buildComparison(1, selectSystem1Same.value);
  buildComparison(2, selectSystem2Same.value);
  refreshComparison();
}

function refreshComparison() {
  compareAnswertypes();
  compareMetrics();
  compareInformation();
  compareTotalFound();
  hideCompareTable();
}

async function buildChars(systemNr, id, name) {
  try {
    let evaluatedAnswers = await fetch(
      url + "evaluations/evaluatedAnswers?name=" + name + "&id=" + id,
      { method: "GET" }
    );
    evaluatedAnswers = await evaluatedAnswers.json();
    evaluatedAnswers = evaluatedAnswers.concat(evaluations[id].errors);
    evaluatedAnswers.sort((a, b) => (Number(a.id) > Number(b.id) ? 1 : -1));
    drawChart(
      dataset.questions.length,
      "barcode" + systemNr,
      evaluatedAnswers,
      evaluations[id].name,
      evaluations[id].evalResults
    );
    answers[systemNr - 1] = evaluatedAnswers;
  } catch (error) {
    console.log(error);
  }
}

function buildTotalFound(isQanaryPipeline, systemNr, totalFound) {
  if (isQanaryPipeline) {
    totalFoundMainDivs[systemNr - 1].style.display = "block";
    for (prop in totalFound) {
      let div = document.createElement("div");
      div.setAttribute("class", "col-sm-2 answertype");

      let h3 = document.createElement("h3");
      h3.innerText = prop;
      div.appendChild(h3);
      let span = document.createElement("span");

      span.innerText = totalFound[prop].toFixed(0);

      div.appendChild(span);
      totalFoundDivs[systemNr - 1].appendChild(div);
    }
  } else {
    totalFoundMainDivs[systemNr - 1].style.display = "none";
  }
}

function compareTotalFound() {
  let innerDivs1 = totalFoundDivs[0].getElementsByTagName("DIV");
  let innerDivs2 = totalFoundDivs[1].getElementsByTagName("DIV");

  for (var i = 0; i < innerDivs1.length && innerDivs2.length > 0; i++) {
    let found1 = innerDivs1[i].querySelector("span");
    let found2 = innerDivs2[i].querySelector("span");

    if (found1 !== undefined && found2 !== undefined) {
      let num1 = Number(found1.innerText);
      let num2 = Number(found2.innerText);
      coloringComparison(num1, num2, found1, found2);
    }
  }
}

function buildMetrics(systemNr, evalResults) {
  for (metric in evalResults.metrics) {
    let div = document.createElement("div");
    div.setAttribute("class", "col-sm-2 answertype");

    let h3 = document.createElement("h3");
    h3.innerText = metric;
    div.appendChild(h3);
    let span = document.createElement("span");
    span.innerText = evalResults.metrics[metric].toFixed(4);
    div.appendChild(span);
    metricsDiv[systemNr - 1].appendChild(div);
  }
}

function compareMetrics() {
  let innerDivs1 = metricsDiv[0].getElementsByTagName("DIV");
  let innerDivs2 = metricsDiv[1].getElementsByTagName("DIV");

  for (var i = 0; i < innerDivs1.length; i++) {
    let metric1 = innerDivs1[i].querySelector("span");
    let metric2 = innerDivs2[i].querySelector("span");

    let num1 = Number(metric1.innerText);
    let num2 = Number(metric2.innerText);

    if (num1 > num2) {
      metric1.setAttribute("class", "green");
      metric2.setAttribute("class", "red");
    } else if (num2 > num1) {
      metric2.setAttribute("class", "green");
      metric1.setAttribute("class", "red");
    } else {
      metric2.classList.remove("green", "red");
      metric1.classList.remove("green", "red");
    }
  }
}

function buildAnswerTypes(systemNr, answerTypes) {
  if (
    Object.entries(answerTypes).length === 0 &&
    answerTypes.constructor === Object
  ) {
  } else {
    for (answ in answerTypesTot) {
      let div = document.createElement("div");
      div.setAttribute("class", "col-sm-2 answertype");

      let h3 = document.createElement("h3");
      h3.innerText = answ;
      div.appendChild(h3);
      let span = document.createElement("span");
      if (answerTypes[answ] !== undefined) {
        span.innerText =
          ((answerTypes[answ] * 100) / answerTypesTot[answ]).toFixed(2) + "%";
      } else {
        span.innerText = "0%";
      }
      div.appendChild(span);
      answerTypesDiv[systemNr - 1].appendChild(div);
    }
  }
}

function compareAnswertypes() {
  let innerDivs1 = answerTypesDiv[0].getElementsByTagName("DIV");
  let innerDivs2 = answerTypesDiv[1].getElementsByTagName("DIV");
  for (var i = 0; i < innerDivs1.length; i++) {
    if (innerDivs1[i] !== undefined && innerDivs2[i] !== undefined) {
      let answertype1 = innerDivs1[i].querySelector("span");
      let answertype2 = innerDivs2[i].querySelector("span");

      let num1 = Number(answertype1.innerText.replace("%", ""));
      let num2 = Number(answertype2.innerText.replace("%", ""));

      coloringComparison(num1, num2, answertype1, answertype2);
    }
  }
}

function buildInformation(systemNr, evalResults) {
  let div = document.createElement("div");
  div.setAttribute("class", "col-sm-12 answertype");

  let h3 = document.createElement("h3");
  h3.innerText = "Evaluation Time:";
  div.appendChild(h3);
  let span = document.createElement("span");
  span.innerText =
    (
      Number(evalResults.endTimestamp - evalResults.startTimestamp) / 3600000
    ).toFixed(1) + "h";
  div.appendChild(span);
  informationDivs[systemNr - 1].appendChild(div);
}

function compareInformation() {
  let innerDivs1 = informationDivs[0].getElementsByTagName("DIV");
  let innerDivs2 = informationDivs[1].getElementsByTagName("DIV");
  if (innerDivs1[0] !== undefined && innerDivs2[0] !== undefined) {
    let time1 = innerDivs1[0].querySelector("span");
    let time2 = innerDivs2[0].querySelector("span");
    let num1 = Number(time1.innerText.replace("h", ""));
    let num2 = Number(time2.innerText.replace("h", ""));

    coloringComparison(num2, num1, time1, time2);
  }
}

// TODO: Split this function into 2 functions
function buildSystemSelection(
  datasetKey,
  idToSelect1 = undefined,
  idToSelect2 = undefined
) {
  return new Promise(async (resolve, reject) => {
    resultsBelongingTogether = {};
    try {
      evaluations = await fetch(url + "evaluations?datasetKey=" + datasetKey, {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });

      evaluations = await evaluations.json();
      selectSystem1.innerHTML = "";
      selectSystem2.innerHTML = "";
      if (
        Object.entries(evaluations).length === 0 &&
        evaluations.constructor === Object
      ) {
        let opt = document.createElement("option");
        opt.innerHTML = "-- no results available --";

        selectSystem1.appendChild(opt.cloneNode(true));
        selectSystem2.appendChild(opt.cloneNode(true));
      } else {
        let evaluationsClone = JSON.parse(JSON.stringify(evaluations));
        for (let id in evaluationsClone) {
          if (evaluationsClone[id].status !== "failed") {
            resultsBelongingTogether[id] = [id];
            let opt = document.createElement("option");
            opt.value = evaluationsClone[id].id;
            opt.innerHTML = evaluationsClone[id].name;

            selectSystem1.appendChild(opt.cloneNode(true));
            selectSystem2.appendChild(opt.cloneNode(true));
            delete evaluationsClone[id];

            // check if there is another evaluation with the same name, version, and systemUrl
            for (let id2 in evaluationsClone) {
              if (
                evaluations[id].name === evaluationsClone[id2].name &&
                evaluations[id].evaluatorVersion ===
                  evaluationsClone[id2].evaluatorVersion &&
                evaluations[id].systemUrl === evaluationsClone[id2].systemUrl
              ) {
                resultsBelongingTogether[id].push(id2);
                delete evaluationsClone[id2];
              }
            }
          } else {
            delete evaluationsClone[id];
          }
        }
      }
      if (idToSelect1 !== undefined) {
        selectSystem1.value = idToSelect1;
      }
      if (idToSelect2 !== undefined) {
        selectSystem2.value = idToSelect2;
      }
      resolve(resultsBelongingTogether);
    } catch (error) {
      console.error("Error:", error);
      reject(error);
    }
  });
}

async function buildDatasetVisual(datasetKey) {
  try {
    dataset = await fetch(url + "datasets?dataset=" + datasetKey, {
      method: "GET"
    });
    dataset = await dataset.json();
    /* Analyze Questions*/
    let { answerTypes, countOfQuestions } = analyzeQuestions(dataset);
    answerTypesTot = answerTypes;
    plotPie(answerTypes, datasetKey, countOfQuestions);
  } catch (error) {
    console.log(error);
  }
}

function analyzeQuestions(qald) {
  let answerTypes = {};
  let countOfQuestions = 0;
  for (let q of qald.questions) {
    countOfQuestions++;
    if (answerTypes[q.answertype] === undefined) {
      answerTypes[q.answertype] = 1;
    } else {
      answerTypes[q.answertype]++;
    }
  }
  return { answerTypes, countOfQuestions };
}

// Helpers

function showCompareTable() {
  compareSystemTable.style.display = "table";
  closeTable.style.display = "block";
}

function hideCompareTable() {
  compareSystemTable.style.display = "none";
  closeTable.style.display = "none";
}

function coloringComparison(num1, num2, found1, found2) {
  if (num1 > num2) {
    found1.setAttribute("class", "green");
    found2.setAttribute("class", "red");
  } else if (num2 > num1) {
    found2.setAttribute("class", "green");
    found1.setAttribute("class", "red");
  } else {
    found2.classList.remove("green", "red");
    found1.classList.remove("green", "red");
  }
}
