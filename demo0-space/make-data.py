#!/usr/bin/env python3
"""Make the data files for demo0-space (run once; the outputs are committed).

    python3 make-data.py

argo.js   sea-surface measurements by the Argo floats over 36 hours (one per float), from the
          Argo Global Data Assembly Centre via Ifremer's ERDDAP server: for each profile, the
          shallowest measurement within 10 dbar (about 10 m) of the surface, with good quality flags.
world.js  Natural Earth's 1:110m land polygons (public domain), rounded to 0.1 degree, with long
          edges subdivided (at most 1 degree) so they bend smoothly under map projections.

Only the Python standard library is used.
"""

import csv
import io
import json
import math
import os
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))

START, STOP = "2025-03-01T00:00:00Z", "2025-03-02T12:00:00Z"
ARGO_URL = (
    "https://erddap.ifremer.fr/erddap/tabledap/ArgoFloats.csv?"
    "platform_number,cycle_number,time,latitude,longitude,pres,temp,psal,pres_qc,temp_qc,psal_qc,position_qc"
    f"&time%3E={START}&time%3C{STOP}&pres%3C=10"
)
LAND_URL = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ne_110m_land.geojson"


def fetch(url):
    with urllib.request.urlopen(url, timeout=600) as r:
        return r.read().decode("utf-8")


def argo():
    rows = list(csv.reader(io.StringIO(fetch(ARGO_URL))))[2:]   # two header lines: names, units
    best = {}
    for float_id, cycle, time, lat, lon, pres, temp, psal, pq, tq, sq, xq in rows:
        if not (pq == tq == xq == "1") or not temp or not pres:
            continue
        rec = (float(lon), float(lat), float(temp), float(psal) if psal and sq == "1" else None,
               float(pres), time[:10], int(float_id))
        prev = best.get(float_id)
        # one record per float: its first profile in the window, shallowest measurement
        key = (time, rec[4])
        if prev is None or key < prev[0]:
            best[float_id] = (key, rec)
    out = []
    for _, (lon, lat, temp, psal, pres, day, fid) in sorted(best.values(), key=lambda kv: kv[1][6]):
        out.append([round(lon, 2), round(lat, 2), round(temp, 2), None if psal is None else round(psal, 2),
                    round(pres, 1), day, fid])
    with open(os.path.join(HERE, "argo.js"), "w") as f:
        f.write("// Argo floats' sea-surface measurements, %s to %s (see make-data.py).\n" % (START, STOP))
        f.write("// [longitude, latitude, temperature (deg C), salinity (PSU), pressure (dbar), date, float]\n")
        f.write("window.ARGO = [\n")
        for r in out:
            f.write(json.dumps(r, separators=(",", ":")) + ",\n")
        f.write("];\n")
    print("argo.js:", len(out), "floats")


def densify(ring, step=1.0):
    out = []
    for (x0, y0), (x1, y1) in zip(ring, ring[1:]):
        n = max(1, math.ceil(max(abs(x1 - x0), abs(y1 - y0)) / step))
        for k in range(n):
            out.append((x0 + (x1 - x0) * k / n, y0 + (y1 - y0) * k / n))
    out.append(ring[-1])
    return out


def world():
    land = json.loads(fetch(LAND_URL))
    polys = []
    for feat in land["features"]:
        g = feat["geometry"]
        parts = [g["coordinates"]] if g["type"] == "Polygon" else g["coordinates"]
        for poly in parts:
            ring = densify(poly[0])   # outer ring only (the 110m land has no lakes cut out)
            flat, last = [], None
            for x, y in ring:
                p = (round(max(-180, min(180, x)), 1), round(max(-90, min(90, y)), 1))
                if p != last:
                    flat.extend(p)
                last = p
            if len(flat) >= 6:
                polys.append(flat)
    with open(os.path.join(HERE, "world.js"), "w") as f:
        f.write("// Natural Earth 1:110m land (public domain, naturalearthdata.com), see make-data.py.\n")
        f.write("// Each polygon is a flat list of longitude, latitude pairs, in degrees.\n")
        f.write("window.WORLD = [\n")
        for p in polys:
            f.write(json.dumps(p, separators=(",", ":")) + ",\n")
        f.write("];\n")
    print("world.js:", len(polys), "polygons,", sum(len(p) for p in polys) // 2, "points")


if __name__ == "__main__":
    argo()
    world()
