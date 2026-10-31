// Shared pieces of the two image pages: loading the greyscale image,
// drawing greyscale arrays into boxes, and the difference popup.
(function () {
  "use strict";
  const C = Stage.COLORS;
  const N = 128;
  const BOX = 500;
  // two equal boxes side by side in the main panel
  const LEFT = { x: 20, y: 60, w: BOX, h: BOX }, RIGHT = { x: 560, y: 60, w: BOX, h: BOX };

  function loadImage(src) {
    return new Promise((resolve) => {
      const im = new Image();
      im.onload = () => {
        const cv = document.createElement("canvas");
        cv.width = N; cv.height = N;
        const c = cv.getContext("2d");
        c.drawImage(im, 0, 0, N, N);
        const d = c.getImageData(0, 0, N, N).data, a = new Float64Array(N * N);
        for (let i = 0; i < N * N; i++) a[i] = (0.299 * d[4 * i] + 0.587 * d[4 * i + 1] + 0.114 * d[4 * i + 2]) / 255;
        resolve(a);
      };
      im.src = src;
    });
  }

  // draw a greyscale array (values ~0..1, or symmetric around 0 if diverging) into rect r
  function drawGrey(ctx, r, a, opts) {
    opts = opts || {};
    const off = drawGrey.off || (drawGrey.off = document.createElement("canvas"));
    off.width = N; off.height = N;
    const oc = off.getContext("2d"), img = oc.createImageData(N, N);
    let lo = 0, hi = 1;
    if (opts.normalize) {
      let m = 0;
      for (const v of a) m = Math.max(m, Math.abs(v));
      lo = -m; hi = m;
    }
    for (let i = 0; i < N * N; i++) {
      const v = Math.max(0, Math.min(255, 255 * (a[i] - lo) / (hi - lo)));
      img.data[4 * i] = img.data[4 * i + 1] = img.data[4 * i + 2] = v;
      img.data[4 * i + 3] = 255;
    }
    oc.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = opts.smooth !== false;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(off, r.x, r.y, r.w, r.h);
    ctx.strokeStyle = "#bbb";
    ctx.lineWidth = 1.5;
    ctx.strokeRect(r.x - 0.75, r.y - 0.75, r.w + 1.5, r.h + 1.5);
  }

  // popup with the contrast-normalized difference between two images
  function showDifference(orig, fit) {
    const S = 760;
    const pop = Stage.popup({ x: (1600 - S - 40) / 2, y: 30, w: S + 40, h: S + 40 });
    const p = new Stage.Panel({ x: 20, y: 20, w: S, h: S }, pop.box);
    const d = new Float64Array(N * N);
    for (let i = 0; i < N * N; i++) d[i] = orig[i] - fit[i];
    const draw = () => { p.clear("#fff"); drawGrey(p.ctx, { x: 0, y: 0, w: S, h: S }, d, { normalize: true }); };
    p.onresize = draw;
    draw();
    return pop;
  }

  function sse(a, b) { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return s; }

  // a small caption under each box
  function caption(r, text) {
    return Stage.label(text, { x: Stage.L.main.x + r.x, y: Stage.L.main.y + r.y + r.h + 14, w: r.w }, { textAlign: "center", fontSize: "22px" });
  }

  window.ImageDemo = { N, BOX, LEFT, RIGHT, loadImage, drawGrey, showDifference, sse, caption };
})();
