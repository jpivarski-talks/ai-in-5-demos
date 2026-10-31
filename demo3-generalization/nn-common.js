// Shared pieces for Demo 3: datasets, a small TF.js multilayer network,
// and playground-style drawing of classification regions.
(function () {
  "use strict";
  const C = Stage.COLORS;

  // class colors (as RGB) and their light background versions
  const CLASS_RGB = [[245, 147, 34], [8, 119, 189], [76, 160, 70]];
  const BG_RGB = CLASS_RGB.map((c) => c.map((v) => Math.round(v + (255 - v) * 0.55)));
  const classColor = (k) => `rgb(${CLASS_RGB[k].join(",")})`;

  // ---------------------------------------------------------------- datasets
  // XOR: four noisy, partly overlapping blobs
  function xor(n, u) {
    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      const sx = u() < 0.5 ? -1 : 1, sy = u() < 0.5 ? -1 : 1;
      xs.push([0.45 * sx + 0.27 * u.normal(), 0.45 * sy + 0.27 * u.normal()]);
      ys.push(sx * sy > 0 ? 1 : 0);
    }
    return { xs, ys };
  }

  // a disk inside an annulus
  function circle(n, u) {
    const xs = [], ys = [];
    for (let i = 0; i < n; i++) {
      const inner = i % 2 === 0;
      const r = inner ? 0.35 * Math.sqrt(u()) : 0.6 + 0.3 * u();
      const t = 2 * Math.PI * u();
      xs.push([r * Math.cos(t) + 0.02 * u.normal(), r * Math.sin(t) + 0.02 * u.normal()]);
      ys.push(inner ? 1 : 0);
    }
    return { xs, ys };
  }

  // three spiral arms (as in the gist: 300 per class, angle noise 0.2)
  function spirals(nPer, u) {
    const xs = [], ys = [], K = 3;
    for (let c = 0; c < K; c++) {
      for (let i = 0; i < nPer; i++) {
        const t = i / (nPer - 1);
        const a = (2 * Math.PI / K) * (c + 2 * t) + 0.2 * u.normal();
        xs.push([t * Math.sin(a), t * Math.cos(a)]);
        ys.push(c);
      }
    }
    return { xs, ys };
  }

  // ---------------------------------------------------------------- model
  // layers: [{W: tf.Variable [nin, nout], b: tf.Variable [nout], act}]
  class MLP {
    constructor(spec) {
      this.layers = spec.map((s) => ({
        W: tf.variable(s.W), b: tf.variable(s.b), act: s.act || "linear",
      }));
    }
    vars() { return this.layers.flatMap((l) => [l.W, l.b]); }
    // returns the activations of every layer (index 0 = input)
    forwardAll(x) {
      const outs = [x];
      let h = x;
      for (const l of this.layers) {
        h = tf.add(tf.matMul(h, l.W), l.b);
        if (l.act === "relu") h = tf.relu(h);
        else if (l.act === "tanh") h = tf.tanh(h);
        else if (l.act === "sigmoid") h = tf.sigmoid(h);
        outs.push(h);
      }
      return outs;
    }
    forward(x) { const o = this.forwardAll(x); return o[o.length - 1]; }
    dispose() { for (const v of this.vars()) v.dispose(); }
    weights() { return this.layers.map((l) => ({ W: l.W.arraySync(), b: l.b.arraySync() })); }
  }

  function randn(shape, std, u) {
    const n = shape.reduce((a, b) => a * b, 1), a = new Float32Array(n);
    for (let i = 0; i < n; i++) a[i] = std * u.normal();
    return tf.tensor(a, shape);
  }

  // ---------------------------------------------------------------- grid evaluation
  // regular grid of G x G points covering [lo, hi]^2 (row 0 at the top)
  function grid(G, lo, hi) {
    const a = new Float32Array(G * G * 2);
    for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
      a[2 * (j * G + i)] = lo + (hi - lo) * (i + 0.5) / G;
      a[2 * (j * G + i) + 1] = hi - (hi - lo) * (j + 0.5) / G;
    }
    return tf.tensor(a, [G * G, 2]);
  }

  // paint class probabilities into an offscreen canvas and draw it into rect r
  // probs: Float32Array of G*G (binary: P(class 1)) or G*G*K (multiclass)
  function paintRegions(ctx, r, probs, G, K, sharp) {
    const off = paintRegions.off || (paintRegions.off = document.createElement("canvas"));
    off.width = G; off.height = G;
    const oc = off.getContext("2d"), img = oc.createImageData(G, G);
    for (let p = 0; p < G * G; p++) {
      let rgb;
      if (K === 1) {
        // orange -> white -> blue, like the playground
        const q = probs[p], t = Math.abs(2 * q - 1), k = q > 0.5 ? 1 : 0, s = sharp ? Math.min(1, t * 1.6) : t;
        rgb = [0, 1, 2].map((c) => 255 + (BG_RGB[k][c] - 255) * s);
      } else {
        rgb = [0, 0, 0];
        for (let k = 0; k < K; k++) for (let c = 0; c < 3; c++) rgb[c] += probs[p * K + k] * BG_RGB[k][c];
      }
      img.data[4 * p] = rgb[0]; img.data[4 * p + 1] = rgb[1]; img.data[4 * p + 2] = rgb[2]; img.data[4 * p + 3] = 255;
    }
    oc.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, r.x, r.y, r.w, r.h);
  }

  // smooth lines where the most likely class changes (marching squares on each
  // class's margin p_k - max_{j != k} p_j), drawn into rect r
  function drawContours(ctx, r, probs, G, K, opts) {
    opts = opts || {};
    const f = new Float32Array(G * G);
    const X = (i) => r.x + (i + 0.5) / G * r.w, Y = (j) => r.y + (j + 0.5) / G * r.h;
    ctx.beginPath();
    for (let k = 0; k < K; k++) {
      for (let p = 0; p < G * G; p++) {
        let other = -Infinity;
        for (let q = 0; q < K; q++) if (q !== k) other = Math.max(other, probs[p * K + q]);
        f[p] = probs[p * K + k] - other;
      }
      for (let j = 0; j < G - 1; j++) for (let i = 0; i < G - 1; i++) {
        const a = f[j * G + i], b = f[j * G + i + 1], c = f[(j + 1) * G + i + 1], d = f[(j + 1) * G + i];
        // crossing points on the four cell edges (top, right, bottom, left)
        const pts = [];
        if ((a > 0) !== (b > 0)) pts.push([X(i + a / (a - b)), Y(j)]);
        if ((b > 0) !== (c > 0)) pts.push([X(i + 1), Y(j + b / (b - c))]);
        if ((d > 0) !== (c > 0)) pts.push([X(i + d / (d - c)), Y(j + 1)]);
        if ((a > 0) !== (d > 0)) pts.push([X(i), Y(j + a / (a - d))]);
        for (let s = 0; s + 1 < pts.length; s += 2) { ctx.moveTo(pts[s][0], pts[s][1]); ctx.lineTo(pts[s + 1][0], pts[s + 1][1]); }
      }
    }
    ctx.strokeStyle = opts.color || "rgba(0, 0, 0, 0.85)";
    ctx.lineWidth = opts.width || 1.6;
    ctx.lineJoin = "round";
    ctx.stroke();
  }

  function drawPoints(ax, xs, ys, opts) {
    opts = opts || {};
    const c = ax.p.ctx, rad = opts.r || 5;
    c.lineWidth = opts.lw || 1.3;
    for (let i = 0; i < xs.length; i++) {
      c.fillStyle = classColor(ys[i]);
      c.strokeStyle = opts.edge || "#fff";
      c.beginPath(); c.arc(ax.X(xs[i][0]), ax.Y(xs[i][1]), rad, 0, 2 * Math.PI); c.fill(); c.stroke();
    }
  }

  // binary cross-entropy (mean) for sigmoid outputs p and labels y
  function bce(p, y) {
    const e = 1e-6;
    return tf.neg(tf.mean(tf.add(tf.mul(y, tf.log(tf.add(p, e))), tf.mul(tf.sub(1, y), tf.log(tf.add(tf.sub(1, p), e))))));
  }

  window.NN = { xor, circle, spirals, MLP, randn, grid, paintRegions, drawContours, drawPoints, bce, classColor, CLASS_RGB, BG_RGB };
})();
