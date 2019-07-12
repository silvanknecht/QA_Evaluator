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

window.onresize = async function() {
  Plotly.Plots.resize(datasetPlot);
  Plotly.Plots.resize(selectSystem1SameScatter);
  Plotly.Plots.resize(selectSystem2SameScatter);

  refreshComparison();
};

async function buildPage() {
  buildDatasetVisual(datasetComp.value);
  datasetComp.addEventListener("change", async e => {
    buildDatasetVisual(e.target.value);
    await buildSystemSelection(datasetComp.value);

    refreshComparison();
  });
  await buildSystemSelection(datasetComp.value);

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
      await buildSystemSelection(datasetComp.value, ids["0"], ids["1"]);
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
      await buildSystemSelection(datasetComp.value, id1);
      selectSystem1Same.value = itemsToCompare[0];
    }
  }
}

function buildSameResults(selectSystem, selectSystemSame, scatterPlotId) {
  selectSystemSame.innerHTML = "";
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
  await fillDatasetsSelect();
  if (localStorage.dataset) {
    datasetComp.value = localStorage.dataset;
  }
  await buildPage();

  selectSystem1.addEventListener("change", e => {
    hideCompareTable();
    buildSameResults(
      selectSystem1,
      selectSystem1Same,
      "selectSystem1SameScatter"
    );
    buildComparisons(1, e.target.value);
  });

  selectSystem1Same.addEventListener("change", e => {
    hideCompareTable();
    buildComparisons(1, e.target.value);
  });
  selectSystem2.addEventListener("change", e => {
    hideCompareTable();
    buildSameResults(
      selectSystem2,
      selectSystem2Same,
      "selectSystem2SameScatter"
    );
    buildComparisons(2, e.target.value);
  });
  selectSystem2Same.addEventListener("change", e => {
    hideCompareTable();
    buildComparisons(2, e.target.value);
  });

  closeTable.addEventListener("click", () => {
    hideCompareTable();
  });

  refreshComparison();
})();

async function fillDatasetsSelect() {
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
}

function refreshComparison() {
  metricsDiv[0].innerHTML = "";
  answerTypesDiv[0].innerHTML = "";
  barcodeDivs[0].innerHTML = "";
  metricsDiv[1].innerHTML = "";
  answerTypesDiv[1].innerHTML = "";
  barcodeDivs[1].innerHTML = "";
  buildComparisons(1, selectSystem1Same.value);
  buildComparisons(2, selectSystem2Same.value);
  hideCompareTable();
}

async function buildComparisons(systemNr, id) {
  metricsDiv[systemNr - 1].innerHTML = "";
  answerTypesDiv[systemNr - 1].innerHTML = "";
  barcodeDivs[systemNr - 1].innerHTML = "";
  informationDivs[systemNr - 1].innerHTML = "";
  totalFoundDivs[systemNr - 1].innerHTML = "";
  if (evaluations[id] !== undefined) {
    await buildAnswerTypes(systemNr, evaluations[id].evalResults.answerTypes);
    compareAnswertypes();
    await buildMetrics(systemNr, evaluations[id].evalResults);
    compareMetrics();
    await buildInformation(systemNr, evaluations[id]);
    compareInformation();
    await buildTotalFound(
      evaluations[id].isQanaryPipeline,
      systemNr,
      evaluations[id].evalResults.totalFound
    );
    compareTotalFound(evaluations[id].isQanaryPipeline);
    buildChars(systemNr, id, evaluations[id].name);
  }
}

async function buildChars(systemNr, id, name) {
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

      if (num1 > num2) {
        answertype1.setAttribute("class", "green");
        answertype2.setAttribute("class", "red");
      } else if (num2 > num1) {
        answertype2.setAttribute("class", "green");
        answertype1.setAttribute("class", "red");
      } else {
        answertype2.classList.remove("green", "red");
        answertype1.classList.remove("green", "red");
      }
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
      Number(evalResults.endTimestamp - evalResults.startTimestamp) / 1000
    ).toFixed(0) + "s";
  div.appendChild(span);
  informationDivs[systemNr - 1].appendChild(div);
}

function compareInformation() {
  let innerDivs1 = informationDivs[0].getElementsByTagName("DIV");
  let innerDivs2 = informationDivs[1].getElementsByTagName("DIV");

  let time1 = innerDivs1[0].querySelector("span");
  let time2 = innerDivs2[0].querySelector("span");
  let num1 = Number(time1.innerText.replace("s", ""));
  let num2 = Number(time2.innerText.replace("s", ""));

  // TODO: replace doublicated code, careful this one is diffrent thant the others!
  if (num1 < num2) {
    time1.setAttribute("class", "green");
    time2.setAttribute("class", "red");
  } else if (num2 < num1) {
    time2.setAttribute("class", "green");
    time1.setAttribute("class", "red");
  } else {
    time2.classList.remove("green", "red");
    time1.classList.remove("green", "red");
  }
}

// TODO: Split this function into 2 functions
async function buildSystemSelection(
  datasetKey,
  idToSelect1 = undefined,
  idToSelect2 = undefined
) {
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

              console.log("This is the same System!");
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
  } catch (error) {
    console.error("Error:", error);
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
}

async function buildDatasetVisual(datasetKey) {
  dataset = await fetch(url + "datasets?dataset=" + datasetKey, {
    method: "GET"
  });
  dataset = await dataset.json();
  /* Analyze Questions*/
  let { answerTypes, countOfQuestions } = analyzeQuestions(dataset);
  answerTypesTot = answerTypes;
  plotPie(answerTypes, datasetKey, countOfQuestions);
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

function showCompareTable() {
  compareSystemTable.style.display = "table";
  closeTable.style.display = "block";
}

function hideCompareTable() {
  compareSystemTable.style.display = "none";
  closeTable.style.display = "none";
}
