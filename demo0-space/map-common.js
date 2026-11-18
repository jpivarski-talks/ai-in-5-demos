// Shared pieces for the map demos: the temperature color scale, map projections, and drawing
// of land, floats, and the color bar. Needs stage.js, world.js, and argo.js.
(function () {
  "use strict";
  const C = Stage.COLORS;
  const D2R = Math.PI / 180;

  // ---------------------------------------------------------------- temperature colors
  // cold blue -> pale neutral -> warm red (two hues and a neutral middle, darker at both ends)
  const T_LO = -2, T_HI = 31;
  const STOPS = [
    [-2, [8, 48, 107]], [4, [33, 113, 181]], [10, [125, 182, 220]], [15, [240, 237, 228]],
    [20, [253, 174, 107]], [25, [230, 85, 13]], [31, [127, 39, 4]],
  ];
  function tempRGB(t) {
    if (!(t > STOPS[0][0])) return STOPS[0][1];
    for (let i = 1; i < STOPS.length; i++) {
      if (t <= STOPS[i][0]) {
        const [t0, a] = STOPS[i - 1], [t1, b] = STOPS[i], f = (t - t0) / (t1 - t0);
        return [0, 1, 2].map((k) => a[k] + (b[k] - a[k]) * f);
      }
    }
    return STOPS[STOPS.length - 1][1];
  }
  const tempColor = (t) => `rgb(${tempRGB(t).map(Math.round).join(",")})`;

  // horizontal color bar with ticks in degrees C, in rect r of a canvas context
  function colorBar(c, r, label) {
    const g = c.createLinearGradient(r.x, 0, r.x + r.w, 0);
    for (let t = T_LO; t <= T_HI; t += 1) g.addColorStop((t - T_LO) / (T_HI - T_LO), tempColor(t));
    c.fillStyle = g;
    c.fillRect(r.x, r.y, r.w, r.h);
    c.strokeStyle = "#999"; c.lineWidth = 1; c.strokeRect(r.x + 0.5, r.y + 0.5, r.w - 1, r.h - 1);
    c.font = `18px ${C.font}`; c.fillStyle = C.ink; c.textAlign = "center"; c.textBaseline = "top";
    for (let t = 0; t <= 30; t += 5) {
      const x = r.x + (t - T_LO) / (T_HI - T_LO) * r.w;
      c.beginPath(); c.moveTo(x, r.y + r.h); c.lineTo(x, r.y + r.h + 5); c.stroke();
      c.fillText(String(t), x, r.y + r.h + 7);
    }
    if (label) { c.textAlign = "right"; c.textBaseline = "middle"; c.font = `22px ${C.font}`; c.fillText(label, r.x - 12, r.y + r.h / 2); }
  }

  // ---------------------------------------------------------------- projections
  // each takes longitude, latitude in degrees and returns [x, y] with y pointing up;
  // "fold" is true where the projection lays two parts of the globe on top of each other
  function mollweideTheta(phi) {
    if (Math.abs(phi) > Math.PI / 2 - 1e-9) return Math.sign(phi) * Math.PI / 2;
    let th = phi;
    for (let k = 0; k < 30; k++) {
      const f = 2 * th + Math.sin(2 * th) - Math.PI * Math.sin(phi);
      const d = f / (2 + 2 * Math.cos(2 * th));
      th -= d;
      if (Math.abs(d) < 1e-10) break;
    }
    return th;
  }
  const ORTHO = { lon0: 10 * D2R, lat0: 25 * D2R };
  const PROJECTIONS = {
    latlon: (lon, lat) => [lon * D2R, lat * D2R],
    mercator: (lon, lat) => {
      const p = Math.max(-80, Math.min(80, lat)) * D2R;
      return [lon * D2R, Math.log(Math.tan(Math.PI / 4 + p / 2))];
    },
    equalArea: (lon, lat) => {
      const th = mollweideTheta(lat * D2R);
      return [2 * Math.SQRT2 / Math.PI * lon * D2R * Math.cos(th), Math.SQRT2 * Math.sin(th)];
    },
    equidistant: (lon, lat) => {
      const rho = Math.PI / 2 - lat * D2R, l = lon * D2R;
      return [rho * Math.sin(l), -rho * Math.cos(l)];
    },
    globe: (lon, lat) => {
      const l = lon * D2R - ORTHO.lon0, p = lat * D2R;
      return [Math.cos(p) * Math.sin(l), Math.cos(ORTHO.lat0) * Math.sin(p) - Math.sin(ORTHO.lat0) * Math.cos(p) * Math.cos(l)];
    },
  };
  // the extent of each projection's whole world, for scaling it to fit a panel
  const EXTENT = {
    latlon: [-Math.PI, Math.PI, -Math.PI / 2, Math.PI / 2],
    mercator: [-Math.PI, Math.PI, -2.4362, 2.4362],
    equalArea: [-2 * Math.SQRT2, 2 * Math.SQRT2, -Math.SQRT2, Math.SQRT2],
    equidistant: [-Math.PI, Math.PI, -Math.PI, Math.PI],
    globe: [-1, 1, -1, 1],
  };

  // project a flat [lon, lat, lon, lat, ...] array into panel pixels, fit (centered) into rect r
  function project(name, lonlat, r, out) {
    const f = PROJECTIONS[name], [x0, x1, y0, y1] = EXTENT[name];
    const s = Math.min(r.w / (x1 - x0), r.h / (y1 - y0));
    const cx = r.x + r.w / 2 - s * (x0 + x1) / 2, cy = r.y + r.h / 2 + s * (y0 + y1) / 2;
    out = out || new Float32Array(lonlat.length);
    for (let i = 0; i < lonlat.length; i += 2) {
      const [x, y] = f(lonlat[i], lonlat[i + 1]);
      out[i] = cx + s * x;
      out[i + 1] = cy - s * y;
    }
    return out;
  }

  // ---------------------------------------------------------------- drawing on a plain lat/long map
  // map rect r covers longitude -180..180 and latitude -90..90
  const mapX = (r, lon) => r.x + (lon + 180) / 360 * r.w;
  const mapY = (r, lat) => r.y + (90 - lat) / 180 * r.h;

  function landPath(c, r) {
    c.beginPath();
    for (const p of window.WORLD) {
      c.moveTo(mapX(r, p[0]), mapY(r, p[1]));
      for (let i = 2; i < p.length; i += 2) c.lineTo(mapX(r, p[i]), mapY(r, p[i + 1]));
      c.closePath();
    }
  }
  const LAND_FILL = "#d6d6d6", LAND_EDGE = "#9a9a9a";
  function drawLand(c, r, fill) {
    landPath(c, r);
    if (fill) { c.fillStyle = LAND_FILL; c.fill(); }
    c.strokeStyle = LAND_EDGE; c.lineWidth = 1.2; c.lineJoin = "round"; c.stroke();
  }

  // the Argo floats as dots colored by temperature, with a dark ring so they show on any background
  const DOT_R = 6;
  function drawFloats(c, xy, temps, highlight) {
    c.lineWidth = 1.4;
    for (let i = 0; i < temps.length; i++) {
      c.beginPath(); c.arc(xy[2 * i], xy[2 * i + 1], DOT_R, 0, 2 * Math.PI);
      c.fillStyle = tempColor(temps[i]); c.fill();
      c.strokeStyle = "rgba(40, 40, 40, 0.75)"; c.stroke();
    }
    if (highlight != null) {
      c.lineWidth = 3; c.strokeStyle = C.ink;
      c.beginPath(); c.arc(xy[2 * highlight], xy[2 * highlight + 1], DOT_R + 4, 0, 2 * Math.PI); c.stroke();
    }
  }

  function floatsLonLat() {
    const a = new Float32Array(2 * window.ARGO.length);
    window.ARGO.forEach((f, i) => { a[2 * i] = f[0]; a[2 * i + 1] = f[1]; });
    return a;
  }
  const temps = () => window.ARGO.map((f) => f[2]);

  // a tooltip box listing a float's measurements, near (x, y) in stage pixels
  function tooltip() {
    const d = Stage.el("div");
    Object.assign(d.style, {
      position: "absolute", display: "none", pointerEvents: "none", zIndex: 20,
      background: "rgba(255, 255, 255, 0.95)", border: "1.5px solid #999", borderRadius: "8px",
      padding: "8px 14px", fontSize: "20px", lineHeight: "1.4", color: C.ink, whiteSpace: "nowrap",
      boxShadow: "0 4px 14px rgba(0, 0, 0, 0.15)",
    });
    return {
      show(f, x, y) {
        const [lon, lat, t, s, p, day, id] = f;
        const deg = (v, pos, neg) => `${Math.abs(v).toFixed(1)}° ${v >= 0 ? pos : neg}`;
        d.innerHTML =
          `<b>${t.toFixed(1)} °C</b><br>` +
          `salinity ${s == null ? "(not measured)" : (s / 10).toFixed(2) + "% salt"}<br>` +
          `pressure ${p.toFixed(1)} dbar (${Math.max(1, Math.round(p))} m deep)<br>` +
          `<span style="color:${C.grey}">${deg(lat, "N", "S")}, ${deg(lon, "E", "W")}<br>float ${id}, ${day}</span>`;
        d.style.display = "block";
        const w = d.offsetWidth, h = d.offsetHeight;
        d.style.left = Math.min(Stage.W - w - 10, Math.max(10, x + 16)) + "px";
        d.style.top = (y - h - 14 < 10 ? y + 16 : y - h - 14) + "px";
      },
      hide() { d.style.display = "none"; },
    };
  }

  window.MapC = {
    T_LO, T_HI, tempRGB, tempColor, colorBar, PROJECTIONS, EXTENT, project, ORTHO,
    mapX, mapY, landPath, drawLand, drawFloats, floatsLonLat, temps, tooltip, DOT_R, LAND_FILL, LAND_EDGE,
  };
})();
