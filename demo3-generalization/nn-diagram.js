// Network diagrams shared by Demo 3 pages 2 and 3: layers drawn as boxes (showing
// what each node computes over the input plane) or as columns of dots, connected
// by curved grey lines whose darkness shows the size of each weight, ending in
// arrows colored like the output classes.
(function () {
  "use strict";
  const C = Stage.COLORS;
  const BOX = 72;

  // greyscale picture of one node's value over the input plane (black = low, white = high)
  function featureBox(c, x, y, vals, G, stride, k, label, labelSide) {
    const off = featureBox.off || (featureBox.off = document.createElement("canvas"));
    off.width = G; off.height = G;
    const oc = off.getContext("2d"), img = oc.createImageData(G, G);
    let lo = Infinity, hi = -Infinity;
    for (let p = 0; p < G * G; p++) { const v = vals[p * stride + k]; lo = Math.min(lo, v); hi = Math.max(hi, v); }
    const m = Math.max(Math.abs(lo), Math.abs(hi), 1e-6);
    for (let p = 0; p < G * G; p++) {
      const g = 255 * (0.5 + 0.5 * vals[p * stride + k] / m);
      img.data[4 * p] = img.data[4 * p + 1] = img.data[4 * p + 2] = g;
      img.data[4 * p + 3] = 255;
    }
    oc.putImageData(img, 0, 0);
    c.imageSmoothingEnabled = true;
    c.drawImage(off, x, y, BOX, BOX);
    c.strokeStyle = "#888";
    c.lineWidth = 1.5;
    c.strokeRect(x, y, BOX, BOX);
    // label to the left of the box (inputs) or at the upper right (later layers)
    if (label && labelSide === "left") nodeLabel(c, label, x - 10, y + BOX / 2 - 15, "right");
    else if (label) nodeLabel(c, label, x + BOX + 6, y - 4, "left");
  }

  // italic label with an optional subscript, e.g. "h1" -> h with subscript 1
  function nodeLabel(c, label, x, y, align) {
    const m = label.match(/^([a-z]+)(\d*)$/);
    c.fillStyle = C.ink;
    c.textBaseline = "top";
    c.font = `italic 24px ${C.font}`;
    const base = m ? m[1] : label, sub = m ? m[2] : "";
    const wb = c.measureText(base).width;
    c.font = `18px ${C.font}`;
    const ws = sub ? c.measureText(sub).width : 0;
    let x0 = align === "left" ? x : align === "right" ? x - wb - ws : x - (wb + ws) / 2;
    c.font = `italic 24px ${C.font}`;
    c.textAlign = "left";
    c.fillText(base, x0, y);
    if (sub) { c.font = `18px ${C.font}`; c.fillText(sub, x0 + wb + 1, y + 10); }
  }

  // curved connection, darker for larger |w| (wmax: the largest |w| in that layer)
  function edge(c, x0, y0, x1, y1, w, wmax, width) {
    const t = Math.min(1, Math.abs(w) / (wmax || 1));
    c.strokeStyle = `rgba(40, 40, 40, ${0.04 + 0.8 * t})`;
    c.lineWidth = width || 3;
    const mx = (x0 + x1) / 2;
    c.beginPath(); c.moveTo(x0, y0); c.bezierCurveTo(mx, y0, mx, y1, x1, y1); c.stroke();
  }

  function arrow(c, x0, y0, x1, y1, color) {
    const a = Math.atan2(y1 - y0, x1 - x0), L = 18;
    c.strokeStyle = color;
    c.fillStyle = color;
    c.lineWidth = 7;
    c.lineCap = "round";
    c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1 - 0.6 * L * Math.cos(a), y1 - 0.6 * L * Math.sin(a)); c.stroke();
    c.lineCap = "butt";
    c.beginPath();
    c.moveTo(x1, y1);
    c.lineTo(x1 - L * Math.cos(a - 0.5), y1 - L * Math.sin(a - 0.5));
    c.lineTo(x1 - L * Math.cos(a + 0.5), y1 - L * Math.sin(a + 0.5));
    c.closePath();
    c.fill();
  }

  // vertical positions of n items centered on mid with the given spacing
  function stack(n, mid, spacing) {
    return Array.from({ length: n }, (_, i) => mid + (i - (n - 1) / 2) * spacing);
  }

  function maxAbs(M) {
    let m = 0;
    for (const row of M) for (const v of (Array.isArray(row) ? row : [row])) m = Math.max(m, Math.abs(v));
    return m;
  }

  // the x and y values of the input plane, for the input boxes
  function inputGrid(G) {
    const a = new Float32Array(G * G * 2);
    for (let p = 0; p < G * G; p++) {
      a[2 * p] = -1 + 2 * ((p % G) + 0.5) / G;
      a[2 * p + 1] = 1 - 2 * (Math.floor(p / G) + 0.5) / G;
    }
    return a;
  }

  // small L-shaped pair of axes in the lower-left corner of rect r
  function cornerAxes(c, r, xl, yl) {
    const x = r.x + 18, y = r.y + r.h - 18, L = 56;
    c.strokeStyle = C.ink;
    c.fillStyle = C.ink;
    c.lineWidth = 2;
    c.beginPath(); c.moveTo(x, y - L); c.lineTo(x, y); c.lineTo(x + L, y); c.stroke();
    for (const [tx, ty, dx, dy] of [[x + L, y, 1, 0], [x, y - L, 0, -1]]) {
      c.beginPath();
      c.moveTo(tx + 8 * dx, ty + 8 * dy);
      c.lineTo(tx - 4 * dy, ty + 4 * dx);
      c.lineTo(tx + 4 * dy, ty - 4 * dx);
      c.closePath(); c.fill();
    }
    nodeLabel(c, xl, x + L + 12, y - 15, "left");
    nodeLabel(c, yl, x, y - L - 38);
  }

  // centered lines of text on a white rounded rectangle, so they can sit on top of the connections
  // (like the caption boxes in img/real_neuron_artificial_neurons.svg)
  function tag(c, lines, cx, cy) {
    const LH = 28, PX = 12, PY = 8;
    c.font = `22px ${C.font}`;
    const w = Math.max(...lines.map((t) => c.measureText(t).width)) + 2 * PX, h = lines.length * LH + 2 * PY;
    c.fillStyle = "#fff";
    c.beginPath(); c.roundRect(cx - w / 2, cy - h / 2, w, h, 10); c.fill();
    c.fillStyle = C.ink;
    c.textAlign = "center";
    c.textBaseline = "middle";
    lines.forEach((t, i) => c.fillText(t, cx, cy + (i - (lines.length - 1) / 2) * LH));
  }

  window.NNDiagram = { BOX, featureBox, nodeLabel, edge, arrow, stack, maxAbs, inputGrid, cornerAxes, tag };
})();
