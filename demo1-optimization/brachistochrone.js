// Physics of a frictionless ball on a slide made of 16 straight segments.
// Works in the browser (window.Brach) and in node (for tuning tests).
(function (root) {
  "use strict";

  const Lx = 2.0;         // horizontal span (world units)
  const Ly = 1.0;         // drop from start to end
  const N = 15;           // free nodes between the fixed endpoints
  const G = 7.054;        // gravity, chosen so the true cycloid takes 0.95 s
  const BALL_R = 0.032;   // ball radius
  const Y_MIN = -1.45;    // lowest allowed node height
  const nodeX = Array.from({ length: N }, (_, i) => (i + 1) * Lx / (N + 1));

  // ---------------------------------------------------------------- the curve
  // The linestring's corners are rounded by small quadratic Bezier fillets so the
  // tangent (and hence the normal force) never jumps. Returns a dense arc-length
  // table {x, y, s, total, line0} where line0 is the straight run from the start.
  function buildCurve(heights) {
    const P = [[0, 0]];
    for (let i = 0; i < N; i++) P.push([nodeX[i], heights[i]]);
    P.push([Lx, -Ly]);
    const nseg = P.length - 1;
    const len = [], dir = [];
    for (let i = 0; i < nseg; i++) {
      const dx = P[i + 1][0] - P[i][0], dy = P[i + 1][1] - P[i][1];
      const l = Math.hypot(dx, dy);
      len.push(l);
      dir.push([dx / l, dy / l]);
    }
    // tangent length of the fillet at each interior corner
    const t = new Array(P.length).fill(0);
    for (let i = 1; i < nseg; i++) {
      const a = dir[i - 1], b = dir[i];
      const cos = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1]));
      const turn = Math.acos(cos);
      const short = Math.min(len[i - 1], len[i]);
      const want = Math.max(1.3 * BALL_R * Math.tan(turn / 2), 0.2 * short);
      t[i] = Math.min(want, 0.45 * short);
    }
    const xs = [], ys = [];
    const push = (x, y) => { xs.push(x); ys.push(y); };
    const lineTo = (x0, y0, x1, y1, first) => {
      const l = Math.hypot(x1 - x0, y1 - y0);
      const n = Math.max(1, Math.ceil(l / 0.004));
      for (let k = first ? 0 : 1; k <= n; k++) push(x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n);
    };
    let cur = P[0], line0 = 0;
    for (let i = 1; i <= nseg; i++) {
      const d = dir[i - 1];
      const end = i < nseg ? [P[i][0] - d[0] * t[i], P[i][1] - d[1] * t[i]] : P[i];
      lineTo(cur[0], cur[1], end[0], end[1], i === 1);
      if (i === 1) line0 = Math.hypot(end[0] - cur[0], end[1] - cur[1]);
      if (i < nseg) {
        const e = dir[i];
        const q = [P[i][0] + e[0] * t[i], P[i][1] + e[1] * t[i]];
        const n = 16;
        for (let k = 1; k <= n; k++) {
          const u = k / n, a = (1 - u) * (1 - u), b = 2 * u * (1 - u), c = u * u;
          push(a * end[0] + b * P[i][0] + c * q[0], a * end[1] + b * P[i][1] + c * q[1]);
        }
        cur = q;
      }
    }
    const s = new Float64Array(xs.length);
    for (let k = 1; k < xs.length; k++) s[k] = s[k - 1] + Math.hypot(xs[k] - xs[k - 1], ys[k] - ys[k - 1]);
    return { x: Float64Array.from(xs), y: Float64Array.from(ys), s, total: s[s.length - 1], line0, P };
  }

  // ---------------------------------------------------------------- fast time
  // time = integral of ds / v with v = sqrt(2 g (y0 - y)) (energy conservation)
  function travelTime(heights, curve) {
    const c = curve || buildCurve(heights);
    const { x, y, s } = c;
    // straight run from rest: exact
    let k = 1;
    while (k < s.length && s[k] <= c.line0 + 1e-12) k++;
    k--;
    const drop0 = -y[k];
    if (!(drop0 > 0)) return Infinity;
    let T = Math.sqrt(2 * s[k] * s[k] / (G * drop0));
    for (; k < s.length - 1; k++) {
      const h = -(y[k] + y[k + 1]) / 2;
      if (!(h > 1e-9)) return Infinity;
      T += (s[k + 1] - s[k]) / Math.sqrt(2 * G * h);
    }
    return T;
  }

  // ---------------------------------------------------------------- simulation
  // integrates s'' = -g dy/ds with RK4 (real momentum: it can slow, stop, roll back)
  class Sim {
    constructor(curve) {
      this.c = curve;
      this.reset();
    }
    reset() {
      this.s = 0; this.v = 0; this.t = 0; this.k = 0;
      this.done = false; this.finishTime = null; this.flying = null; this.stalled = false;
    }
    slope(s) {
      const S = this.c.s, Y = this.c.y;
      let k = this.k;
      while (k < S.length - 2 && S[k + 1] < s) k++;
      while (k > 0 && S[k] > s) k--;
      this.k = k;
      return (Y[k + 1] - Y[k]) / (S[k + 1] - S[k]);
    }
    acc(s) { return -G * this.slope(Math.max(0, Math.min(this.c.total, s))); }
    step(dt) {
      if (this.flying) { this.fly(dt); return; }
      const sub = Math.max(1, Math.ceil(dt / 2e-4)), h = dt / sub;
      for (let i = 0; i < sub; i++) {
        const s = this.s, v = this.v;
        const a1 = this.acc(s);
        const a2 = this.acc(s + 0.5 * h * v);
        const a3 = this.acc(s + 0.5 * h * (v + 0.5 * h * a1));
        const a4 = this.acc(s + h * (v + 0.5 * h * a2));
        const ns = s + h / 6 * (v + 2 * (v + 0.5 * h * a1) + 2 * (v + 0.5 * h * a2) + (v + h * a3));
        const nv = v + h / 6 * (a1 + 2 * a2 + 2 * a3 + a4);
        if (ns >= this.c.total) {
          const frac = (this.c.total - s) / Math.max(1e-12, ns - s);
          this.finishTime = this.t + frac * h;
          this.t += h;
          this.s = this.c.total;
          this.v = nv;
          this.startFlight();
          this.fly((1 - frac) * h + (sub - i - 1) * h);
          return;
        }
        if (ns < 0) { this.s = 0; this.v = 0; this.stalled = true; } else { this.s = ns; this.v = nv; }
        this.t += h;
      }
    }
    startFlight() {
      const { x, y } = this.c, n = x.length;
      const dx = x[n - 1] - x[n - 2], dy = y[n - 1] - y[n - 2], l = Math.hypot(dx, dy);
      const p = this.contact();
      this.flying = { x: p.x, y: p.y, vx: this.v * dx / l, vy: this.v * dy / l, nx: -dy / l, ny: dx / l };
      this.done = true;
    }
    fly(dt) {
      const f = this.flying;
      f.x += f.vx * dt;
      f.y += f.vy * dt - 0.5 * G * dt * dt;
      f.vy -= G * dt;
      this.t += dt;
    }
    contact() {
      const S = this.c.s, X = this.c.x, Y = this.c.y, s = this.s;
      let k = this.k;
      while (k < S.length - 2 && S[k + 1] < s) k++;
      while (k > 0 && S[k] > s) k--;
      const u = (s - S[k]) / Math.max(1e-12, S[k + 1] - S[k]);
      const tx = X[k + 1] - X[k], ty = Y[k + 1] - Y[k], l = Math.hypot(tx, ty);
      return { x: X[k] + u * tx, y: Y[k] + u * ty, nx: -ty / l, ny: tx / l };
    }
    // center of the ball (it rides on top of the slide)
    ball() {
      if (this.flying) {
        const f = this.flying;
        return { x: f.x + BALL_R * f.nx, y: f.y + BALL_R * f.ny };
      }
      const p = this.contact();
      return { x: p.x + BALL_R * p.nx, y: p.y + BALL_R * p.ny };
    }
  }

  // smallest (normal force / weight) along the curve; negative means a real ball would fly off
  function minNormal(curve, skipFillets) {
    const { x, y } = curve;
    let worst = Infinity, where = 0;
    for (let k = 1; k < x.length - 1; k++) {
      const ax = x[k] - x[k - 1], ay = y[k] - y[k - 1], bx = x[k + 1] - x[k], by = y[k + 1] - y[k];
      const la = Math.hypot(ax, ay), lb = Math.hypot(bx, by);
      const cross = (ax * by - ay * bx) / (la * lb);
      const kappa = 2 * Math.asin(Math.max(-1, Math.min(1, cross))) / (la + lb); // >0 bends left (concave up)
      const tx = (ax / la + bx / lb) / 2, ty = (ay / la + by / lb) / 2, tl = Math.hypot(tx, ty);
      const ny = tx / tl;
      const v2 = 2 * G * Math.max(0, -y[k]);
      const n = ny + v2 * kappa / G;
      if (n < worst) { worst = n; where = x[k]; }
    }
    return { worst, where };
  }

  // ---------------------------------------------------------------- shapes
  function fromFunction(f) { return nodeX.map(f); }

  const PRESETS = {
    "linear": fromFunction((x) => -x * Ly / Lx),
    // steep in-run that bottoms out and turns up into a take-off lip
    "ski jump": fromFunction((x) => {
      const a = 1 / 2.8, c = -1 - 0.09 * a;
      return a * (x - 1.7) * (x - 1.7) + c;
    }),
    // two broad bumps the ball crosses slowly, then the final drop
    "two hills": null,
    "drop": fromFunction((x) => -Ly),
  };

  // a smooth curve through control points (Catmull-Rom), sampled at the node x's
  function spline(ctrl) {
    return (x) => {
      let i = 0;
      while (i < ctrl.length - 2 && ctrl[i + 1][0] < x) i++;
      const p0 = ctrl[Math.max(0, i - 1)], p1 = ctrl[i], p2 = ctrl[i + 1], p3 = ctrl[Math.min(ctrl.length - 1, i + 2)];
      const u = (x - p1[0]) / (p2[0] - p1[0]);
      const m1 = (p2[1] - p0[1]) / (p2[0] - p0[0]) * (p2[0] - p1[0]);
      const m2 = (p3[1] - p1[1]) / (p3[0] - p1[0]) * (p2[0] - p1[0]);
      const u2 = u * u, u3 = u2 * u;
      return (2 * u3 - 3 * u2 + 1) * p1[1] + (u3 - 2 * u2 + u) * m1 + (-2 * u3 + 3 * u2) * p2[1] + (u3 - u2) * m2;
    };
  }
  PRESETS["two hills"] = fromFunction(spline([
    // crests stay just below the start so a real ball wouldn't leave the track
    [0, 0], [0.218, -0.381], [0.593, -0.033], [0.814, -0.312], [1.276, -0.083], [1.775, -0.685], [2, -1],
  ]));

  // true cycloid from (0,0) to (Lx,-Ly)
  function cycloid(n) {
    // solve (phi - sin phi) / (1 - cos phi) = Lx / Ly
    let lo = 0.01, hi = 2 * Math.PI - 1e-6;
    for (let i = 0; i < 100; i++) {
      const m = (lo + hi) / 2;
      if ((m - Math.sin(m)) / (1 - Math.cos(m)) < Lx / Ly) lo = m; else hi = m;
    }
    const phi = (lo + hi) / 2, r = Ly / (1 - Math.cos(phi));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const p = phi * i / n;
      pts.push([r * (p - Math.sin(p)), -r * (1 - Math.cos(p))]);
    }
    return { pts, time: phi * Math.sqrt(r / G), heightAt: (x) => {
      // invert x(p) by bisection
      let a = 0, b = phi;
      for (let i = 0; i < 60; i++) { const m = (a + b) / 2; if (r * (m - Math.sin(m)) < x) a = m; else b = m; }
      return -r * (1 - Math.cos((a + b) / 2));
    } };
  }

  // random smooth shape: straight line plus random Chebyshev polynomials,
  // with the endpoints held fixed and every node kept below the start
  function randomShape(u) {
    const K = 6, c = [];
    for (let k = 1; k <= K; k++) c.push(u.normal() * 0.42 / Math.sqrt(k));
    const f = (x) => {
      const z = 2 * x / Lx - 1;
      let t0 = 1, t1 = z, sum = c[0] * z;
      for (let k = 2; k <= K; k++) { const t2 = 2 * z * t1 - t0; sum += c[k - 1] * t2; t0 = t1; t1 = t2; }
      return sum;
    };
    const f0 = f(0), f1 = f(Lx);
    return nodeX.map((x) => {
      const y = -x * Ly / Lx + f(x) - (f0 * (1 - x / Lx) + f1 * x / Lx);
      return Math.max(Y_MIN, Math.min(-0.04, y));
    });
  }

  const api = { Lx, Ly, N, G, BALL_R, Y_MIN, nodeX, buildCurve, travelTime, Sim, minNormal, PRESETS, cycloid, randomShape };
  if (typeof module !== "undefined") module.exports = api;
  else root.Brach = api;
})(typeof window !== "undefined" ? window : globalThis);
