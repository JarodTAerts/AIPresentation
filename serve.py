#!/usr/bin/env python3
"""
Local dev server that mimics the Azure Static Web Apps rewrite rules
defined in public/staticwebapp.config.json.

Usage:
    python3 serve.py          # serves on http://localhost:8000
    python3 serve.py 8080     # custom port
"""
import http.server
import socketserver
import os
import sys
import posixpath
from urllib.parse import urlsplit

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "public")
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class SWAHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def translate_path(self, path):
        # Strip query string for rewrite decisions
        url_path = urlsplit(path).path
        rewritten = self._rewrite(url_path)
        if rewritten != url_path:
            # Rebuild path so SimpleHTTPRequestHandler serves the rewritten file
            path = rewritten
        return super().translate_path(path)

    def _rewrite(self, url_path):
        # Normalize
        url_path = posixpath.normpath(url_path)

        # /presentation (bare) -> /watch.html  (slides preview + livestream embed)
        if url_path == "/presentation":
            return "/watch.html"

        # /presentation/* -> /presentation.html  (actual slide deck, deep-linkable)
        if url_path.startswith("/presentation/"):
            return "/presentation.html"

        # Bare root or directory -> index.html (default behavior already, but explicit)
        if url_path in ("/", ""):
            return "/index.html"

        # If the path has no extension and no matching file/dir, fall back to index.html
        # (SPA-style fallback, mirrors SWA navigationFallback)
        _, ext = posixpath.splitext(url_path)
        if not ext:
            candidate = os.path.join(ROOT, url_path.lstrip("/"))
            if not os.path.exists(candidate):
                return "/index.html"

        return url_path

    def log_message(self, format, *args):
        sys.stderr.write("[%s] %s\n" % (self.log_date_time_string(), format % args))


def main():
    socketserver.TCPServer.allow_reuse_address = True
    with socketserver.TCPServer(("", PORT), SWAHandler) as httpd:
        print(f"Serving {ROOT}")
        print(f"  → http://localhost:{PORT}/")
        print(f"  → http://localhost:{PORT}/presentation")
        print(f"  → http://localhost:{PORT}/presentation/5")
        print("Ctrl-C to stop.")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nbye")


if __name__ == "__main__":
    main()
