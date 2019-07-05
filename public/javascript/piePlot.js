function plotPie(answerTypes, datasetKey, countOfQuestions) {
  var data = [
    {
      values: Object.values(answerTypes),
      labels: Object.keys(answerTypes),
      type: "pie"
    }
  ];

  var layout = {
    title: {
      text: "Answertypes included in " + datasetKey,
      font: {
        family: "Arial, serif",
        size: 20
      }
    },
    annotations: [
      {
        text: "Number of questions: " + countOfQuestions,
        font: {
          size: 13,
          color: "rgb(116, 101, 130)"
        },
        showarrow: false,
        align: "center",
        x: 0.55,
        y: 1.15
      }
    ]
  };

  Plotly.newPlot("answerTypes", data, layout);
}
