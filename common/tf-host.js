// The talk's one copy of TensorFlow.js, lent to the demos in their iframes (see common/tf.js).
//
// Every TF.js WebGL context compiles a GPU program the first time it runs each operation on each
// tensor shape, and a training step needs dozens of them: seconds of frozen screen, typically on
// the first click of "optimize". With one shared copy, those programs are compiled once, by
// TFHost.warmUp (which runs each demo unseen while the early slides are up), and reused from then on.
//
// Only one demo uses the shared copy at a time. Everything it creates (tensors, variables) is
// disposed when its page goes away, so nothing piles up from one visit to the next.
(function () {
  "use strict";

  const eng = tf.engine();
  let session = null;   // { win, tensors: live tensors created by that demo, warm: true for a warm-up }

  // follow every tensor and variable the current demo creates and disposes
  const trackTensor = eng.trackTensor, disposeTensor = eng.disposeTensor;
  eng.trackTensor = function (a, backend) {
    trackTensor.call(this, a, backend);
    if (session) session.tensors.add(a);
  };
  eng.disposeTensor = function (a) {
    disposeTensor.call(this, a);
    if (session) session.tensors.delete(a);
  };

  // TF.js recognizes typed arrays with instanceof, which fails for arrays made in another window
  // (a demo's Float32Array is not this window's Float32Array), so copy them into this window's kind.
  const native = (v) => v instanceof Float32Array || v instanceof Int32Array || v instanceof Uint8Array || v instanceof Uint8ClampedArray;
  function adopt(v) {
    if (ArrayBuffer.isView(v) && !native(v) && window[v.constructor.name]) return new window[v.constructor.name](v);
    if (Array.isArray(v) && v.length && (Array.isArray(v[0]) || ArrayBuffer.isView(v[0]))) return v.map(adopt);
    return v;
  }
  // what a demo sees as `tf`: this window's tf, with the functions that take arrays wrapped
  const lent = Object.create(tf);
  for (const k of ["tensor", "tensor1d", "tensor2d", "tensor3d", "tensor4d", "tensor5d", "tensor6d"]) {
    const f = tf[k];
    Object.defineProperty(lent, k, { value: (values, ...rest) => f(adopt(values), ...rest) });
  }

  // A disposed tensor's GPU texture goes into a pool for reuse by tensors of the same shape, and
  // each demo has its own shapes, so between demos, delete the pool (TF.js 4.22's texture manager;
  // skipped if it isn't there). Otherwise the image demo alone would hold ~1 GB for the rest of the talk.
  function freeTextures() {
    const tm = tf.getBackend() === "webgl" && tf.backend().textureManager;
    if (!tm || !tm.freeTextures || !tm.gpgpu) return;
    for (const list of Object.values(tm.freeTextures)) for (const t of list) tm.gpgpu.deleteMatrixTexture(t.texture);
    tm.freeTextures = {};
    tm._numBytesAllocated -= tm._numBytesFree;
    tm._numBytesFree = 0;
    tm.numFreeTextures = 0;
  }

  function end() {
    const s = session;
    if (!s) return;
    session = null;
    for (const t of s.tensors) if (!t.isDisposed) t.dispose();
    freeTextures();
    if (s.warm) warm.abort();       // a real demo took over in the middle of a warm-up
    else warm.resume();
  }

  // called by common/tf.js as a demo page starts
  function attach(win) {
    end();   // normally nothing to end: Reveal unloads a demo's iframe before the next one starts
    session = { win, tensors: new Set(), warm: win.frameElement != null && win.frameElement === warm.frame };
    win.addEventListener("pagehide", () => { if (session && session.win === win) end(); });
    return lent;
  }

  // ---------------------------------------------------------------- warm-up
  // Load each demo in an invisible iframe, press its "optimize" button, let it run for a moment,
  // and throw it away; one at a time, and only while no demo is on screen.
  const warm = {
    queue: [], frame: null, current: null, timer: null,
    start(urls) { this.queue.push(...urls); this.resume(); },
    resume() {
      clearTimeout(this.timer);
      this.timer = setTimeout(() => this.next(), 300);
    },
    next() {
      if (this.frame || session || !this.queue.length) return;
      const url = this.current = this.queue.shift();
      const f = this.frame = document.createElement("iframe");
      // opacity 0 rather than display: none or off screen, so the browser keeps running its animation frames
      Object.assign(f.style, { position: "fixed", left: "0", top: "0", width: "480px", height: "270px",
        opacity: "0", pointerEvents: "none", zIndex: "-1", border: "0" });
      f.setAttribute("tabindex", "-1");
      f.setAttribute("aria-hidden", "true");
      f.addEventListener("load", () => this.exercise(f));
      f.src = url;
      document.body.appendChild(f);
    },
    exercise(f) {
      if (f !== this.frame) return;
      const win = f.contentWindow, button = f.contentDocument.querySelector(".btn.primary");
      if (button) button.click();
      const t0 = performance.now();
      let frames = 0;
      const tick = () => {
        if (f !== this.frame) return;
        if (++frames < 30 || performance.now() - t0 < 2000) win.requestAnimationFrame(tick);
        else this.finish();
      };
      win.requestAnimationFrame(tick);
    },
    finish() {
      const f = this.frame;
      this.frame = this.current = null;
      if (session && session.warm) end();
      if (f) f.remove();
      this.resume();
    },
    abort() {
      if (this.current) this.queue.unshift(this.current);   // try that one again later
      const f = this.frame;
      this.frame = this.current = null;
      if (f) f.remove();
    },
  };

  window.TFHost = { attach, warmUp: (urls) => warm.start(urls) };
})();
