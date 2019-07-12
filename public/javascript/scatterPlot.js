function plotScatter(divId, QALDgfms, dates, ids) {
  let scatterPlot = document.getElementById(divId);
  let colors = [];
  for (let i in dates) {
    colors.push("#428bca");
  }

  let titleOffset;
  let systemNr;
  if (divId === "selectSystem1SameScatter") {
    titleOffset = 0.7;
    systemNr = 1;
  } else {
    titleOffset = 0.1;
    systemNr = 2;
  }

  let data = [
    {
      x: dates,
      y: QALDgfms,
      z: ids,
      type: "scatter",
      mode: "lines+markers",
      marker: { size: 20, color: colors },
      name: "Global QALD F-Measure"
    }
  ];
  let layout = {
    hovermode: "closest",
    title: { text: "Result Timeline", y: titleOffset },
    showlegend: true
  };

  Plotly.newPlot(divId, data, layout, { displayModeBar: false });

  let dragLayer = document.getElementsByClassName("nsewdrag")[0];
  scatterPlot.on("plotly_hover", function(data) {
    dragLayer.style.cursor = "pointer";

    var pn = "",
      tn = "",
      colors = [];
    for (var i = 0; i < data.points.length; i++) {
      pn = data.points[i].pointNumber;
      tn = data.points[i].curveNumber;
      colors = data.points[i].data.marker.color;
    }
    colors[pn] = "#176ed0";

    var update = { marker: { color: colors, size: 20 } };
    Plotly.restyle(divId, update, [tn]);
  });

  scatterPlot.on("plotly_unhover", function(data) {
    dragLayer.style.cursor = "";
    var pn = "",
      tn = "",
      colors = [];
    for (var i = 0; i < data.points.length; i++) {
      pn = data.points[i].pointNumber;
      tn = data.points[i].curveNumber;
      colors = data.points[i].data.marker.color;
    }
    colors[pn] = "#428bca";

    var update = { marker: { color: colors, size: 20 } };
    Plotly.restyle(divId, update, [tn]);
  });

  scatterPlot.on("plotly_click", function(event) {
    let pointIndex = event.points[0].pointIndex;
    hideCompareTable();
    buildComparisons(systemNr, event.points[0].data.z[pointIndex]);
    const select = document.getElementById("selectSystem" + systemNr + "Same");
    select.value = event.points[0].data.z[pointIndex];
  });
}
