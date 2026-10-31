// A 3D scatter plot in its own panel, rotated by dragging like a trackball:
// the side of the cube facing you follows the mouse.
(function () {
  "use strict";
  const C = Stage.COLORS;

  // 3x3 rotations about the screen's horizontal (x) and vertical (y) axes
  const Rx = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const Ry = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
  const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));

  class View3D {
    // the data live in the cube [lo, hi]^3; axis labels name the three coordinates
    constructor(rect, opts) {
      this.o = Object.assign({ lo: -1, hi: 1, labels: ["x", "y", "z"] }, opts || {});
      this.panel = new Stage.Panel(rect);
      this.points = [];
      this.classes = [];
      // initial view: look along -toward (toward points at the viewer), with the third axis up
      const t = this.o.toward || [0.6, -1, 0.45], tl = Math.hypot(...t), f = t.map((v) => v / tl);
      let up = [0 - f[2] * f[0], 0 - f[2] * f[1], 1 - f[2] * f[2]];
      const ul = Math.hypot(...up); up = up.map((v) => v / ul);
      const right = [up[1] * f[2] - up[2] * f[1], up[2] * f[0] - up[0] * f[2], up[0] * f[1] - up[1] * f[0]];
      this.R = [right, up, f];
      this.scale = Math.min(rect.w, rect.h) * 0.24;
      const cv = this.panel.canvas;
      cv.style.cursor = "grab";
      let drag = null;
      cv.addEventListener("pointerdown", (e) => { drag = this.panel.pos(e); cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; });
      cv.addEventListener("pointermove", (e) => {
        if (!drag) return;
        const p = this.panel.pos(e), k = 0.008;
        this.R = mul(Ry((p.x - drag.x) * k), mul(Rx((p.y - drag.y) * k), this.R));
        drag = p;
        this.draw();
      });
      cv.addEventListener("pointerup", () => { drag = null; cv.style.cursor = "grab"; });
      this.panel.onresize = () => this.draw();
    }
    set(points, classes) { this.points = points; this.classes = classes; }
    project(p) {
      const m = (this.o.lo + this.o.hi) / 2, h = (this.o.hi - this.o.lo) / 2;
      const q = [(p[0] - m) / h, (p[1] - m) / h, (p[2] - m) / h];
      const R = this.R;
      const v = R.map((r) => r[0] * q[0] + r[1] * q[1] + r[2] * q[2]);
      return [this.panel.w / 2 + this.scale * v[0], this.panel.h / 2 - this.scale * v[1], v[2]];
    }
    draw() {
      const c = this.panel.clear("#fff"), lo = this.o.lo, hi = this.o.hi;
      c.strokeStyle = "#bbb";
      c.lineWidth = 1.5;
      c.strokeRect(0.75, 0.75, this.panel.w - 1.5, this.panel.h - 1.5);
      // cube edges; the three edges from the (lo, lo, lo) corner are the labeled axes
      const corner = (i) => [i & 1 ? hi : lo, i & 2 ? hi : lo, i & 4 ? hi : lo];
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
        const d = i ^ j;
        if (d !== 1 && d !== 2 && d !== 4) continue;
        const a = this.project(corner(i)), b = this.project(corner(j));
        c.strokeStyle = i === 0 ? "#777" : "#d4d4d4";
        c.lineWidth = i === 0 ? 2 : 1.5;
        c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      }
      const ext = lo + (hi - lo) * 1.16;
      [[ext, lo, lo], [lo, ext, lo], [lo, lo, ext]].forEach((e, k) => {
        const p = this.project(e);
        NNDiagram.nodeLabel(c, this.o.labels[k], p[0], p[1] - 14);
      });
      // points, far to near
      const P = this.points.map((p, i) => [this.project(p), this.classes[i]]);
      P.sort((a, b) => a[0][2] - b[0][2]);
      c.lineWidth = 1.2;
      c.strokeStyle = "#fff";
      for (const [q, k] of P) {
        c.fillStyle = NN.classColor(k);
        c.beginPath(); c.arc(q[0], q[1], 5.5, 0, 2 * Math.PI); c.fill(); c.stroke();
      }
    }
  }

  window.View3D = View3D;
})();
