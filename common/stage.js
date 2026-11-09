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
    // the stage is 1600 x 900 unless a page's CSS resizes it (a demo inside an ordinary slide)
    const sw = s.offsetWidth || W, sh = s.offsetHeight || H;
    scale = Math.min(ww / sw, wh / sh);
    if (embedded) scale = Math.round(scale * 100) / 100;   // reveal.js rounds its slides' scale this way
    const ox = (ww - sw * scale) / 2, oy = (wh - sh * scale) / 2;
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

  // Citations, styled like the slides' (.cite in stage.css and talk.css). Each item is [text, url]
  // for a link or a plain string for a note; the text is HTML, so titles can be <i>italic</i>. r gives x and w, and either y (top) or bottom; with
  // opts.inline the items share one line (spaced apart, see stage.css), otherwise each gets its own line.
  function cite(items, r, opts) {
    opts = opts || {};
    const d = el("div", { class: "cite" });
    place(d, { x: r.x, y: r.y != null ? r.y : 0, w: r.w });
    if (r.bottom != null) { d.style.top = ""; d.style.bottom = (H - r.bottom) + "px"; }
    // outside a slide deck, keep a bottom-right citation clear of the page-navigation arrows
    if (!embedded && r.bottom != null && r.bottom > H - 40 && opts.align !== "left") d.style.width = (r.w - 120) + "px";
    d.style.textAlign = opts.align || "right";
    if (opts.inline) d.classList.add("inline");
    items.forEach((it) => {
      if (typeof it === "string") el("span", { html: it }, d);
      else el("a", { html: it[0], href: it[1], target: "_blank", rel: "noopener" }, d);
    });
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

  // a field that takes typed text (where the arrows, Home, and End move the cursor), unlike a checkbox or button
  const NOT_TEXT = ["checkbox", "radio", "button", "submit", "reset", "range", "color", "file", "image"];
  const typingIn = (t) => !!t && (t.tagName === "TEXTAREA" || t.isContentEditable ||
    (t.tagName === "INPUT" && !NOT_TEXT.includes((t.type || "").toLowerCase())));

  // Inside a slide deck (an iframe), keys pressed in the demo never reach the deck, so pass the
  // slide-changing ones up to it: reveal.js accepts {"method": ..., "args": [...]} messages from other
  // windows. The deck has no vertical slides, so like reveal.js itself: ← ↑ PageUp previous, → ↓ PageDown
  // next, Home first slide, End last (Shift ← and Shift → too), Alt skips the fragments of a slide.
  // Arrows, Home, and End are left alone while typing in a text field (they move the cursor there);
  // PageUp and PageDown, which is what a presentation clicker sends, always change the slide.
  if (window.self !== window.top) {
    document.addEventListener("keydown", (e) => {
      if (e.ctrlKey || e.metaKey) return;
      const typing = typingIn(e.target), step = [{ skipFragments: e.altKey }];
      let msg = null;
      if (e.key === "PageDown") msg = { method: "next", args: step };
      else if (e.key === "PageUp") msg = { method: "prev", args: step };
      else if (typing) return;
      else if (e.key === "Home" || (e.key === "ArrowLeft" && e.shiftKey)) msg = { method: "slide", args: [0] };
      else if (e.key === "End" || (e.key === "ArrowRight" && e.shiftKey)) msg = { method: "slide", args: [1e9] };   // reveal.js clamps to the last slide
      else if (e.key === "ArrowRight" || e.key === "ArrowDown") msg = { method: "next", args: step };
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp") msg = { method: "prev", args: step };
      if (!msg) return;
      e.preventDefault();
      window.parent.postMessage(JSON.stringify(msg), "*");
    });
    // holding R shows the deck's 1600 x 900 boundary (see index.html)
    const isR = (e) => e.key.toLowerCase() === "r" && !e.ctrlKey && !e.metaKey && !e.altKey;
    document.addEventListener("keydown", (e) => {
      if (isR(e) && !typingIn(e.target)) window.parent.postMessage({ aspectFrame: true }, "*");
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
    if (next) el("a", { href: next, html: "&rarr;" }, d);
    document.addEventListener("keydown", (e) => {
      const t = e.target;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "ArrowLeft" && prev) location.href = prev;
      if (e.key === "ArrowRight" && next) location.href = next;
    });
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
    W, H, L, COLORS, Panel, el, place, button, controls, label, cite, popup, nav, loop, fit,
    onResize: (f) => resizeHooks.push(f),
    get scale() { return scale; },
    embedded,
  };
  // run fit immediately if the stage element already exists
  if (document.getElementById("stage")) fit();
})();
