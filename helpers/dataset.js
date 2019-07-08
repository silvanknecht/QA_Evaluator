class dataset {
  static expectedAnswers(question) {
    let variable;
    let ea = [];
    if (question.answers[0].head.vars === undefined) {
      variable = "boolean";
      ea.push(question.answers[0].boolean);
    } else {
      variable = question.answers[0].head.vars[0];
      if (question.answers[0].results.bindings) {
        for (let a of question.answers[0].results.bindings) {
          ea.push(a[variable].value);
        }
      }
    }
    return ea;
  }
}
