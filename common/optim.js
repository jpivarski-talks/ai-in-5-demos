// Small numerical helpers shared by the demos: random numbers and Adam.
(function () {
  "use strict";

  // seeded uniform random numbers in [0, 1) (mulberry32)
  function rng(seed) {
    let a = (seed == null ? (Math.random() * 2 ** 32) : seed) >>> 0;
    const u = function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    u.normal = function () {
      let x = 0;
      while (x === 0) x = u();
      return Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * u());
    };
    u.range = (lo, hi) => lo + (hi - lo) * u();
    return u;
  }

  // Adam on a flat Float64Array of parameters, given a same-shaped gradient
  class Adam {
    constructor(n, lr, b1, b2, eps) {
      this.lr = lr || 0.01;
      this.b1 = b1 || 0.9;
      this.b2 = b2 || 0.999;
      this.eps = eps || 1e-8;
      this.m = new Float64Array(n);
      this.v = new Float64Array(n);
      this.t = 0;
    }
    step(params, grad, lrScale) {
      this.t++;
      const { b1, b2, eps, m, v } = this;
      const lr = this.lr * (lrScale == null ? 1 : lrScale);
      const c1 = 1 - Math.pow(b1, this.t), c2 = 1 - Math.pow(b2, this.t);
      for (let i = 0; i < params.length; i++) {
        const g = grad[i];
        m[i] = b1 * m[i] + (1 - b1) * g;
        v[i] = b2 * v[i] + (1 - b2) * g * g;
        params[i] -= lr * (m[i] / c1) / (Math.sqrt(v[i] / c2) + eps);
      }
    }
  }

  // solve the symmetric positive (semi)definite system A x = b (Cholesky with jitter)
  function solveSPD(A, b, n) {
    const L = new Float64Array(n * n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let s = A[i * n + j];
        for (let k = 0; k < j; k++) s -= L[i * n + k] * L[j * n + k];
        if (i === j) L[i * n + i] = Math.sqrt(Math.max(s, 1e-12));
        else L[i * n + j] = s / L[j * n + j];
      }
    }
    const y = new Float64Array(n), x = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      let s = b[i];
      for (let k = 0; k < i; k++) s -= L[i * n + k] * y[k];
      y[i] = s / L[i * n + i];
    }
    for (let i = n - 1; i >= 0; i--) {
      let s = y[i];
      for (let k = i + 1; k < n; k++) s -= L[k * n + i] * x[k];
      x[i] = s / L[i * n + i];
    }
    return x;
  }

  // least squares: columns is an array of basis vectors (each length m), y length m
  function leastSquares(columns, y) {
    const n = columns.length, m = y.length;
    const A = new Float64Array(n * n), b = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let s = 0;
        for (let k = 0; k < m; k++) s += columns[i][k] * columns[j][k];
        A[i * n + j] = A[j * n + i] = s;
      }
      let s = 0;
      for (let k = 0; k < m; k++) s += columns[i][k] * y[k];
      b[i] = s;
    }
    for (let i = 0; i < n; i++) A[i * n + i] += 1e-10;
    return solveSPD(A, b, n);
  }

  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (t) => t * t * (3 - 2 * t);

  const api = { rng, Adam, solveSPD, leastSquares, clamp, lerp, smooth };
  if (typeof module !== "undefined") module.exports = api; else window.Optim = api;
})();
