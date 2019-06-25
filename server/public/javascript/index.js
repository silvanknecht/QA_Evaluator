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

// Live data
let socket = io.connect(url);
socket.on("updateStatus", function(data) {
  console.log(JSON.parse(data));
  let json = JSON.parse(data);
  const progBar = document.getElementById(`progBar${json.id}`);
  progBar.style.width = json.progress;
  progBar.innerHTML = json.progress;
  if (json.progress === "100%") {
    progBar.classList.remove("progress-bar-animated");
  }
});

socket.on("evalEnded", function(data) {
  let json = JSON.parse(data);
  const trRun = document.getElementById(`trRun${json.id}`);
  trRun.parentNode.removeChild(trRun);
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
      if (response) addToRunEval(response);
    })
    .catch(error => {
      console.error("Error:", error);
    });
});

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

function addToRunEval(response) {
  let { id, startTimestamp, name, dataset, progress } = response;
  let tr = document.createElement("tr");
  tr.setAttribute("id", `trRun${id}`);

  // Date
  let th = document.createElement("th");
  th.setAttribute("scope", "row");
  let gmt2 = startTimestamp + 7200000;
  let text1 = document.createTextNode(
    new Date(gmt2)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ")
  );
  th.appendChild(text1);

  // Name
  let td = document.createElement("td");
  let text2 = document.createTextNode(name);
  td.appendChild(text2);

  // Dataset
  let td2 = document.createElement("td");
  let text3 = document.createTextNode(dataset);
  td2.appendChild(text3);

  // State
  let td3 = document.createElement("td");
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
  td3.appendChild(div);

  // Create table
  tr.appendChild(th);
  tr.appendChild(td);
  tr.appendChild(td2);
  tr.appendChild(td3);

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

  // Date
  let th = document.createElement("th");
  th.setAttribute("scope", "row");

  // TODO: fix because old data doesn't hav the startTimestamp value
  let gmt2;
  if (startTimestamp === undefined) {
    gmt2 = id + 7200000;
  } else {
    gmt2 = startTimestamp + 7200000;
  }
  let text1 = document.createTextNode(
    new Date(gmt2)
      .toISOString()
      .slice(0, 19)
      .replace("T", " ")
  );
  th.appendChild(text1);

  // Name
  let td = document.createElement("td");
  let text2 = document.createTextNode(name);
  td.appendChild(text2);

  // Dataset
  let td2 = document.createElement("td");
  let text3 = document.createTextNode(dataset);
  td2.appendChild(text3);

  // QALD F-Measure

  let td5 = document.createElement("td");
  let text6;
  if (status !== "failed") {
    text6 = document.createTextNode(Number(evalResults.QALDgfm).toFixed(4));
  } else {
    text6 = document.createTextNode("-");
  }
  td5.appendChild(text6);

  // State
  let td3 = document.createElement("td");
  let text4 = document.createTextNode(status);
  td3.appendChild(text4);

  // Errors
  let td4 = document.createElement("td");
  let text5 = document.createTextNode(errors.length);
  td4.appendChild(text5);

  // Create table
  tr.appendChild(th);
  tr.appendChild(td);
  tr.appendChild(td2);
  tr.appendChild(td5);
  tr.appendChild(td4);
  tr.appendChild(td3);

  finEvalsTableBody.appendChild(tr);
}

// Helper functions
function setAttributes(el, attrs) {
  for (var key in attrs) {
    el.setAttribute(key, attrs[key]);
  }
}
