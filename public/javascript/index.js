const exForm = document.getElementById("exForm");
const exName = document.getElementById("exName");
const exDataset = document.getElementById("exDataset");
const exSystemUrl = document.getElementById("exSystemUrl");
const exQASystems = document.getElementById("exQASystems");

const datasetFin = document.getElementById("datasetFin");

const runEvalsTableBody = document
  .getElementById("runEvalsTable")
  .getElementsByTagName("tbody")[0];
const finEvalsTableBody = document
  .getElementById("finEvalsTable")
  .getElementsByTagName("tbody")[0];

let compareResults = [];
const selectedResults = document.getElementById("selectedResults");
const compareBtn = document.getElementById("compareBtn");

(function() {
  fillFinishedTable("qald-9");
  fillRunningTable();

  //
  exQASystems.addEventListener("change", e => {
    let value = e.target.value;
    exSystemUrl.readOnly = false;

    if (value === "false") return (exSystemUrl.value = "");
    if (!value.match(/^http:\/\//)) value = qanaryUrl + value;
    exSystemUrl.value = value;
    exSystemUrl.readOnly = true;
  });

  datasetFin.addEventListener("change", e => {
    compareResults = [];
    selectedResults.innerText = compareResults.length;
    fillFinishedTable(e.target.value);
  });

  // Start an evaluation
  exForm.addEventListener("submit", async () => {
    let data = {
      name: exName.value.replace(" ", ""),
      dataset: exDataset.value,
      systemUrl: exSystemUrl.value
    };

    try {
      let startedEval = await fetch(url + "evaluations/evaluate", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json"
        }
      });
      startedEval = await startedEval.json();
      if (startedEval) console.log("Evaluation started: ", startedEval);
    } catch (error) {
      console.error("Error:", error);
    }
  });

  // POPOVERS
  $(".pop-me-over").popover({ trigger: "hover" });

  // compare button
  compareBtn.addEventListener("click", () => {
    localStorage.setItem("itemsToCompare", compareResults);
    localStorage.setItem("dataset", datasetFin.value);
    window.location.href = "/compare";
  });
})();

// Live data
let socket = io.connect(url, { reconnection: true });
socket.on("update", data => {
  console.log(JSON.parse(data));
  let json = JSON.parse(data);
  const progBar = document.getElementById(`progBar${json.id}`);
  const statRun = document.getElementById(`statRun${json.id}`);

  if (!(json.status == "successful") && !(json.status === "failed")) {
    statRun.innerHTML = json.status;
    progBar.style.width = json.progress;
    progBar.innerHTML = json.progress;
  }
});
socket.on("evalStarted", data => {
  let json = JSON.parse(data);
  addToRunEval(json);
});

socket.on("evalEnded", data => {
  let json = JSON.parse(data);
  const trRun = document.getElementById(`trRun${json.id}`);
  trRun.parentNode.removeChild(trRun);
  if (json.datasetKey === datasetFin.value) {
    addToFinEval(json);
  }
});

socket.on("evalFailed", data => {
  console.log("evalFailed");
  let json = JSON.parse(data);
  if (json.datasetKey === datasetFin.value) addToFinEval(json);
});

async function fillRunningTable() {
  try {
    let runningEvals = await fetch(url + "evaluations/running", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    runningEvals = await runningEvals.json();
    console.log(runningEvals);
    for (let id in runningEvals) {
      addToRunEval(runningEvals[id]);
    }
  } catch (error) {
    onsole.error("Error:", error);
  }
}

async function fillFinishedTable(datasetKey) {
  finEvalsTableBody.innerHTML = "";
  try {
    let evals = await fetch(
      url + "evaluations/finished?datasetKey=" + datasetKey,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      }
    );
    evals = await evals.json();
    console.log(evals);
    for (let id in evals) {
      addToFinEval(evals[id]);
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

// Table column functions

function addToRunEval(response) {
  let { id, startTimestamp, name, datasetKey, progress, status } = response;
  let tr = document.createElement("tr");
  tr.setAttribute("id", `trRun${id}`);

  // Table header
  let td = document.createElement("td");
  td.setAttribute("scope", "row");
  td.appendChild(createDateField(startTimestamp, id));

  // Create table
  tr.appendChild(td);
  tr.appendChild(createSimpleField(name));
  tr.appendChild(createSimpleField(datasetKey));
  tr.appendChild(createProgressField(id, progress));
  tr.appendChild(createSimpleField(status, "statRun", id));

  runEvalsTableBody.appendChild(tr);
}

function addToFinEval(response) {
  let {
    id,
    evaluatorVersion,
    startTimestamp,
    name,
    datasetKey,
    dataset,
    status,
    errors,
    evalResults
  } = response;
  let tr = document.createElement("tr");
  tr.setAttribute("id", `trFin${id}`);

  // Table header
  let td = document.createElement("td");
  td.setAttribute("scope", "row");
  td.appendChild(createDateField(startTimestamp, id));

  // Create table
  tr.appendChild(td);
  tr.appendChild(createSimpleField(name));

  // TODO: needs better solution
  if (evalResults !== undefined) {
    tr.appendChild(createResultField(evalResults.metrics.grc));
    tr.appendChild(createResultField(evalResults.metrics.gpr));
    tr.appendChild(createResultField(evalResults.metrics.gfm));
    tr.appendChild(createResultField(evalResults.metrics.QALDgpr));
    tr.appendChild(createResultField(evalResults.metrics.QALDgfm));
  } else {
    tr.appendChild(createResultField("-"));
    tr.appendChild(createResultField("-"));
    tr.appendChild(createResultField("-"));
    tr.appendChild(createResultField("-"));
    tr.appendChild(createResultField("-"));
  }

  tr.appendChild(createSimpleField(errors.length));
  tr.appendChild(createSimpleField(status));
  tr.appendChild(createSimpleField("Delete", "delFin", id));

  finEvalsTableBody.appendChild(tr);

  //action listeners
  const delFin = document.getElementById("delFin" + id);
  delFin.classList += "pressable";
  delFin.addEventListener("click", () => {
    swal({
      title: "Are you sure?",
      text: "Once deleted, you will not be able to recover this Evaluation!",
      icon: "warning",
      buttons: true,
      dangerMode: true
    }).then(willDelete => {
      if (willDelete) {
        fetch(url + `evaluations?id=${id}&name=${name}`, {
          method: "DELETE"
        })
          .then(res => res.json())
          .then(response => {
            const trFin = document.getElementById(`trFin${id}`);
            trFin.parentNode.removeChild(trFin);
            swal(response.message, {
              icon: "success"
            });

            // when you press on delete, the row gets selected... and needs to be deleted out of the comparison Array when the delete was successsful
            let index = compareResults.indexOf(id);
            compareResults.splice(index, 1);
            selectedResults.innerText = compareResults.length;
          })
          .catch(error => {
            console.error("Error:", error);
            sweetAlert("Oops...", "Something went wrong!", "error");
          });
      } else {
        swal("Nothing deleted!");
      }
    });
  });

  // choose to compare
  tr.addEventListener("click", e => {
    let trId = e.path[1].id;
    const finTr = document.getElementById(trId);
    id = trId.replace(/\D/g, "");
    if (compareResults.indexOf(id) === -1) {
      if (compareResults.length === 2) {
        const replactrFin = document.getElementById(
          "trFin" + compareResults[0]
        );
        if (replactrFin) {
          replactrFin.classList.remove("toCompare");
        }
        compareResults.splice(0, 1);
      }
      compareResults.push(id);
      finTr.classList += "toCompare";
    } else {
      compareResults.splice(compareResults.indexOf(id), 1);
      finTr.classList.remove("toCompare");
    }
    selectedResults.innerText = compareResults.length;
  });
}

// Table funtions

function createSimpleField(value, name = 0, id = 0) {
  let td = document.createElement("td");
  if (name !== 0 && id !== 0) td.setAttribute("id", `${name}${id}`);
  let text = document.createTextNode(value);
  td.appendChild(text);
  return td;
}

function createDateField(startTimestamp, id) {
  // TODO: fix because old data doesn't have the startTimestamp value
  let gmt2;
  if (startTimestamp === undefined) {
    gmt2 = id + 7200000;
  } else {
    gmt2 = startTimestamp + 7200000;
  }
  let text = document.createTextNode(
    new Date(gmt2)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ")
  );
  return text;
}

function createProgressField(id, progress) {
  let td = document.createElement("td");
  let div = document.createElement("div");
  div.setAttribute("class", "progress");
  let div2 = document.createElement("div");
  setAttributes(div2, {
    class: "progress-bar progress-bar-striped",
    id: `progBar${id}`,
    role: "progressbar",
    style: `width: ${progress}`,
    "aria-valuenow": progress.replace("%", ""),
    "aria-valuemin": "0",
    "aria-valuemax": "100"
  });
  if (progress !== "100%") {
    div2.classList += " progress-bar-animated";
  }
  let text4 = document.createTextNode(progress);
  div2.appendChild(text4);
  div.appendChild(div2);
  td.appendChild(div);
  return td;
}

function createResultField(value) {
  let td = document.createElement("td");
  let text;
  if (value !== "-") {
    text = document.createTextNode(Number(value).toFixed(3));
  } else {
    text = document.createTextNode("-");
  }
  td.appendChild(text);
  return td;
}

// Helper functions
function setAttributes(el, attrs) {
  for (var key in attrs) {
    el.setAttribute(key, attrs[key]);
  }
}

// code by https://www.w3schools.com/howto/howto_js_sort_table.asp
function sortTable(n, tableId) {
  var table,
    rows,
    switching,
    i,
    x,
    y,
    shouldSwitch,
    dir,
    switchcount = 0;
  table = document.getElementById(tableId);
  switching = true;
  dir = "asc";
  while (switching) {
    switching = false;
    rows = table.rows;
    for (i = 1; i < rows.length - 1; i++) {
      shouldSwitch = false;
      x = rows[i].getElementsByTagName("TD")[n];
      y = rows[i + 1].getElementsByTagName("TD")[n];
      if (dir == "asc") {
        if (x.innerHTML.toLowerCase() > y.innerHTML.toLowerCase()) {
          shouldSwitch = true;
          break;
        }
      } else if (dir == "desc") {
        if (x.innerHTML.toLowerCase() < y.innerHTML.toLowerCase()) {
          shouldSwitch = true;
          break;
        }
      }
    }
    if (shouldSwitch) {
      rows[i].parentNode.insertBefore(rows[i + 1], rows[i]);
      switching = true;
      switchcount++;
    } else {
      if (switchcount == 0 && dir == "asc") {
        dir = "desc";
        switching = true;
      }
    }
  }
}
