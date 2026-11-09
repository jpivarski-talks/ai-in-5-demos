// Shared pieces for the sawtooth pages of Demo 3: the data (a triangle wave), a small fully
// connected network of soft ReLUs, its optimizer, and its two kinds of starting points.
// Plain JavaScript, no TensorFlow.js: the networks have at most a few hundred parameters.
//
// The optimizer is Levenberg-Marquardt (Gauss-Newton steps, damped when they overshoot) on the
// hidden layers, with the output layer solved exactly by least squares at every step ("variable
// projection"). Adam stalls on this problem: a sawtooth made of ReLU corners needs large output
// weights of alternating sign that nearly cancel, and following the gradient can't find them.
(function () {
  "use strict";
  const O = typeof module !== "undefined" ? require("../common/optim.js") : window.Optim;

  // ---------------------------------------------------------------- data
  // A triangle wave on [-1, 1] made of `pieces` straight segments, alternating up and down
  // between -1 and +1, sampled at perPiece points per segment, plus Gaussian noise of width
  // noise.sd (random numbers from noise.rng). With asym (an rng), each corner is moved sideways
  // and made lower by a random amount, so the teeth are no longer all the same.
  function sawtooth(pieces, perPiece, noise, asym) {
    const corners = [];
    for (let k = 0; k <= pieces; k++) corners.push([-1 + 2 * k / pieces, k % 2 === 0 ? -1 : 1]);
    if (asym) {
      const dx = 2 / pieces;
      for (let k = 0; k <= pieces; k++) {
        if (k > 0 && k < pieces) corners[k][0] += 0.3 * dx * (2 * asym() - 1);
        corners[k][1] *= 1 - 0.55 * asym();
      }
    }
    const n = pieces * perPiece + 1, xs = new Float64Array(n), ys = new Float64Array(n);
    let j = 0;
    for (let i = 0; i < n; i++) {
      const x = -1 + 2 * i / (n - 1);
      while (j < pieces - 1 && x > corners[j + 1][0]) j++;
      const [x0, y0] = corners[j], [x1, y1] = corners[j + 1];
      xs[i] = x;
      ys[i] = y0 + (y1 - y0) * (x - x0) / (x1 - x0) + (noise ? noise.sd * noise.rng.normal() : 0);
    }
    return { xs, ys, corners };
  }

  // ---------------------------------------------------------------- network
  // soft ReLU: s log(1 + exp(z / s)), a ReLU with its corner rounded over a width of about s
  const SOFT = 0.01;
  // (far from the corner, where exp underflows anyway, it is exactly a ReLU)
  const act = (z) => (z > 40 * SOFT ? z : z < -40 * SOFT ? 0 : z > 0 ? z + SOFT * Math.log1p(Math.exp(-z / SOFT)) : SOFT * Math.log1p(Math.exp(z / SOFT)));
  const dact = (z) => (z > 40 * SOFT ? 1 : z < -40 * SOFT ? 0 : 1 / (1 + Math.exp(-z / SOFT)));

  // sizes: [1, hidden..., 1]. All weights and biases live in one flat array, layer by layer,
  // with the output layer last; W[k] (sizes[k] x sizes[k+1], row-major) and b[k] are views into it.
  class MLP {
    constructor(sizes) {
      this.sizes = sizes;
      this.L = sizes.length - 1;   // number of weight layers (the last one is linear)
      this.at = [];
      let n = 0;
      for (let k = 0; k < this.L; k++) { this.at.push(n); n += sizes[k] * sizes[k + 1] + sizes[k + 1]; }
      this.params = new Float64Array(n);
      this.W = this.at.map((o, k) => this.params.subarray(o, o + sizes[k] * sizes[k + 1]));
      this.b = this.at.map((o, k) => this.params.subarray(o + sizes[k] * sizes[k + 1], o + sizes[k] * sizes[k + 1] + sizes[k + 1]));
      this.nHidden = this.at[this.L - 1];   // parameters before the output layer
    }
    // A[k]: values of layer k for every point (A[0] = x; A[L-1] = the last hidden layer),
    // Z[k]: the pre-activations that produced A[k + 1]. Returns the outputs.
    forward(xs) {
      const n = xs.length, S = this.sizes, L = this.L;
      this.A = [xs];
      this.Z = [];
      for (let k = 0; k < L; k++) {
        const a = this.A[k], m = S[k], h = S[k + 1], W = this.W[k], b = this.b[k];
        const z = new Float64Array(n * h);
        for (let p = 0; p < n; p++) {
          for (let j = 0; j < h; j++) {
            let s = b[j];
            for (let i = 0; i < m; i++) s += a[p * m + i] * W[i * h + j];
            z[p * h + j] = s;
          }
        }
        if (k + 1 < L) { this.Z.push(z); this.A.push(z.map(act)); } else this.out = z;
      }
      return this.out;
    }
    // d(output)/d(hidden-layer parameters) for every point (n x nHidden), after forward(xs)
    jacobian(n) {
      const S = this.sizes, L = this.L, T = this.nHidden, J = new Float64Array(n * T);
      const wmax = Math.max(...S);
      let d = new Float64Array(wmax), prev = new Float64Array(wmax);
      for (let p = 0; p < n; p++) {
        // d: d(output)/d(pre-activations) of hidden layer k + 1, from the top down
        const h0 = S[L - 1], zt = this.Z[L - 2];
        for (let j = 0; j < h0; j++) d[j] = this.W[L - 1][j] * dact(zt[p * h0 + j]);
        for (let k = L - 2; k >= 0; k--) {
          const m = S[k], h = S[k + 1], W = this.W[k], a = this.A[k], o = p * T + this.at[k];
          for (let j = 0; j < h; j++) J[o + m * h + j] = d[j];
          for (let i = 0; i < m; i++) {
            const ai = a[p * m + i];
            let s = 0;
            for (let j = 0; j < h; j++) { J[o + i * h + j] = ai * d[j]; s += W[i * h + j] * d[j]; }
            prev[i] = k > 0 ? s * dact(this.Z[k - 1][p * m + i]) : 0;
          }
          [d, prev] = [prev, d];
        }
      }
      return J;
    }
    // each hidden node's value at every point (after forward): node(k, j)[p], k = 0 for the first hidden layer
    node(k, j) {
      const h = this.sizes[k + 1], a = this.A[k + 1], n = a.length / h, v = new Float64Array(n);
      for (let p = 0; p < n; p++) v[p] = a[p * h + j];
      return v;
    }
    get count() { return this.params.length; }
  }

  // ---------------------------------------------------------------- optimizer
  // Set the output layer to its least-squares best for the current hidden layers; returns the
  // mean squared error, the features [last hidden layer, 1], and their Gram matrix.
  function solveOutput(net, xs, ys) {
    const n = xs.length, L = net.L, h = net.sizes[L - 1], k = h + 1;
    net.forward(xs);
    const F = new Float64Array(n * k), A = new Float64Array(k * k), r = new Float64Array(k);
    const H = net.A[L - 1];
    for (let p = 0; p < n; p++) { for (let j = 0; j < h; j++) F[p * k + j] = H[p * h + j]; F[p * k + h] = 1; }
    for (let p = 0; p < n; p++) {
      for (let a = 0; a < k; a++) {
        const fa = F[p * k + a];
        r[a] += fa * ys[p];
        for (let c = 0; c <= a; c++) A[a * k + c] += fa * F[p * k + c];
      }
    }
    let tr = 0;
    for (let a = 0; a < k; a++) tr += A[a * k + a];
    for (let a = 0; a < k; a++) { for (let c = 0; c < a; c++) A[c * k + a] = A[a * k + c]; A[a * k + a] += 1e-10 * tr / k; }
    const c = O.solveSPD(A, r, k);
    net.W[L - 1].set(c.subarray(0, h));
    net.b[L - 1][0] = c[h];
    const out = (net.out = new Float64Array(n));
    let e = 0;
    for (let p = 0; p < n; p++) {
      let s = 0;
      for (let a = 0; a < k; a++) s += F[p * k + a] * c[a];
      out[p] = s;
      e += (s - ys[p]) ** 2;
    }
    return { loss: e / n, F, G: A, k, r };
  }

  // Cholesky factor of a symmetric positive definite k x k matrix, for solving with it many times
  function cholesky(A, k) {
    const L = new Float64Array(k * k);
    for (let i = 0; i < k; i++) {
      for (let j = 0; j <= i; j++) {
        let s = A[i * k + j];
        for (let q = 0; q < j; q++) s -= L[i * k + q] * L[j * k + q];
        L[i * k + j] = i === j ? Math.sqrt(Math.max(s, 1e-12)) : s / L[j * k + j];
      }
    }
    return L;
  }
  function cholSolve(L, b, k) {   // in place
    for (let i = 0; i < k; i++) { let s = b[i]; for (let q = 0; q < i; q++) s -= L[i * k + q] * b[q]; b[i] = s / L[i * k + i]; }
    for (let i = k - 1; i >= 0; i--) { let s = b[i]; for (let q = i + 1; q < k; q++) s -= L[q * k + i] * b[q]; b[i] = s / L[i * k + i]; }
    return b;
  }

  // opts.respawn (one hidden layer only): when progress stalls, move a node (see respawn), and if
  // that hasn't helped 10 steps later, go back to the best fit so far; not once the loss is below
  // opts.good (default 1e-3), which should be above what the data's noise allows. opts.rng: random numbers.
  function mse(net, data) {
    const out = net.forward(data.xs);
    let e = 0;
    for (let p = 0; p < out.length; p++) e += (out[p] - data.ys[p]) ** 2;
    return e / out.length;
  }

  class Fitter {
    constructor(net, data, opts) {
      this.net = net; this.data = data; this.opts = opts || {};
      this.u = this.opts.rng || O.rng();
      this.lambda = 1e-3;
      this.loss = mse(net, data);   // (the output layer is solved at the first step, not before)
      this.steps = 0; this.checkpoint = this.loss;
      this.best = { loss: this.loss, params: Float64Array.from(net.params) };
      this.moved = false;
    }
    // one step, plus the respawning bookkeeping every 10 steps; returns the loss
    advance() {
      this.step();
      if (!this.opts.respawn || ++this.steps % 10 !== 0) return this.loss;
      if (this.loss < this.best.loss) this.best = { loss: this.loss, params: Float64Array.from(this.net.params) };
      else if (this.moved) this.restore();
      this.moved = false;
      if (this.loss > (this.opts.good || 1e-3) && this.loss > 0.9 * this.checkpoint) { this.respawn(); this.moved = true; }
      this.checkpoint = this.loss;
      return this.loss;
    }
    restore() {
      this.net.params.set(this.best.params);
      this.lambda = 1e-3;
      this.loss = solveOutput(this.net, this.data.xs, this.data.ys).loss;
    }
    // one step; returns the mean squared error
    step() {
      const net = this.net, { xs, ys } = this.data, n = xs.length, T = net.nHidden;
      const { loss: E0, F, G, k } = solveOutput(net, xs, ys);
      const out = net.out, J = net.jacobian(n);
      // remove from J what the output layer can do by itself (it is re-solved after every move)
      const FJ = new Float64Array(k * T);
      for (let p = 0; p < n; p++) for (let i = 0; i < k; i++) { const f = F[p * k + i]; if (f) for (let a = 0; a < T; a++) FJ[i * T + a] += f * J[p * T + a]; }
      const X = new Float64Array(k * T), col = new Float64Array(k), LG = cholesky(G, k);
      for (let a = 0; a < T; a++) {
        for (let i = 0; i < k; i++) col[i] = FJ[i * T + a];
        cholSolve(LG, col, k);
        for (let i = 0; i < k; i++) X[i * T + a] = col[i];
      }
      for (let p = 0; p < n; p++) for (let i = 0; i < k; i++) { const f = F[p * k + i]; if (f) for (let a = 0; a < T; a++) J[p * T + a] -= f * X[i * T + a]; }
      // Gauss-Newton system
      const A = new Float64Array(T * T), g = new Float64Array(T);
      for (let p = 0; p < n; p++) {
        const r = ys[p] - out[p], o = p * T;
        for (let a = 0; a < T; a++) {
          const ja = J[o + a];
          if (!ja) continue;
          g[a] += ja * r;
          for (let b = 0; b <= a; b++) A[a * T + b] += ja * J[o + b];
        }
      }
      for (let a = 0; a < T; a++) for (let b = 0; b < a; b++) A[b * T + a] = A[a * T + b];
      const save = Float64Array.from(net.params), B = new Float64Array(T * T);
      for (let tries = 0; tries < 14; tries++) {
        B.set(A);
        for (let a = 0; a < T; a++) B[a * T + a] += this.lambda * (A[a * T + a] + 1e-12);
        const dp = O.solveSPD(B, g, T);
        for (let a = 0; a < T; a++) net.params[a] = save[a] + dp[a];
        const E1 = solveOutput(net, xs, ys).loss;
        if (E1 < E0) { this.lambda = Math.max(1e-9, this.lambda / 5); return (this.loss = E1); }
        this.lambda = Math.min(1e6, this.lambda * 5);
      }
      net.params.set(save);
      return (this.loss = solveOutput(net, xs, ys).loss);
    }
    // One hidden layer only: move one of the nodes the fit needs least to where the error is
    // large (like Demo 2.4's respawning). Out of a dead end, things may get worse before better.
    respawn() {
      const net = this.net, { xs, ys } = this.data, n = xs.length, H = net.sizes[1];
      const W0 = net.W[0], b0 = net.b[0];
      // the node needed least: the one whose removal (with the output layer re-solved) costs the
      // least, which catches pairs of nodes on top of each other, doing the work of one
      const { G, k, r } = solveOutput(net, xs, ys), g = new Float64Array((k - 1) * (k - 1)), rr = new Float64Array(k - 1);
      const keep = [];   // [what the others still explain, node], for each node
      for (let j = 0; j < H; j++) {
        for (let a = 0, a2 = 0; a < k; a++) {
          if (a === j) continue;
          rr[a2] = r[a];
          for (let c = 0, c2 = 0; c < k; c++) if (c !== j) g[a2 * (k - 1) + c2++] = G[a * k + c];
          a2++;
        }
        const c = O.solveSPD(g, rr, k - 1);
        let explained = 0;   // how much of the data's variance the others still account for
        for (let a = 0; a < k - 1; a++) explained += c[a] * rr[a];
        keep.push([explained, j]);
      }
      keep.sort((a, b) => b[0] - a[0]);
      const weak = keep[Math.floor(this.u() * 3)][1];   // one of the 3 needed least
      // a place where the error is large: squared error blurred over 5 points, as a probability
      const out = net.forward(xs), E = new Float64Array(n);
      let total = 0;
      for (let p = 2; p < n - 2; p++) {
        for (let q = p - 2; q <= p + 2; q++) E[p] += (out[q] - ys[q]) ** 2;
        E[p] = E[p] ** 2;   // (squared again, to favor the largest errors)
        total += E[p];
      }
      let p = 0;
      for (let left = this.u() * total; p < n - 1 && (left -= E[p]) > 0;) p++;
      b0[weak] = -W0[weak] * xs[p];
      this.lambda = 1e-3;
      return (this.loss = solveOutput(net, xs, ys).loss);
    }
  }

  // ---------------------------------------------------------------- starting points
  // One hidden layer: corners at random places spread over [-1, 1] (one in each 1/H of it, like
  // Demo 2.4's jittered grid), facing random directions; small output weights.
  function randomStart(net, u) {
    const H = net.sizes[1];
    for (let j = 0; j < H; j++) {
      const w = (u() < 0.5 ? -1 : 1) * 16 * (0.5 + u());
      net.W[0][j] = w;
      net.b[0][j] = -w * (-1 + 2 * (j + u()) / H);
      net.W[1][j] = 0.005 * u.normal();   // (each node's value reaches ~30 at the far end)
    }
    net.b[1][0] = 0;
  }

  // Two nodes per layer: each layer's nodes are a pair of ReLUs facing opposite directions with
  // their corners together, near the middle of the range of what comes in, so the next layer can
  // add them into a V that folds that range in half. 2^folds pieces need `folds` folds; layers past
  // that start as pass-throughs (the next layer subtracts the pair instead: a straight line).
  // `nudge` moves each corner and scales each weight randomly by about that fraction, which is
  // all the optimizer can recover from: the folds stack, so each one's error is doubled by every
  // layer after it. RANGE (the span of each layer's pre-activations) keeps the soft corners sharp.
  const RANGE = 8;
  function foldStart(net, xs, u, nudge, folds) {
    const n = xs.length;
    let dir = [1];
    for (let k = 0; k + 1 < net.L; k++) {
      net.forward(xs);
      const a = net.A[k], m = net.sizes[k], h = net.sizes[k + 1], W = net.W[k], b = net.b[k];
      let lo = Infinity, hi = -Infinity;
      for (let p = 0; p < n; p++) {
        let z = 0;
        for (let i = 0; i < m; i++) z += a[p * m + i] * dir[i];
        lo = Math.min(lo, z); hi = Math.max(hi, z);
      }
      const sc = RANGE / (hi - lo), t = lo + (hi - lo) * (0.5 + nudge * (2 * u() - 1));
      for (let j = 0; j < h; j++) {
        const s = j === 0 ? 1 : -1;
        for (let i = 0; i < m; i++) W[i * h + j] = s * sc * dir[i] * (1 + nudge * u.normal());
        b[j] = -s * sc * t;
      }
      dir = k < folds ? [1, 1] : [1, -1];
    }
    const k = net.L - 1;
    for (let i = 0; i < net.sizes[k]; i++) net.W[k][i] = 0.1 * u.normal();
    net.b[k][0] = 0;
  }

  const api = { sawtooth, MLP, Fitter, randomStart, foldStart };
  if (typeof module !== "undefined") module.exports = api; else window.Saw = api;
})();
