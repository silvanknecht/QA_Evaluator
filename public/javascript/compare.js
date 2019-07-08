let dataset;
let evaluations;
let answers = [];
let answerTypesTot;

const datasetPlot = document.getElementById("answerTypes");
const datasetComp = document.getElementById("datasetComp");
// Comparison
const selectSystem1 = document.getElementById("selectSystem1");
const selectSystem2 = document.getElementById("selectSystem2");
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
  refreshComparison();
};

async function buildPage() {
  await buildDatasetVisual(datasetComp.value);
  datasetComp.addEventListener("change", async e => {
    await buildDatasetVisual(e.target.value);
    await buildSystemSelection(datasetComp.value);

    refreshComparison();
  });
  await buildSystemSelection(datasetComp.value);
  if (localStorage.itemsToCompare) {
    datasetComp.value = localStorage.dataset;
    let itemsToCompare = localStorage.itemsToCompare.split(",");
    if (itemsToCompare.length > 1) {
      selectSystem1.value = itemsToCompare[0];
      selectSystem2.value = itemsToCompare[1];
    } else {
      selectSystem1.value = itemsToCompare[0];
    }
  }
}

(async function() {
  if (localStorage.dataset) {
    datasetComp.value = localStorage.dataset;
  }
  await buildPage();

  selectSystem1.addEventListener("change", e => {
    hideCompareTable();
    buildComparisons(
      1,
      e.target.value,
      e.target.options[e.target.selectedIndex].text
    );
  });
  selectSystem2.addEventListener("change", e => {
    hideCompareTable();
    buildComparisons(
      2,
      e.target.value,
      e.target.options[e.target.selectedIndex].text
    );
  });
  closeTable.addEventListener("click", () => {
    hideCompareTable();
  });

  refreshComparison();
})();

function refreshComparison() {
  metricsDiv[0].innerHTML = "";
  answerTypesDiv[0].innerHTML = "";
  barcodeDivs[0].innerHTML = "";
  metricsDiv[1].innerHTML = "";
  answerTypesDiv[1].innerHTML = "";
  barcodeDivs[1].innerHTML = "";
  buildComparisons(
    1,
    selectSystem1.value,
    selectSystem1.options[selectSystem1.selectedIndex].text
  );
  buildComparisons(
    2,
    selectSystem2.value,
    selectSystem2.options[selectSystem2.selectedIndex].text
  );
  hideCompareTable();
}

async function buildComparisons(systemNr, id, name) {
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
    buildChars(systemNr, id, name);
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

  for (var i = 0; i < innerDivs1.length; i++) {
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

async function buildSystemSelection(datasetKey) {
  try {
    evaluations = await fetch(
      url + "evaluations/finished?datasetKey=" + datasetKey,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );

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
    }
    for (prop in evaluations) {
      let opt = document.createElement("option");
      opt.value = evaluations[prop].id;
      opt.innerHTML = evaluations[prop].name;

      selectSystem1.appendChild(opt.cloneNode(true));
      selectSystem2.appendChild(opt.cloneNode(true));
    }
  } catch (error) {
    console.error("Error:", error);
  }
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
