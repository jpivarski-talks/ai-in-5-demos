#!/usr/bin/env python3
"""Serve the repository like `python -m http.server`, but reload the talk whenever it's saved.

    ./serve-live.py [PORT]      (default 8000), then open http://localhost:8000/

index.html is not modified on disk: a small polling script is added to it as it is served.
When index.html, talk.css, or anything in common/ changes, the page reloads, and because
Reveal's URL tracks the slide (#/slide-id), it comes back on the same slide.
"""

import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
WATCHED = ["index.html", "talk.css", "common"]

SNIPPET = b"""
<script>
// added by serve-live.py (not in index.html on disk): reload when the talk's files change
(() => {
  let last = null;
  setInterval(async () => {
    try {
      const now = await (await fetch("/__mtime", { cache: "no-store" })).text();
      if (last !== null && now !== last) location.reload();
      last = now;
    } catch (e) {}  // server restarting; try again next time
  }, 500);
})();
</script>
"""


def latest_mtime():
    times = []
    for name in WATCHED:
        path = os.path.join(ROOT, name)
        if os.path.isdir(path):
            for dirpath, _, filenames in os.walk(path):
                times.extend(os.stat(os.path.join(dirpath, f)).st_mtime_ns for f in filenames)
        elif os.path.exists(path):
            times.append(os.stat(path).st_mtime_ns)
    return str(max(times, default=0))


class Handler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        path = self.path.split("?")[0].split("#")[0]
        if path == "/__mtime":
            self.send_body(latest_mtime().encode(), "text/plain")
        elif path in ("/", "/index.html"):
            with open(os.path.join(ROOT, "index.html"), "rb") as file:
                html = file.read()
            i = html.rfind(b"</body>")
            html = html + SNIPPET if i < 0 else html[:i] + SNIPPET + html[i:]
            self.send_body(html, "text/html; charset=utf-8")
        else:
            super().do_GET()

    def send_body(self, body, content_type):
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        # so that reloaded CSS and demo files aren't stale copies from the browser's cache
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, format, *args):
        if not self.path.startswith("/__mtime"):
            super().log_message(format, *args)


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    handler = functools.partial(Handler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("", port), handler) as server:
        print(f"serving {ROOT} at http://localhost:{port}/ (reloads when the talk is saved)")
        server.serve_forever()
