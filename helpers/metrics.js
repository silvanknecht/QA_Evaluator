class Metrics {
  static calcRecall(q) {
    if (q.NrExpected === 0 && q.NrSystem === 0) return 1;
    if (q.NrExpected === 0 && q.NrSystem > 0) return 0;
    if (q.NrExpected > 0 && q.NrSystem === 0) return 0;
    return q.NrCorrect / q.NrExpected;
  }

  static calcPrecision(q, isQald=true) {
    if (q.NrExpected === 0 && q.NrSystem === 0) return 1;
    if (q.NrExpected === 0 && q.NrSystem > 0) return 0;
    // QALD
    if (isQald) {
      if (q.NrExpected > 0 && q.NrSystem === 0) return 1;
    } else {
      if (q.NrExpected > 0 && q.NrSystem === 0) return 0;
    }
    return q.NrCorrect / q.NrSystem;
  }

  static calcFMeasure(rec, prec) {
    if (rec === 0 && prec === 0) return 0;
    return (2 * rec * prec) / (rec + prec);
  }
}

module.exports = Metrics;
