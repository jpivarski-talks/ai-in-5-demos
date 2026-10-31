// A popup with a 3D scatter plot that can be rotated by dragging.
// Shows points (colored by class), warped grid lines, and an optional plane n.h + d = 0.
(function () {
  "use strict";
  const C = Stage.COLORS;

  function open(o) {
    const R = { x: 170, y: 40, w: 1260, h: 820 };
    const pop = Stage.popup(R);
    const panel = new Stage.Panel({ x: 0, y: 0, w: R.w, h: R.h }, pop.box);
    let yaw = 0.6, pitch = 0.35, drag = null;

    // fit the view to the data
    let lo = [Infinity, Infinity, Infinity], hi = [-Infinity, -Infinity, -Infinity];
    const all = o.points.concat(...o.lines);
    for (const p of all) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], p[k]); hi[k] = Math.max(hi[k], p[k]); }
    const center = lo.map((v, k) => (v + hi[k]) / 2);
    const half = Math.max(...hi.map((v, k) => (v - lo[k]) / 2), 1e-3);
    const box = [0, 1, 2].map((k) => [center[k] - half, center[k] + half]);
    const sc = Math.min(R.w, R.h) * 0.25 / half;

    function project(p) {
      const x = p[0] - center[0], y = p[1] - center[1], z = p[2] - center[2];
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const x1 = x * cy - y * sy, y1 = x * sy + y * cy;
      const up = z * cp - y1 * sp, depth = y1 * cp + z * sp;
      return [R.w / 2 + sc * x1, R.h / 2 - sc * up, depth];
    }

    function planePolygon() {
      if (!o.plane) return null;
      const { n, d } = o.plane, pts = [];
      // intersect the plane with the 12 edges of the bounding cube
      const corners = [];
      for (let i = 0; i < 8; i++) corners.push([box[0][i & 1], box[1][(i >> 1) & 1], box[2][(i >> 2) & 1]]);
      const f = (p) => n[0] * p[0] + n[1] * p[1] + n[2] * p[2] + d;
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
        const diff = i ^ j;
        if (diff !== 1 && diff !== 2 && diff !== 4) continue;
        const a = corners[i], b = corners[j], fa = f(a), fb = f(b);
        if ((fa > 0) === (fb > 0)) continue;
        const t = fa / (fa - fb);
        pts.push(a.map((v, k) => v + t * (b[k] - v)));
      }
      if (pts.length < 3) return null;
      const m = [0, 1, 2].map((k) => pts.reduce((s, p) => s + p[k], 0) / pts.length);
      // order around the centroid within the plane
      const nl = Math.hypot(...n), nn = n.map((v) => v / nl);
      const e1 = Math.abs(nn[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
      const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
      const u = cross(nn, e1), v = cross(nn, u);
      const ang = (p) => Math.atan2((p[0] - m[0]) * v[0] + (p[1] - m[1]) * v[1] + (p[2] - m[2]) * v[2],
        (p[0] - m[0]) * u[0] + (p[1] - m[1]) * u[1] + (p[2] - m[2]) * u[2]);
      pts.sort((a, b) => ang(a) - ang(b));
      return pts;
    }
    const plane = planePolygon();

    function draw() {
      const c = panel.clear("#fff");
      // bounding cube
      c.strokeStyle = "#ddd";
      c.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) for (let j = i + 1; j < 8; j++) {
        const diff = i ^ j;
        if (diff !== 1 && diff !== 2 && diff !== 4) continue;
        const a = project([box[0][i & 1], box[1][(i >> 1) & 1], box[2][(i >> 2) & 1]]);
        const b = project([box[0][j & 1], box[1][(j >> 1) & 1], box[2][(j >> 2) & 1]]);
        c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke();
      }
      // axis labels at the far ends of three edges
      c.fillStyle = C.grey;
      c.font = `italic 24px ${C.font}`;
      c.textAlign = "center"; c.textBaseline = "middle";
      const lab = o.axisLabels || ["x", "y", "z"];
      const ends = [[box[0][1] + half * 0.12, box[1][0], box[2][0]], [box[0][0], box[1][1] + half * 0.12, box[2][0]], [box[0][0], box[1][0], box[2][1] + half * 0.12]];
      ends.forEach((e, k) => { const p = project(e); c.fillText(lab[k], p[0], p[1]); });

      // warped grid
      c.strokeStyle = "rgba(90, 90, 90, 0.35)";
      c.lineWidth = 1.2;
      for (const L of o.lines) {
        c.beginPath();
        L.forEach((p, i) => { const q = project(p); if (i === 0) c.moveTo(q[0], q[1]); else c.lineTo(q[0], q[1]); });
        c.stroke();
      }
      // separating plane
      if (plane) {
        c.beginPath();
        plane.forEach((p, i) => { const q = project(p); if (i === 0) c.moveTo(q[0], q[1]); else c.lineTo(q[0], q[1]); });
        c.closePath();
        c.fillStyle = "rgba(17, 85, 204, 0.10)";
        c.fill();
        c.strokeStyle = "rgba(17, 85, 204, 0.6)";
        c.lineWidth = 2;
        c.stroke();
      }
      // points, far to near
      const P = o.points.map((p, i) => [project(p), o.labels[i]]);
      P.sort((a, b) => b[0][2] - a[0][2]);
      c.lineWidth = 1.2;
      c.strokeStyle = "#fff";
      for (const [q, k] of P) {
        c.fillStyle = NN.classColor(k);
        c.beginPath(); c.arc(q[0], q[1], 6, 0, 2 * Math.PI); c.fill(); c.stroke();
      }
    }

    const cv = panel.canvas;
    cv.style.cursor = "grab";
    cv.addEventListener("pointerdown", (e) => { drag = panel.pos(e); cv.setPointerCapture(e.pointerId); cv.style.cursor = "grabbing"; });
    cv.addEventListener("pointermove", (e) => {
      if (!drag) return;
      const p = panel.pos(e);
      yaw += (p.x - drag.x) * 0.008;
      pitch = Optim.clamp(pitch + (p.y - drag.y) * 0.008, -Math.PI / 2, Math.PI / 2);
      drag = p;
      draw();
    });
    cv.addEventListener("pointerup", () => { drag = null; cv.style.cursor = "grab"; });
    panel.onresize = draw;
    draw();
    return { pop, draw, set: (y, p) => { yaw = y; pitch = p; draw(); } };
  }

  window.View3D = { open };
})();
