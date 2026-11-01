// Shared page machinery: a 1600x900 stage scaled to fit the window (or iframe),
// hi-DPI canvas panels in stage coordinates, buttons, popups, and page navigation.
(function () {
  "use strict";

  const W = 1600, H = 900;

  // standard regions, identical on every page
  const L = {
    main: { x: 20, y: 20, w: 1060, h: 780 },
    controls: { x: 20, y: 815, w: 1060, h: 70 },
    readout: { x: 1110, y: 20, w: 470, h: 180 },
    history: { x: 1110, y: 210, w: 470, h: 620 },   // ends above the page-navigation arrows
  };

  const COLORS = {
    ink: "#333", grey: "#888", light: "#ddd", faint: "#f3f3f3",
    accent: "#1155cc", accentFill: "rgba(17, 85, 204, 0.15)",
    orange: "#f59322", blue: "#0877bd",
    font: '"Helvetica Neue", Helvetica, Arial, sans-serif',
    mono: '"SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace',
  };

  let scale = 1;
  const panels = [];
  const resizeHooks = [];
  let stageEl = null;

  function stage() {
    if (!stageEl) {
      stageEl = document.getElementById("stage");
      if (!stageEl) {
        stageEl = document.createElement("div");
        stageEl.id = "stage";
        document.body.appendChild(stageEl);
      }
    }
    return stageEl;
  }

  function fit() {
    const s = stage();
    const ww = window.innerWidth, wh = window.innerHeight;
    scale = Math.min(ww / W, wh / H);
    if (embedded) scale = Math.round(scale * 100) / 100;   // reveal.js rounds its slides' scale this way
    const ox = (ww - W * scale) / 2, oy = (wh - H * scale) / 2;
    s.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
    for (const p of panels) p._resize();
    for (const f of resizeHooks) f();
  }

  function el(tag, attrs, parent) {
    const e = document.createElement(tag);
    if (attrs) {
      for (const [k, v] of Object.entries(attrs)) {
        if (k === "style" && typeof v === "object") Object.assign(e.style, v);
        else if (k === "text") e.textContent = v;
        else if (k === "html") e.innerHTML = v;
        else if (k === "class") e.className = v;
        else if (k.startsWith("on")) e.addEventListener(k.slice(2), v);
        else e.setAttribute(k, v);
      }
    }
    (parent || stage()).appendChild(e);
    return e;
  }

  function place(e, r) {
    Object.assign(e.style, {
      position: "absolute", left: r.x + "px", top: r.y + "px",
      width: r.w != null ? r.w + "px" : "", height: r.h != null ? r.h + "px" : "",
    });
    return e;
  }

  // A canvas whose drawing coordinates are stage pixels, but whose backing store
  // matches the real on-screen resolution.
  class Panel {
    constructor(r, parent) {
      this.x = r.x; this.y = r.y; this.w = r.w; this.h = r.h;
      this.canvas = el("canvas", { class: "panel" }, parent);
      place(this.canvas, r);
      this.ctx = this.canvas.getContext("2d");
      this.onresize = null;
      panels.push(this);
      this._resize();
    }
    _resize() {
      const k = scale * (window.devicePixelRatio || 1);
      this.k = k;
      this.canvas.width = Math.max(1, Math.round(this.w * k));
      this.canvas.height = Math.max(1, Math.round(this.h * k));
      this.ctx.setTransform(k, 0, 0, k, 0, 0);
      if (this.onresize) this.onresize();
    }
    clear(color) {
      const c = this.ctx;
      c.setTransform(this.k, 0, 0, this.k, 0, 0);
      if (color) { c.fillStyle = color; c.fillRect(0, 0, this.w, this.h); }
      else c.clearRect(0, 0, this.w, this.h);
      return c;
    }
    // mouse position in panel coordinates
    pos(ev) {
      const r = this.canvas.getBoundingClientRect();
      return { x: (ev.clientX - r.left) * this.w / r.width, y: (ev.clientY - r.top) * this.h / r.height };
    }
  }

  function button(label, onclick, parent, opts) {
    opts = opts || {};
    const b = el("button", { class: "btn" + (opts.cls ? " " + opts.cls : ""), text: label }, parent);
    b.addEventListener("click", (e) => { b.blur(); onclick(e); });
    if (opts.title) b.title = opts.title;
    return b;
  }

  function controls(r) {
    const d = el("div", { class: "controls" });
    place(d, r || L.controls);
    return d;
  }

  function label(text, r, style) {
    const d = el("div", { class: "label", text });
    place(d, r);
    if (style) Object.assign(d.style, style);
    return d;
  }

  // Popup window in front of everything. Returns {box, close}.
  function popup(r, onclose) {
    const ov = el("div", { class: "overlay" });
    const box = el("div", { class: "popup" }, ov);
    place(box, r);
    const x = el("div", { class: "close", html: "&times;" }, box);
    function close() {
      if (!ov.parentNode) return;
      ov.remove();
      document.removeEventListener("keydown", onkey);
      if (onclose) onclose();
    }
    function onkey(e) { if (e.key === "Escape") close(); }
    x.addEventListener("click", close);
    ov.addEventListener("mousedown", (e) => { if (e.target === ov) close(); });
    document.addEventListener("keydown", onkey);
    return { box, close, overlay: ov };
  }

  const embedded = (() => {
    try { if (window.self !== window.top) return true; } catch (e) { return true; }
    return new URLSearchParams(location.search).has("embed");
  })();

  // Inside a slide deck (an iframe), keys pressed in the demo never reach the deck, so pass the
  // slide-changing ones up to it: reveal.js accepts {"method": ...} messages from other windows.
  // Arrows are left alone while typing in a text field (they move the cursor there); PageUp and
  // PageDown, which is what a presentation clicker sends, always change the slide.
  if (window.self !== window.top) {
    document.addEventListener("keydown", (e) => {
      const t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      let method = null;
      if (e.key === "PageDown" || (e.key === "ArrowRight" && !typing)) method = "next";
      if (e.key === "PageUp" || (e.key === "ArrowLeft" && !typing)) method = "prev";
      if (!method) return;
      e.preventDefault();
      window.parent.postMessage(JSON.stringify({ method }), "*");
    });
    // holding R shows the deck's 1600 x 900 boundary (see index.html)
    const isR = (e) => e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey && !e.altKey;
    document.addEventListener("keydown", (e) => {
      const t = e.target, typing = t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable);
      if (isR(e) && !typing) window.parent.postMessage({ aspectFrame: true }, "*");
    });
    document.addEventListener("keyup", (e) => {
      if (e.key.toLowerCase() === "r") window.parent.postMessage({ aspectFrame: false }, "*");
    });
    window.addEventListener("blur", () => window.parent.postMessage({ aspectFrame: false }, "*"));
  }

  // prev/next links (hidden when embedded in a slide)
  function nav(prev, next) {
    if (embedded) return;
    const d = el("div", { class: "nav" });
    if (prev) el("a", { href: prev, html: "&larr;" }, d);
    el("a", { href: rootPath() + "demos.html", html: "&#9776;" }, d);
    if (next) el("a", { href: next, html: "&rarr;" }, d);
    document.addEventListener("keydown", (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft" && prev) location.href = prev;
      if (e.key === "ArrowRight" && next) location.href = next;
    });
  }

  function rootPath() {
    // pages live one directory below the repo root
    return "../";
  }

  // animation loop helper: f(dt_seconds, now_ms); returns a stop function
  function loop(f) {
    let last = performance.now(), live = true;
    function tick(now) {
      if (!live) return;
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      f(dt, now);
      requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
    return () => { live = false; };
  }

  window.addEventListener("resize", fit);
  document.addEventListener("DOMContentLoaded", fit);

  window.Stage = {
    W, H, L, COLORS, Panel, el, place, button, controls, label, popup, nav, loop, fit,
    onResize: (f) => resizeHooks.push(f),
    get scale() { return scale; },
    embedded,
  };
  // run fit immediately if the stage element already exists
  if (document.getElementById("stage")) fit();
})();
