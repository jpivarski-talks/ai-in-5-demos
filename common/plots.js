// Shared plot components: the big Readout (top-right), the History panel
// (bottom-right), and a small Axes helper for main-panel plots.
(function () {
  "use strict";
  const C = Stage.COLORS;

  function niceStep(span, n) {
    const raw = span / Math.max(1, n);
    const p = Math.pow(10, Math.floor(Math.log10(raw)));
    const f = raw / p;
    return (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * p;
  }
  function ticks(lo, hi, n) {
    if (!(hi > lo)) return [lo];
    const st = niceStep(hi - lo, n || 5);
    const out = [];
    for (let v = Math.ceil(lo / st - 1e-9) * st; v <= hi + st * 1e-9; v += st) out.push(Math.abs(v) < st * 1e-9 ? 0 : v);
    return out;
  }
  function fmtTick(v, step) {
    if (v === 0) return "0";
    const a = Math.abs(v);
    if (a >= 1e5 || a < 1e-3) return v.toExponential(0).replace("e+", "e");
    const d = Math.max(0, -Math.floor(Math.log10(step) + 1e-9));
    return v.toFixed(Math.min(d, 4));
  }

  // ------------------------------------------------------------ Readout
  class Readout {
    constructor(opts) {
      opts = opts || {};
      const r = opts.rect || Stage.L.readout;
      this.box = Stage.el("div");
      Stage.place(this.box, r);
      // (no caption: the history plot's axis label already says what the number is)
      this.val = Stage.el("div", { text: "" }, this.box);
      this.size = opts.size || 92;
      Object.assign(this.val.style, {
        fontFamily: C.font, fontSize: this.size + "px", fontWeight: "bold", textAlign: "right", whiteSpace: "nowrap",
        color: C.ink, lineHeight: "1.15", fontVariantNumeric: "tabular-nums", marginTop: "24px",
      });
      this.sub = Stage.el("div", { text: "" }, this.box);
      Object.assign(this.sub.style, { fontSize: "22px", color: C.grey, textAlign: "right", marginTop: "4px" });
      this.w = r.w;
    }
    // value text, optional color, optional unit (drawn smaller)
    set(text, color, unit) {
      this.val.textContent = text;
      if (unit) {
        const u = document.createElement("span");
        u.textContent = "\u2009" + unit;
        Object.assign(u.style, { fontFamily: C.font, fontSize: "0.55em" });
        this.val.appendChild(u);
      }
      this.val.style.color = color || C.ink;
      // shrink long values to fit
      const n = Math.max(1, text.length + (unit ? 0.6 * unit.length + 0.3 : 0));
      this.val.style.fontSize = Math.min(this.size, Math.floor(this.w / (0.6 * n))) + "px";
    }
    setSub(t) { this.sub.textContent = t; }
  }

  // ------------------------------------------------------------ History
  // mode: "bars" (fixed slots, scrolls when the far edge is reached)
  //       "line" (zooms out to keep the whole history in view)
  class History {
    constructor(opts) {
      this.o = Object.assign({
        rect: Stage.L.history, mode: "line", yLabel: "loss", xLabel: "iteration",
        yMax: null, slots: 30, xSpan: 100, unit: "", yLog: false, barLabels: null,
      }, opts || {});
      this.panel = new Stage.Panel(this.o.rect);
      this.panel.onresize = () => this.draw();
      this.clear();
    }
    clear() {
      this.a = [];       // main series
      this.b = [];       // optional secondary (dotted) series
      this.offset = 0;   // index of first visible bar
      this.yTop = null;
      this.draw();
    }
    push(v, v2) {
      this.a.push(v);
      if (v2 !== undefined) this.b.push(v2);
      if (this.o.mode === "bars" && this.a.length - this.offset > this.o.slots) this.offset = this.a.length - this.o.slots;
      this.dirty = true;
    }
    get length() { return this.a.length; }
    yRange() {
      if (this.o.yMax != null) return [0, this.o.yMax];
      let m = 0;
      for (const v of this.a) if (isFinite(v)) m = Math.max(m, v);
      for (const v of this.b) if (isFinite(v)) m = Math.max(m, v);
      if (m <= 0) m = 1;
      // the top of the scale only grows, so the curve never jumps around
      if (this.yTop == null || m > this.yTop) this.yTop = m * 1.08;
      return [0, this.yTop];
    }
    draw() {
      const p = this.panel, c = p.clear(), o = this.o;
      const ml = 78, mr = 16, mt = 18, mb = 62;
      const X0 = ml, X1 = p.w - mr, Y0 = p.h - mb, Y1 = mt;
      const [lo, hi] = this.yRange();
      const Y = (v) => Y0 - (Math.min(v, hi) - lo) / (hi - lo) * (Y0 - Y1);

      // frame + grid
      c.font = `18px ${C.font}`;
      c.fillStyle = C.grey;
      c.strokeStyle = "#eee";
      c.lineWidth = 1;
      const yt = ticks(lo, hi, 6), ystep = yt.length > 1 ? yt[1] - yt[0] : 1;
      c.textAlign = "right";
      c.textBaseline = "middle";
      for (const v of yt) {
        const y = Y(v);
        c.beginPath(); c.moveTo(X0, y); c.lineTo(X1, y); c.stroke();
        c.fillText(fmtTick(v, ystep), X0 - 8, y);
      }
      c.strokeStyle = "#999";
      c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(X0, Y1); c.lineTo(X0, Y0); c.lineTo(X1, Y0); c.stroke();

      // axis labels
      c.fillStyle = C.ink;
      c.font = `22px ${C.font}`;
      c.textAlign = "center";
      c.textBaseline = "alphabetic";
      c.fillText(o.xLabel, (X0 + X1) / 2, p.h - 8);
      c.save();
      c.translate(20, (Y0 + Y1) / 2);
      c.rotate(-Math.PI / 2);
      c.textBaseline = "middle";
      c.fillText(o.yLabel, 0, 0);
      c.restore();

      if (o.mode === "bars") this.drawBars(c, X0, X1, Y0, Y1, Y, hi);
      else this.drawLine(c, X0, X1, Y0, Y1, Y);
      this.dirty = false;
    }
    drawBars(c, X0, X1, Y0, Y1, Y, hi) {
      const n = this.o.slots, sw = (X1 - X0) / n, bw = sw * 0.72;
      c.font = `16px ${C.font}`;
      c.textAlign = "center";
      for (let i = this.offset; i < this.a.length; i++) {
        const k = i - this.offset, v = this.a[i];
        const x = X0 + sw * (k + 0.5);
        const y = Y(v);
        c.fillStyle = C.accent;
        c.fillRect(x - bw / 2, y, bw, Y0 - y);
        if (v > hi) { // clipped bar
          c.fillStyle = "#fff";
          c.beginPath(); c.moveTo(x - bw / 2, Y1 + 10); c.lineTo(x, Y1); c.lineTo(x + bw / 2, Y1 + 10); c.fill();
        }
        if (sw >= 34) {
          c.fillStyle = C.ink;
          c.textBaseline = "bottom";
          c.font = `${sw >= 44 ? 16 : 14}px ${C.font}`;
          if (v <= hi) c.fillText(isFinite(v) ? v.toFixed(2) : "", x, y - 3);
          c.font = `16px ${C.font}`;
          c.fillStyle = C.grey;
          c.textBaseline = "top";
          c.fillText(String(i + 1), x, Y0 + 6);
        }
      }
      if (sw < 34) {
        c.fillStyle = C.grey;
        c.textBaseline = "top";
        for (let k = 0; k < n; k += 5) {
          const i = this.offset + k;
          c.fillText(String(i + 1), X0 + sw * (k + 0.5), Y0 + 6);
        }
      }
    }
    drawLine(c, X0, X1, Y0, Y1, Y) {
      const n = this.a.length;
      const xmax = Math.max(this.o.xSpan, n > 0 ? n - 1 : 0);
      const X = (i) => X0 + i / xmax * (X1 - X0);
      const xt = ticks(0, xmax, 4), xstep = xt.length > 1 ? xt[1] - xt[0] : 1;
      c.font = `18px ${C.font}`;
      c.fillStyle = C.grey;
      c.textAlign = "center";
      c.textBaseline = "top";
      for (const v of xt) c.fillText(fmtTick(v, xstep), X(v), Y0 + 6);
      const series = (arr, style) => {
        if (arr.length === 0) return;
        // decimate for speed when the history is long
        const stride = Math.max(1, Math.floor(arr.length / 1500));
        c.beginPath();
        for (let i = 0; i < arr.length; i += stride) {
          const x = X(i), y = Y(arr[i]);
          if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
        }
        const li = arr.length - 1;
        c.lineTo(X(li), Y(arr[li]));
        if (style === "area") {
          c.strokeStyle = C.accent;
          c.lineWidth = 3;
          c.stroke();
          c.lineTo(X(li), Y0);
          c.lineTo(X(0), Y0);
          c.closePath();
          c.fillStyle = C.accentFill;
          c.fill();
        } else {
          c.setLineDash([4, 5]);
          c.strokeStyle = "#888";
          c.lineWidth = 3;
          c.stroke();
          c.setLineDash([]);
        }
      };
      series(this.a, "area");
      series(this.b, "dots");
      if (n > 0) {
        c.fillStyle = C.accent;
        c.beginPath(); c.arc(X(n - 1), Y(this.a[n - 1]), 5, 0, 2 * Math.PI); c.fill();
      }
    }
  }

  // ------------------------------------------------------------ Axes
  // maps data coordinates into a rectangle of a Panel
  class Axes {
    constructor(panel, r, xlim, ylim) {
      this.p = panel;
      this.r = r || { x: 0, y: 0, w: panel.w, h: panel.h };
      this.xlim = xlim; this.ylim = ylim;
    }
    X(x) { return this.r.x + (x - this.xlim[0]) / (this.xlim[1] - this.xlim[0]) * this.r.w; }
    Y(y) { return this.r.y + this.r.h - (y - this.ylim[0]) / (this.ylim[1] - this.ylim[0]) * this.r.h; }
    invX(px) { return this.xlim[0] + (px - this.r.x) / this.r.w * (this.xlim[1] - this.xlim[0]); }
    invY(py) { return this.ylim[0] + (this.r.y + this.r.h - py) / this.r.h * (this.ylim[1] - this.ylim[0]); }
    frame(opts) {
      opts = opts || {};
      const c = this.p.ctx, r = this.r;
      c.strokeStyle = opts.color || "#bbb";
      c.lineWidth = 1.5;
      c.strokeRect(r.x, r.y, r.w, r.h);
      c.fillStyle = C.ink;
      c.font = `22px ${C.font}`;
      if (opts.xlabel) {
        c.textAlign = "center"; c.textBaseline = "top";
        c.fillText(opts.xlabel, r.x + r.w / 2, r.y + r.h + 8);
      }
      if (opts.ylabel) {
        c.save();
        c.translate(r.x - 14, r.y + r.h / 2);
        c.rotate(-Math.PI / 2);
        c.textAlign = "center"; c.textBaseline = "bottom";
        c.fillText(opts.ylabel, 0, 0);
        c.restore();
      }
    }
    curve(xs, ys, style) {
      const c = this.p.ctx;
      c.beginPath();
      for (let i = 0; i < xs.length; i++) {
        const x = this.X(xs[i]), y = this.Y(ys[i]);
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.strokeStyle = style.color || C.accent;
      c.lineWidth = style.width || 3;
      if (style.dash) c.setLineDash(style.dash);
      c.globalAlpha = style.alpha == null ? 1 : style.alpha;
      c.stroke();
      c.setLineDash([]);
      c.globalAlpha = 1;
    }
    dots(xs, ys, style) {
      const c = this.p.ctx, r = style.r || 4;
      c.fillStyle = style.color || C.ink;
      c.globalAlpha = style.alpha == null ? 1 : style.alpha;
      for (let i = 0; i < xs.length; i++) {
        c.beginPath(); c.arc(this.X(xs[i]), this.Y(ys[i]), r, 0, 2 * Math.PI); c.fill();
      }
      c.globalAlpha = 1;
    }
    clip(f) {
      const c = this.p.ctx, r = this.r;
      c.save();
      c.beginPath(); c.rect(r.x, r.y, r.w, r.h); c.clip();
      f(c);
      c.restore();
    }
  }

  window.Plots = { Readout, History, Axes, ticks, niceStep, fmtTick };
})();
