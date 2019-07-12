const url = "http://localhost:3000/";
const qanaryUrl = "http://localhost:8080/";

function availableDatasets() {
  return fetch(url + "datasets/", {
    method: "GET"
  });
}
