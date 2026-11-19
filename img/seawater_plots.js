// Cartoon scatter plots of (fake) seawater temperature, pressure, and salinity, drawn as inline SVG.
// The 2D plot (temperature and pressure) and the 3D plot (plus salinity) are drawn by the same code
// from the same points, and the 3D plot starts out looking straight at its temperature-pressure face,
// so that it's identical to the 2D plot until it's rotated. Drag the 3D plot to rotate it like a
// trackball (as in demo3-generalization/view3d.js); double-click it to return to the starting view.
//   <div class="seawater-plot" data-dims="2" style="width: 760px; height: 330px"></div>
//   <div class="seawater-plot" data-dims="3" style="width: 600px; height: 330px"></div>
// Plots with the same height have the same scale. The labels take their font and color from the page.
(function () {
  "use strict";
  // [temperature, pressure, salinity], each scaled to [0, 1]
  const DATA = [[0.942,0.042,0.861],[0.891,0.032,0.906],[0.909,0.02,0.967],[0.807,0.122,0.846],[0.781,0.077,0.793],[0.691,0.114,0.777],[0.704,0.092,0.707],[0.742,0.197,0.736],[0.621,0.201,0.512],[0.576,0.233,0.374],[0.584,0.195,0.516],[0.519,0.252,0.362],[0.509,0.283,0.6],[0.496,0.297,0.398],[0.461,0.297,0.31],[0.352,0.312,0.096],[0.386,0.318,0.234],[0.276,0.317,0.114],[0.338,0.34,0.24],[0.252,0.404,0.203],[0.294,0.4,0.037],[0.302,0.355,0.17],[0.237,0.456,0.02],[0.245,0.532,0.158],[0.147,0.499,0.396],[0.166,0.474,0.44],[0.239,0.553,0.399],[0.136,0.613,0.425],[0.216,0.614,0.324],[0.1,0.628,0.373],[0.113,0.752,0.552],[0.098,0.774,0.713],[0.144,0.73,0.328],[0.166,0.787,0.61],[0.079,0.802,0.609],[0.118,0.847,0.645],[0.205,0.891,0.463],[0.102,0.904,0.497],[0.075,0.891,0.555],[0.132,0.883,0.447]];
  // world axes: x = temperature, y = salinity (into the screen at first), z = pressure (up)
  const POINTS = DATA.map(([t, p, s]) => [t, s, p]);
  const LABELS = ["temperature", "salinity", "pressure"];
  const BOX = [1.9, 1, 1];               // the box's shape: longer along temperature, to use the width
  const BLUE = "rgb(31, 111, 180)", FONT = 34, R = 7;   // labels match the slides' body text (talk.css)
  const OFF = 12 + FONT * 0.6;           // distance from an axis to the middle of its label

  const Rx = (a) => [[1, 0, 0], [0, Math.cos(a), -Math.sin(a)], [0, Math.sin(a), Math.cos(a)]];
  const Ry = (a) => [[Math.cos(a), 0, Math.sin(a)], [0, 1, 0], [-Math.sin(a), 0, Math.cos(a)]];
  const mul = (A, B) => A.map((r) => [0, 1, 2].map((j) => r[0] * B[0][j] + r[1] * B[1][j] + r[2] * B[2][j]));
  // rows of the rotation: screen right, screen up, toward the viewer; looking straight at the
  // temperature-pressure face, with salinity going into the screen
  const startView = () => [[1, 0, 0], [0, 0, 1], [0, -1, 0]];

  function init(el) {
    const dims = Number(el.dataset.dims), box = dims === 3 ? BOX : [BOX[0], 0, BOX[2]];
    const W = parseFloat(el.style.width), H = parseFloat(el.style.height);
    // scale and center, in slide pixels: in the starting view, the box and its two labels (pressure on
    // the left, temperature below) fill the height and are centered
    const room = OFF + FONT / 2, S = (H - room - 8) / BOX[2];
    const cx = W / 2 + room / 2, cy = H / 2 - room / 2;
    const NS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(NS, "svg");
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("width", W);
    svg.setAttribute("height", H);
    Object.assign(svg.style, { display: "block", overflow: "visible", userSelect: "none" });
    el.appendChild(svg);
    let rot = startView();

    const project = (q) => {
      const d = q.map((v, k) => box[k] * (v - 0.5));
      const v = rot.map((r) => r[0] * d[0] + r[1] * d[1] + r[2] * d[2]);
      return [cx + S * v[0], cy - S * v[1], v[2]];
    };
    // the edge parallel to axis k whose other two coordinates are a (axis i) and b (axis j)
    const edge = (k, a, b) => {
      const [i, j] = [0, 1, 2].filter((m) => m !== k), lo = [0, 0, 0];
      lo[i] = a; lo[j] = b;
      const hi = lo.slice(); hi[k] = 1;
      return [project(lo), project(hi)];
    };
    // a face (axis i at value a) faces the viewer if its outward normal points toward the screen
    const facing = (i, a) => rot[2][i] * (a ? 1 : -1) > 0;

    // Like matplotlib's 3D axes: each axis is drawn on an outline edge of the box (the lowest one,
    // or the leftmost if it's vertical), so its label sits outside the box, away from the points.
    function axisEdge(k) {
      const [i, j] = [0, 1, 2].filter((m) => m !== k);
      let best = null, bestScore = -Infinity;
      for (const a of [0, 1]) for (const b of [0, 1]) {
        if (facing(i, a) === facing(j, b)) continue;
        const [p, q] = edge(k, a, b), dx = q[0] - p[0], dy = q[1] - p[1];
        const score = Math.abs(dy) > Math.abs(dx) ? -(p[0] + q[0]) : p[1] + q[1];
        if (score > bestScore) { bestScore = score; best = [a, b]; }
      }
      return best || [0, 0];
    }

    function draw() {
      const out = [];
      const line = (p, q, style) =>
        out.push(`<line x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}" ${style}/>`);
      const ks = dims === 3 ? [0, 1, 2] : [0, 2];
      const axes = [0, 1, 2].map(axisEdge);
      // faint box, then the axes
      for (const k of ks) for (const a of [0, 1]) for (const b of [0, 1]) {
        if (a === axes[k][0] && b === axes[k][1]) continue;
        const [p, q] = edge(k, a, b);
        line(p, q, `stroke="#cccccc" stroke-width="1.5"`);
      }
      for (const k of ks) {
        const [p, q] = edge(k, ...axes[k]);
        const mx = (p[0] + q[0]) / 2, my = (p[1] + q[1]) / 2, dx = q[0] - p[0], dy = q[1] - p[1];
        const len = Math.hypot(dx, dy);
        // an axis pointing at the viewer (salinity, at first) fades out instead of piling up at a corner
        const opacity = Math.min(1, len / (0.3 * S));
        if (opacity < 0.01) continue;
        line(p, q, `stroke="#000" stroke-width="4" stroke-linecap="round" opacity="${opacity}"`);
        // label: along the axis, on the side away from the box's center, never upside-down
        let nx = -dy / len, ny = dx / len;
        if (nx * (mx - cx) + ny * (my - cy) < 0) { nx = -nx; ny = -ny; }
        const lx = mx + OFF * nx, ly = my + OFF * ny;
        let ang = Math.atan2(dy, dx) * 180 / Math.PI;
        while (ang > 75) ang -= 180;
        while (ang <= -105) ang += 180;
        out.push(`<text x="${lx}" y="${ly}" transform="rotate(${ang} ${lx} ${ly})" text-anchor="middle" ` +
                 `dominant-baseline="central" font-size="${FONT}" fill="currentColor" opacity="${opacity}">${LABELS[k]}</text>`);
      }
      // points, far to near
      const P = POINTS.map(project).sort((a, b) => a[2] - b[2]);
      for (const [x, y] of P) out.push(`<circle cx="${x}" cy="${y}" r="${R}" fill="${BLUE}" stroke="#fff" stroke-width="2"/>`);
      svg.innerHTML = out.join("");
    }

    if (dims === 3) {
      let drag = null;
      const scale = () => (window.Reveal && Reveal.getScale ? Reveal.getScale() : 1);
      Object.assign(svg.style, { cursor: "grab", touchAction: "none" });
      svg.addEventListener("pointerdown", (e) => {
        drag = { x: e.clientX, y: e.clientY };
        svg.setPointerCapture(e.pointerId);
        svg.style.cursor = "grabbing";
        e.stopPropagation();
      });
      svg.addEventListener("pointermove", (e) => {
        if (!drag) return;
        const k = 0.008 / scale();
        rot = mul(Ry((e.clientX - drag.x) * k), mul(Rx((e.clientY - drag.y) * k), rot));
        drag = { x: e.clientX, y: e.clientY };
        draw();
      });
      const release = () => { drag = null; svg.style.cursor = "grab"; };
      svg.addEventListener("pointerup", release);
      svg.addEventListener("pointercancel", release);
      svg.addEventListener("dblclick", () => { rot = startView(); draw(); });
    }
    draw();
  }

  document.querySelectorAll(".seawater-plot").forEach(init);
})();
