// Drawing the slide, the ball, and the history scale shared by the Demo 1 pages.
(function () {
  "use strict";
  const C = Stage.COLORS;
  const T_MAX = 3.5;   // fixed time scale (seconds) of every Demo 1 history plot

  class SlideView {
    constructor() {
      this.panel = new Stage.Panel(Stage.L.main);
      this.ax = new Plots.Axes(this.panel, null, [-0.12, Brach.Lx + 0.12], [-1.47, 0.18]);
      this.heights = Brach.PRESETS.linear.slice();
      this.curve = Brach.buildCurve(this.heights);
      this.ghost = null;
      this.ball = null;
      this.showCycloid = false;
      this.cyc = Brach.cycloid(300);
      this.draggable = false;
      this.dragging = -1;
      this.ondrag = null;
      this.panel.onresize = () => this.draw();
      const cv = this.panel.canvas;
      cv.addEventListener("pointerdown", (e) => this.down(e));
      cv.addEventListener("pointermove", (e) => this.move(e));
      window.addEventListener("pointerup", () => { this.dragging = -1; });
    }
    setHeights(h) {
      this.heights = h.slice();
      this.curve = Brach.buildCurve(this.heights);
    }
    nearestNode(p) {
      let best = -1, bd = 28;
      for (let i = 0; i < Brach.N; i++) {
        const d = Math.hypot(this.ax.X(Brach.nodeX[i]) - p.x, this.ax.Y(this.heights[i]) - p.y);
        if (d < bd) { bd = d; best = i; }
      }
      return best;
    }
    down(e) {
      if (!this.draggable) return;
      const i = this.nearestNode(this.panel.pos(e));
      if (i >= 0) { this.dragging = i; this.panel.canvas.setPointerCapture(e.pointerId); }
    }
    move(e) {
      const p = this.panel.pos(e);
      if (this.dragging >= 0) {
        const y = Optim.clamp(this.ax.invY(p.y), Brach.Y_MIN, -0.02);
        this.heights[this.dragging] = y;
        this.setHeights(this.heights);
        if (this.ondrag) this.ondrag();
      } else if (this.draggable) {
        this.panel.canvas.style.cursor = this.nearestNode(p) >= 0 ? "ns-resize" : "default";
      }
    }
    draw() {
      const c = this.panel.clear(), ax = this.ax;
      // finish line at the right edge
      c.strokeStyle = "#ccc";
      c.lineWidth = 2;
      c.setLineDash([8, 8]);
      c.beginPath(); c.moveTo(ax.X(Brach.Lx), ax.Y(0.18)); c.lineTo(ax.X(Brach.Lx), ax.Y(-1.47)); c.stroke();
      c.setLineDash([]);
      // ground level references: the start and end heights
      c.strokeStyle = "#f0f0f0";
      c.beginPath(); c.moveTo(ax.X(-0.12), ax.Y(0)); c.lineTo(ax.X(Brach.Lx + 0.12), ax.Y(0)); c.stroke();

      if (this.showCycloid) {
        const p = this.cyc.pts;
        ax.curve(p.map((q) => q[0]), p.map((q) => q[1]), { color: C.orange, width: 4, dash: [10, 8] });
      }
      if (this.ghost) {
        const g = Brach.buildCurve(this.ghost);
        ax.curve(g.x, g.y, { color: "#999", width: 2, alpha: 0.5 });
      }
      // the slide
      const cv = this.curve;
      ax.curve(cv.x, cv.y, { color: C.ink, width: 5 });
      // nodes
      c.fillStyle = "#fff";
      c.strokeStyle = C.ink;
      c.lineWidth = 2;
      for (let i = 0; i < Brach.N; i++) {
        c.beginPath(); c.arc(ax.X(Brach.nodeX[i]), ax.Y(this.heights[i]), 5, 0, 2 * Math.PI); c.fill(); c.stroke();
      }
      // fixed endpoints
      c.fillStyle = C.ink;
      for (const [x, y] of [[0, 0], [Brach.Lx, -Brach.Ly]]) {
        c.beginPath(); c.arc(ax.X(x), ax.Y(y), 8, 0, 2 * Math.PI); c.fill();
      }
      if (this.ball) this.drawBall(this.ball);
    }
    drawBall(b) {
      const c = this.panel.ctx, ax = this.ax;
      const x = ax.X(b.x), y = ax.Y(b.y), r = Brach.BALL_R * (ax.r.w / (ax.xlim[1] - ax.xlim[0]));
      const g = c.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      g.addColorStop(0, "#6fa0ff");
      g.addColorStop(1, C.accent);
      c.fillStyle = g;
      c.beginPath(); c.arc(x, y, r, 0, 2 * Math.PI); c.fill();
    }
  }

  const fmtTime = (t) => (isFinite(t) ? t.toFixed(3) : "∞");

  window.Demo1 = { SlideView, T_MAX, fmtTime };
})();
