/* Barcodechart*/
function drawChart(numQuestions, divId, data) {
  let questions = numQuestions,
    chartWidth = window.innerWidth - 100,
    chartHeight = 35,
    barWidth = chartWidth / questions, // chartWidth / 150;
    barColor = "rgba(0, 0, 0)",
    titleWidth = 30,
    fmeasureWidth = 80;

  let svgEl = d3
    .select("#" + divId)
    .append("svg")
    .attr("width", chartWidth + titleWidth + fmeasureWidth + 5) // 2 pixels to see the boarder
    .attr("height", chartHeight * 2);

  let tooltip = d3
    .select("#" + divId)
    .append("div")
    .attr("class", "tip")
    .text("a simple tooltip");

  barcodeGroup = svgEl
    .append("g")
    .data(data)
    .attr(
      "transform",
      "translate(" + titleWidth + ", " + chartHeight / 2 + ")"
    );

  barcodeGroup
    .append("rect")
    .attr("width", chartWidth)
    .attr("height", chartHeight)
    .style("fill", barColor)
    .style("Stroke", "rgb(0,0,0)");

  barcodeGroup
    .selectAll("rect.result")
    .data(data)
    .enter()
    .append("rect")
    .attr("class", function(d) {
      return "grp" + d.id;
    })
    .attr("width", barWidth)
    .attr("height", chartHeight)
    .attr("stroke-width", 1)
    .attr("stroke", "black")
    .attr("cursor", "pointer")
    .style("fill", function(d) {
      if (d.error) {
        return "#000";
      } else {
        if (d.NrCorrect === d.NrExpected && d.NrExpected === d.NrSystem) {
          return "#00FF00";
        } else if (d.NrCorrect !== d.NrSystem && d.NrCorrect !== 0) {
          return "#FFA500";
        } else if (d.NrSystem > 0 && d.NrCorrect === 0) {
          return "#cc0000";
        } else {
          return "#FFF";
        }
      }
    })
    .attr("x", function(d, i) {
      return i * barWidth;
    })
    .on("mouseover", function(d) {
      var qToHighlight = document.querySelectorAll(".grp" + d.id);
      qToHighlight[0].setAttribute("stroke-width", 3);
      qToHighlight[1].setAttribute("stroke-width", 3);

      let entities;
      let properties;
      let classes;
      let questionString = findQuestionString(d.id);
      let sparqlQuery;

      if (d.error) {
        tooltip.html(`<strong>Error: </strong><span>${d.error}</span>`);

        return tooltip.style("visibility", "visible");
      } else {
        if (d.data.questions[0].qanaryAnno !== undefined) {
          entities = countUris(d.data.questions[0].qanaryAnno.entities);
          properties = countUris(d.data.questions[0].qanaryAnno.properties);
          classes = countUris(d.data.questions[0].qanaryAnno.classes);
          sparqlQuery = d.data.questions[0].query;
          if (sparqlQuery !== "") {
            sparqlQuery = true;
          } else {
            sparqlQuery = false;
          }
        } else {
          let string = "-";
          entities = string;
          properties = string;
          classes = string;
          sparqlQuery = string;
        }

        tooltip.html(
          `<strong>Id: </strong><span>${
            d.id
          }</span><br><strong>Question: </strong><span> ${questionString}</span><br><strong>NrExpected: </strong><span> ${
            d.NrExpected
          }</span><br><strong>NrSystem: </strong><span> ${
            d.NrSystem
          }</span><br><strong>NrCorrect: </strong><span> ${
            d.NrCorrect
          }</span><br><strong>SPARQL Query: </strong><span> ${sparqlQuery}
        </span>
        <br><strong>Entities: </strong><span> ${entities}</span><br><strong>Properties: </strong><span> ${properties}</span><br><strong>Classes: </strong><span> ${classes}</span>`
        );
        return tooltip.style("visibility", "visible");
      }
    })
    .on("mousemove", function(d) {
      return tooltip.style("top", d + "px").style("left", d + "px");
    })
    .on("mouseout", function(d) {
      var qToHighlight = document.querySelectorAll(".grp" + d.id);
      qToHighlight[0].setAttribute("stroke-width", 1);
      qToHighlight[1].setAttribute("stroke-width", 1);

      return tooltip.style("visibility", "hidden");
    })
    .on("click", function(d) {
      fillCompareTable(d.id);
      showCompareTable();
    });
}

function fillCompareTable(questionId) {
  let questionString = findQuestionString(questionId);
  for (let i = 0; i < 2; i++) {
    tableTrs[i].innerHTML = "";
    for (let d of answers[i]) {
      if (d.id == questionId) {
        compareSystemsCaption.innerHTML = `Question ID: ${
          d.id
        }&nbsp;&nbsp;&nbsp;&nbsp; Quesiton: ${questionString}&nbsp;&nbsp;&nbsp;&nbsp; Expected Answers: ${
          d.NrExpected
        }`;
        if (d.error) {
          addTdToTable(i + 1, "error");
          addTdToTable(i + 1, "error");
          addTdToTable(i + 1, "error");
          addTdToTable(i + 1, "error");
          addTdToTable(i + 1, "error");
          addTdToTable(i + 1, "error");
        } else {
          if (d.data.questions[0].qanaryAnno !== undefined) {
            entities = d.data.questions[0].qanaryAnno.entities;
            entities = entities.replace(/,/g, " ");
            properties = d.data.questions[0].qanaryAnno.properties;
            properties = properties.replace(/,/g, " ");
            classes = d.data.questions[0].qanaryAnno.classes;
            classes = classes.replace(/,/g, " ");

            sparqlQuery = d.data.questions[0].query;
            sparqlQuery = sparqlQuery.replace(/<|>/g, "");
            sparqlQuery = sparqlQuery.replace(/,/g, "");
          } else {
            let string = "not available";
            entities = string;
            properties = string;
            classes = string;
            sparqlQuery = string;
          }

          addTdToTable(i + 1, sparqlQuery);
          addTdToTable(i + 1, d.NrSystem);
          addTdToTable(i + 1, d.NrCorrect);
          addTdToTable(i + 1, entities);
          addTdToTable(i + 1, properties);
          addTdToTable(i + 1, classes);
          break;
        }
      }
    }
  }
}

function addTdToTable(systemNr, data) {
  let td = document.createElement("td");
  let text = document.createTextNode(data);
  td.appendChild(text);
  tableTrs[systemNr - 1].appendChild(td);
}

/* Count uris */
function countUris(arr) {
  let nArr = arr.split(",").length;
  if (nArr >= 1) {
    nArr--;
  }
  return nArr;
}

function findQuestionString(questionId) {
  for (let q of dataset.questions) {
    if (questionId == q.id) {
      for (let ql of q.question) {
        if (ql.language === "en") {
          return ql.string;
        }
      }
      break;
    }
  }
}
