// The 1D dataset generator shared by Demo 2 pages 1 and 3: smooth random curves
// that 8 cosine templates and 3 logistics both fit well, but not perfectly.
(function (root) {
  "use strict";
  const F = typeof module !== "undefined" ? require("./fits1d.js") : root.Fits1D;

  function score(y, u) {
    const c = F.cosineFit(y, 8);
    const rc = F.r2(y, F.cosineCurve(c.mean, c.amps, 8));
    // the logistics must get there from page 3's starting point
    const l = F.fitFromStart(y);
    const rl = F.r2(y, F.logisticSum(l.p, l.c));
    return { rc, rl };
  }

  function make(u) {
    let y = null;
    for (let tries = 0; tries < 40; tries++) {
      y = F.smoothCurve(u, 0.07, 0.12);
      const s = score(y, u);
      if (s.rc > 0.88 && s.rc < 0.975 && s.rl > 0.88 && s.rl < 0.975) return y;
    }
    return y;
  }

  const api = { make, score };
  if (typeof module !== "undefined") module.exports = api; else root.Data1D = api;
})(typeof window !== "undefined" ? window : globalThis);
