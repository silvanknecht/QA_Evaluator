const exQASystems = document.getElementById("QASystems");
const questionForm = document.getElementById("questionForm");
const askButton = document.getElementById("askButton");

const qaSystems = document.getElementById("QASystems");
const question = document.getElementById("question");

const answersLi = document.getElementById("answersLi");

(function() {
  questionForm.addEventListener("submit", async () => {
    askButton.setAttribute("disabled", true);

    let data = {
      question: question.value,
      systemUrl: qaSystems.value
    };

    try {
      let response = await fetch(url + "evaluations/askquestion", {
        method: "POST",
        body: JSON.stringify(data),
        headers: {
          "Content-Type": "application/json"
        }
      });

      response = await response.json();
      if (response) {
        console.log(response);
      }
      answersLi.innerHTML = "";
      if (response.length === 0) {
        listItem = document.createElement("li");
        listItem.innerHTML = "No answers found!";
        answersLi.appendChild(listItem);
      }
      for (i = 0; i < response.length; ++i) {
        listItem = document.createElement("li");
        listItem.innerHTML = response[i];
        answersLi.appendChild(listItem);
      }
      askButton.removeAttribute("disabled");
    } catch (error) {
      console.error("Error:", error);
      askButton.removeAttribute("disabled");
    }
  });
})();
