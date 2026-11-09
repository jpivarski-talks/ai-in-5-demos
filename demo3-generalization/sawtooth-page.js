// The two sawtooth pages of Demo 3 (see sawtooth.js for the data, the network, and its optimizer):
// a wide plot of the data and the fit on top, the network below it, the loss at the right, and
// "new start", "optimize", and a number field for the size of the network in the controls.
//   SawPage.run({ kind: "wide" })   one hidden layer; the number field sets its number of nodes
//   SawPage.run({ kind: "deep" })   two nodes per layer; the number field sets the number of layers
// On both, a checkbox makes the teeth unequal ("asymmetric").
(function () {
  "use strict";
  const C = Stage.COLORS, D = NNDiagram;

  const CFG = {
    pieces: 32, perPiece: 8,   // 32 straight segments (16 teeth), 8 points each
    noise: 0.04,               // width of the Gaussian noise on each point
    noiseSeed: 4242,           // the same noise every time
    asymSeed: 777,             // the unequal teeth are always the same ones; change this for others
    grid: 400,                 // points along x for drawing curves
    wide: { nodes: 32, min: 1, max: 64, xSpan: 300, framesPerStep: 1 },
    deep: { layers: 5, min: 1, max: 6, xSpan: 60, framesPerStep: 4, nudge: 0.008 },
  };
  // curves in the layers' boxes: a different color for each node, the same one whatever the number
  // of layers (orange is for the fit, blue for the data)
  const NODE_COLORS = ["#2ca02c", "#9467bd", "#d62728", "#8c564b", "#e377c2", "#17becf",
    "#bcbd22", "#1f3a93", "#7f7f7f", "#00796b", "#222222", "#d4b000"];

  function run(opts) {
    const wide = opts.kind === "wide", K = wide ? CFG.wide : CFG.deep;
    const folds = Math.round(Math.log2(CFG.pieces));
    const M = Stage.L.main;
    const panel = new Stage.Panel(M);
    const FIT = { x: 64, y: 0, w: M.w - 64, h: 300 };   // room for "f(x)" at the left and "x" below
    const ax = new Plots.Axes(panel, FIT, [-1.02, 1.02], [-1.3, 1.3]);
    const NET = { x: 0, y: 370, w: M.w, h: M.h - 370 };
    const readout = new Plots.Readout();
    const history = new Plots.History({ mode: "line", xSpan: K.xSpan, yLabel: "loss", xLabel: "iteration" });

    const noise = () => ({ sd: CFG.noise, rng: Optim.rng(CFG.noiseSeed) });
    const datasets = {
      even: Saw.sawtooth(CFG.pieces, CFG.perPiece, noise()),
      uneven: Saw.sawtooth(CFG.pieces, CFG.perPiece, noise(), Optim.rng(CFG.asymSeed)),
    };
    let data = datasets.even;
    const gx = Float64Array.from({ length: CFG.grid }, (_, i) => -1 + 2 * i / (CFG.grid - 1));
    let size = wide ? K.nodes : K.layers, net = null, fitter = null, running = false, frame = 0, view = null;
    const u = Optim.rng();

    function newStart() {
      net = new Saw.MLP(wide ? [1, size, 1] : [1, ...Array(size).fill(2), 1]);
      if (wide) Saw.randomStart(net, u);
      else Saw.foldStart(net, data.xs, u, K.nudge, folds);
      newFitter();
    }
    function newFitter() {
      // (no more respawning once the fit is about as good as the noise allows: a little above the
      // loss of the noiseless curve itself, so that even missing one of the small teeth is too much)
      fitter = new Saw.Fitter(net, data, { respawn: wide, rng: u, good: data.noiseLoss + 3e-4 });
      history.clear();
      history.push(fitter.loss);
      history.draw();
      readout.set(fitter.loss.toFixed(3));
      readout.setSub(net.count + " parameters");
      computeView();
    }
    function computeView() {
      const out = Float64Array.from(net.forward(gx));
      const nodes = [];
      for (let k = 0; k + 1 < net.L; k++) nodes.push(Array.from({ length: net.sizes[k + 1] }, (_, j) => net.node(k, j)));
      view = { out, nodes };
    }

    // ---------------------------------------------------------------- drawing
    // a box with a small plot of a curve over x (scaled to fit the box)
    function curveBox(c, x, y, w, h, vals, color) {
      c.fillStyle = "#fff";
      c.fillRect(x, y, w, h);
      let lo = Infinity, hi = -Infinity;
      for (const v of vals) { lo = Math.min(lo, v); hi = Math.max(hi, v); }
      const pad = 6, span = Math.max(hi - lo, 1e-9);
      c.beginPath();
      for (let i = 0; i < vals.length; i++) {
        const px = x + pad + (w - 2 * pad) * i / (vals.length - 1), py = y + h - pad - (h - 2 * pad) * (vals[i] - lo) / span;
        if (i === 0) c.moveTo(px, py); else c.lineTo(px, py);
      }
      c.strokeStyle = color || C.ink;
      c.lineWidth = 2;
      c.lineJoin = "round";
      c.stroke();
      c.strokeStyle = "#888";
      c.lineWidth = 1.5;
      c.strokeRect(x, y, w, h);
    }

    // the data (blue) and the fit (orange), styled like the other fits (e.g. logistic-terms.html)
    function drawFit(c) {
      c.strokeStyle = "#bbb"; c.lineWidth = 1.5;
      c.strokeRect(FIT.x + 0.75, FIT.y + 0.75, FIT.w - 1.5, FIT.h - 1.5);
      ax.clip(() => {
        c.fillStyle = C.blue; c.strokeStyle = "#fff"; c.lineWidth = 1;
        for (let i = 0; i < data.xs.length; i++) {
          c.beginPath(); c.arc(ax.X(data.xs[i]), ax.Y(data.ys[i]), 3.5, 0, 2 * Math.PI); c.fill(); c.stroke();
        }
        ax.curve(gx, view.out, { color: C.orange, width: 4 });
      });
      c.fillStyle = "#000";
      c.font = `italic 25px ${C.font}`;
      c.textBaseline = "alphabetic";
      c.textAlign = "center"; c.fillText("x", FIT.x + FIT.w / 2, FIT.y + FIT.h + 30);
      c.textAlign = "right"; c.fillText("f(x)", FIT.x - 8, FIT.y + FIT.h / 2 + 9);
    }

    function drawWide(c) {
      const H = net.sizes[1], mid = NET.y + NET.h / 2, BW = 120, BH = 72;
      const inX = 60, hidX = 470, outX = NET.w - 60 - BW - 120;
      const sp = Math.min(30, (NET.h - 60) / H), rad = Math.max(2, Math.min(8, sp * 0.38));
      const ys = D.stack(H, mid, sp);
      const W0 = net.W[0], W1 = net.W[1], m0 = D.maxAbs(W0), m1 = D.maxAbs(W1);
      const lw = Math.max(1, Math.min(3, sp / 6));
      for (let j = 0; j < H; j++) {
        D.edge(c, inX + BW, mid, hidX - rad, ys[j], W0[j], m0, lw);
        D.edge(c, hidX + rad, ys[j], outX, mid, W1[j], m1, lw);
      }
      curveBox(c, inX, mid - BH / 2, BW, BH, gx);
      D.nodeLabel(c, "x", inX - 10, mid - 15, "right");
      c.fillStyle = "#666";
      for (let j = 0; j < H; j++) { c.beginPath(); c.arc(hidX, ys[j], rad, 0, 2 * Math.PI); c.fill(); }
      curveBox(c, outX, mid - BH / 2, BW, BH, view.out, C.orange);
      D.arrow(c, outX + BW + 10, mid, outX + BW + 90, mid, C.orange);
      D.nodeLabel(c, "f(x)", outX + BW + 100, mid - 15, "left");
      layerCaption(c, hidX, NET.y + NET.h - 2, H + (H === 1 ? " node" : " nodes"));
    }

    // Columns are laid out for the most layers (CFG.deep.max), so that changing the number of
    // layers only moves the output box: each layer stays where it was.
    function drawDeep(c) {
      const L = net.L - 1, mid = NET.y + NET.h / 2, BW = 80, BH = 64, ys = D.stack(2, mid, BH + 60);
      const left = 40 + BW / 2, step = (NET.w - 70 - BW / 2 - left) / (CFG.deep.max + 1);
      const cx = (i) => left + step * i;   // column centers: x, the layers, the output
      // edges first, under the boxes. Between two layers, the edge from the node at the same height
      // goes straight across, and the one crossing over from the other node arrives a little to the
      // side it comes from, so the two are clearly separate lines; likewise the two into the output.
      const GAP = 14;
      for (let k = 0; k <= L; k++) {
        const W = net.W[k], m = net.sizes[k], h = net.sizes[k + 1], wm = D.maxAbs(W);
        const from = m === 1 ? [mid] : ys, to = h === 1 ? [mid] : ys;
        for (let i = 0; i < m; i++) for (let j = 0; j < h; j++) {
          const side = i === 0 ? -1 : 1;
          const dy = m === 1 ? 0 : h === 1 ? side * GAP / 2 : i !== j ? side * GAP : 0;
          D.edge(c, cx(k) + BW / 2, from[i], cx(k + 1) - BW / 2, to[j] + dy, W[i * h + j], wm);
        }
      }
      curveBox(c, cx(0) - BW / 2, mid - BH / 2, BW, BH, gx);
      D.nodeLabel(c, "x", cx(0) - BW / 2 - 10, mid - 15, "right");
      for (let k = 0; k < L; k++) {
        for (let j = 0; j < 2; j++) curveBox(c, cx(k + 1) - BW / 2, ys[j] - BH / 2, BW, BH, view.nodes[k][j], NODE_COLORS[2 * k + j]);
        layerCaption(c, cx(k + 1), ys[1] + BH / 2 + 32, "layer " + (k + 1));
      }
      curveBox(c, cx(L + 1) - BW / 2, mid - BH / 2, BW, BH, view.out, C.orange);
      D.nodeLabel(c, "f(x)", cx(L + 1) + BW / 2 + 10, mid - 15, "left");
    }

    function layerCaption(c, x, y, text) {
      c.fillStyle = C.grey;
      c.font = `18px ${C.font}`;
      c.textAlign = "center";
      c.textBaseline = "bottom";
      c.fillText(text, x, y);
    }

    function draw() {
      const c = panel.clear();
      drawFit(c);
      if (wide) drawWide(c); else drawDeep(c);
    }

    // ---------------------------------------------------------------- controls
    function stop() { running = false; trainButton.textContent = "optimize"; trainButton.classList.remove("on"); }
    function train() {
      if (running) { stop(); return; }
      running = true;
      trainButton.textContent = "stop";
      trainButton.classList.add("on");
    }

    const bar = Stage.controls();
    Stage.button("new start", () => { stop(); newStart(); }, bar);
    const trainButton = Stage.button("optimize", train, bar, { cls: "primary" });
    Stage.el("div", { style: { width: "30px" } }, bar);
    const field = Stage.el("label", { class: "field", text: wide ? "nodes" : "layers" }, bar);
    const num = Stage.el("input", { class: "knob", type: "number", name: "size", min: K.min, max: K.max, step: 1, value: size, style: { width: "90px" } }, field);
    num.addEventListener("change", () => {
      const v = Math.round(+num.value);
      size = Optim.clamp(isFinite(v) ? v : size, K.min, K.max);
      num.value = size;
      num.blur();
      stop();
      newStart();
    });
    num.addEventListener("keydown", (e) => { if (e.key === "Enter") num.blur(); });
    Stage.el("div", { style: { width: "10px" } }, bar);
    const check = Stage.el("label", { class: "field" }, bar);
    const box = Stage.el("input", { type: "checkbox", name: "asymmetric" }, check);
    Stage.el("span", { text: "asymmetric" }, check);
    box.addEventListener("change", () => {
      box.blur();
      stop();
      data = box.checked ? datasets.uneven : datasets.even;
      newFitter();   // same network, new data
    });
    // space bar: optimize / stop (unless typing in the number field)
    document.addEventListener("keydown", (e) => {
      if (e.key !== " " || e.target === num) return;
      e.preventDefault();
      train();
    });

    newStart();
    Stage.loop(() => {
      if (running && ++frame % K.framesPerStep === 0) {
        history.push(fitter.advance());
        computeView();
        readout.set(fitter.loss.toFixed(3));
        history.draw();
      }
      draw();
    });

    return { CFG, get net() { return net; }, get fitter() { return fitter; }, history, train, newStart,
      get data() { return data; }, setSize: (n) => { num.value = n; num.dispatchEvent(new Event("change")); } };
  }

  window.SawPage = { run, CFG };
})();
