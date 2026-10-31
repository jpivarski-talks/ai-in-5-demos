// 1D data and the two kinds of fits used in Demo 2: fixed cosine templates and
// adaptive logistic functions. Works in the browser (window.Fits1D) and in node.
(function (root) {
  "use strict";
  const O = typeof module !== "undefined" ? require("../common/optim.js") : root.Optim;

  const NPTS = 100;
  const xs = Float64Array.from({ length: NPTS }, (_, i) => i / (NPTS - 1));

  // smooth random curve: white noise blurred by a Gaussian, plus a little noise
  function smoothCurve(u, width, noise) {
    const pad = Math.ceil(4 * width * NPTS), n = NPTS + 2 * pad;
    const w = Float64Array.from({ length: n }, () => u.normal());
    const s = width * NPTS, ker = [];
    for (let k = -pad; k <= pad; k++) ker.push(Math.exp(-0.5 * (k / s) * (k / s)));
    const y = new Float64Array(NPTS);
    for (let i = 0; i < NPTS; i++) {
      let a = 0;
      for (let k = 0; k < ker.length; k++) a += ker[k] * w[i + k];
      y[i] = a;
    }
    let m = 0, v = 0;
    for (const t of y) m += t / NPTS;
    for (const t of y) v += (t - m) * (t - m) / NPTS;
    const sd = Math.sqrt(v);
    for (let i = 0; i < NPTS; i++) y[i] = (y[i] - m) / sd + noise * u.normal();
    return y;
  }

  function r2(y, f) {
    let m = 0;
    for (const t of y) m += t / y.length;
    let ss = 0, sr = 0;
    for (let i = 0; i < y.length; i++) { ss += (y[i] - m) ** 2; sr += (y[i] - f[i]) ** 2; }
    return 1 - sr / ss;
  }
  function sse(y, f) { let s = 0; for (let i = 0; i < y.length; i++) s += (y[i] - f[i]) ** 2; return s; }

  // ---- fixed templates: cos(k pi x), k = 1..K, plus the mean
  const template = (k) => Float64Array.from(xs, (x) => Math.cos(k * Math.PI * x));
  function cosineFit(y, K) {
    const cols = [Float64Array.from(xs, () => 1)];
    for (let k = 1; k <= K; k++) cols.push(template(k));
    const c = O.leastSquares(cols, y);
    return { mean: c[0], amps: Array.from(c.slice(1)) };
  }
  function cosineCurve(mean, amps, n, x) {
    // n = how many templates are included (can be fractional for animation)
    const X = x || xs, f = new Float64Array(X.length).fill(mean);
    for (let k = 0; k < amps.length; k++) {
      const wgt = Math.max(0, Math.min(1, n - k));
      if (wgt === 0) continue;
      for (let i = 0; i < X.length; i++) f[i] += wgt * amps[k] * Math.cos((k + 1) * Math.PI * X[i]);
    }
    return f;
  }

  // ---- adaptive: sum of logistics A / (1 + exp(-(x - x0) / w)), plus a constant
  // params: [x0, logw, A] per logistic
  const logistic = (x, x0, w, A) => A / (1 + Math.exp(-(x - x0) / w));
  function logisticSum(p, c, x) {
    const X = x || xs, f = new Float64Array(X.length).fill(c);
    for (let j = 0; j < p.length; j += 3) {
      const w = Math.exp(p[j + 1]);
      for (let i = 0; i < X.length; i++) f[i] += logistic(X[i], p[j], w, p[j + 2]);
    }
    return f;
  }
  // best constant offset for given logistics
  function bestConst(p, y) {
    const f = logisticSum(p, 0);
    let s = 0;
    for (let i = 0; i < y.length; i++) s += y[i] - f[i];
    return s / y.length;
  }
  // gradient of the mean squared error with respect to p (constant re-solved each step)
  function logisticGrad(p, y) {
    const c = bestConst(p, y), f = logisticSum(p, c), g = new Float64Array(p.length);
    for (let j = 0; j < p.length; j += 3) {
      const x0 = p[j], w = Math.exp(p[j + 1]), A = p[j + 2];
      for (let i = 0; i < xs.length; i++) {
        const r = 2 * (f[i] - y[i]) / xs.length;
        const s = 1 / (1 + Math.exp(-(xs[i] - x0) / w)), ds = s * (1 - s);
        g[j] += r * A * ds * (-1 / w);
        g[j + 1] += r * A * ds * (-(xs[i] - x0) / w);
        g[j + 2] += r * s;
      }
    }
    return { g, c, loss: sse(y, f) };
  }
  function fitLogistics(y, nL, u, starts, steps) {
    let best = null;
    for (let s = 0; s < starts; s++) {
      const p = new Float64Array(3 * nL);
      for (let j = 0; j < nL; j++) { p[3 * j] = u(); p[3 * j + 1] = Math.log(0.03 + 0.1 * u()); p[3 * j + 2] = u.normal(); }
      const opt = new O.Adam(p.length, 0.05);
      let r;
      for (let t = 0; t < steps; t++) { r = logisticGrad(p, y); opt.step(p, r.g, t < steps * 0.6 ? 1 : 0.2); }
      r = logisticGrad(p, y);
      if (!best || r.loss < best.loss) best = { p: Array.from(p), c: r.c, loss: r.loss };
    }
    return best;
  }

  // the starting logistics on page 3, and the optimizer its "fit" button runs
  const START = [0.2, Math.log(0.1), 0.6, 0.5, Math.log(0.1), -0.6, 0.8, Math.log(0.1), 0.6];
  const FIT = { steps: 900, lr: 0.02 };
  function keepInView(p) {
    for (let j = 0; j < p.length; j += 3) {
      p[j] = Math.max(0.02, Math.min(0.98, p[j]));
      p[j + 1] = Math.max(Math.log(0.004), Math.min(Math.log(0.5), p[j + 1]));
    }
  }
  function fitStep(p, y, opt, step) {
    const r = logisticGrad(p, y);
    opt.step(p, r.g, step < FIT.steps * 0.6 ? 1 : 0.3);
    keepInView(p);
    return r.loss;
  }
  function fitFromStart(y) {
    const p = Float64Array.from(START), opt = new O.Adam(p.length, FIT.lr);
    for (let t = 0; t < FIT.steps; t++) fitStep(p, y, opt, t);
    return { p, c: bestConst(p, y) };
  }

  const api = { START, FIT, keepInView, fitStep, fitFromStart, NPTS, xs, smoothCurve, r2, sse, template, cosineFit, cosineCurve, logistic, logisticSum, bestConst, logisticGrad, fitLogistics };
  if (typeof module !== "undefined") module.exports = api; else root.Fits1D = api;
})(typeof window !== "undefined" ? window : globalThis);
