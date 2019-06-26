const url = "http://localhost:3000/";

const exForm = document.getElementById("exForm");
const exName = document.getElementById("exName");
const exDataset = document.getElementById("exDataset");
const exSystemUrl = document.getElementById("exSystemUrl");

const runEvalsTableBody = document
  .getElementById("runEvalsTable")
  .getElementsByTagName("tbody")[0];
const finEvalsTableBody = document
  .getElementById("finEvalsTable")
  .getElementsByTagName("tbody")[0];

(function() {
  fillFinishedTable();
  fillRunningTable();
})();

// Live data
let socket = io.connect(url, { reconnection: true });
socket.on("updateStatus", data => {
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
  addToFinEval(json);
});

socket.on("evalFailed", data => {
  console.log("evalFailed");
  let json = JSON.parse(data);
  addToFinEval(json);
});

// Start an evaluation
exForm.addEventListener("submit", () => {
  let data = {
    name: exName.value.replace(" ", ""),
    dataset: exDataset.value,
    systemUrl: exSystemUrl.value
  };

  fetch(url + "evaluations/evaluate", {
    method: "POST",
    body: JSON.stringify(data),
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then(res => res.json())
    .then(response => {
      if (response) console.log("Evaluation started: ", response);
    })
    .catch(error => {
      console.error("Error:", error);
    });
});

function fillRunningTable() {
  fetch(url + "runningEvals", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then(res => res.json())
    .then(response => {
      console.log(response);
      for (let id in response) {
        addToRunEval(response[id]);
      }
    })
    .catch(error => console.error("Error:", error));
}

function fillFinishedTable() {
  fetch(url + "finishedEvals", {
    method: "GET",
    headers: {
      "Content-Type": "application/json"
    }
  })
    .then(res => res.json())
    .then(response => {
      console.log(response);
      for (let id in response) {
        addToFinEval(response[id]);
      }
    })
    .catch(error => console.error("Error:", error));
}

// Table column functions

function addToRunEval(response) {
  let { id, startTimestamp, name, dataset, progress, status } = response;
  let tr = document.createElement("tr");
  tr.setAttribute("id", `trRun${id}`);

  // Table header
  let th = document.createElement("th");
  th.setAttribute("scope", "row");
  th.appendChild(createDateField(startTimestamp, id));

  // Create table
  tr.appendChild(th);
  tr.appendChild(createSimpleField(id));
  tr.appendChild(createSimpleField(name));
  tr.appendChild(createSimpleField(dataset));
  tr.appendChild(createProgressField(id, progress));
  tr.appendChild(createSimpleField(status, "statRun", id));

  runEvalsTableBody.appendChild(tr);
}

function addToFinEval(response) {
  let {
    id,
    startTimestamp,
    name,
    dataset,
    status,
    errors,
    evalResults
  } = response;
  let tr = document.createElement("tr");

  // Table header
  let th = document.createElement("th");
  th.setAttribute("scope", "row");
  th.appendChild(createDateField(startTimestamp, id));

  // Create table
  tr.appendChild(th);
  tr.appendChild(createSimpleField(id));
  tr.appendChild(createSimpleField(name));
  tr.appendChild(createSimpleField(dataset));

  // TODO: needs better solution
  if (evalResults !== undefined) {
    tr.appendChild(createResultField(evalResults.grc));
    tr.appendChild(createResultField(evalResults.gpr));
    tr.appendChild(createResultField(evalResults.gfm));
    tr.appendChild(createResultField(evalResults.QALDgpr));
    tr.appendChild(createResultField(evalResults.QALDgfm));
  } else {
    tr.appendChild(createResultField("-"));
    tr.appendChild(createResultField("-"));
    tr.appendChild(createResultField("-"));
    tr.appendChild(createResultField("-"));
    tr.appendChild(createResultField("-"));
  }

  tr.appendChild(createSimpleField(errors.length));
  tr.appendChild(createSimpleField(status));

  finEvalsTableBody.appendChild(tr);
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
  // TODO: fix because old data doesn't hav the startTimestamp value
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
