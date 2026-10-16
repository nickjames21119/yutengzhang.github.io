#!/usr/bin/env python3
"""Build and preview the website locally. Python 3.10+; standard library only."""
from __future__ import annotations
import argparse
import json
import functools
import threading
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from build import build, DIST

class PreviewHandler(SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0].startswith('/api/'):
            self.send_response(503)
            self.send_header('Content-Type','application/json; charset=utf-8')
            self.end_headers()
            self.wfile.write(b'{"status":"unconfigured"}')
            return
        super().do_GET()

    def do_POST(self):
        self.send_response(503)
        self.send_header('Content-Type','application/json; charset=utf-8')
        self.end_headers()
        self.wfile.write(b'{"status":"unconfigured"}')

    def log_message(self, format, *args):
        # Do not print client network addresses in this development server.
        pass

    def end_headers(self) -> None:
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def list_directory(self, path: str):
        self.send_error(403, 'Directory listing is disabled')
        return None

def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8000)
    parser.add_argument('--host', default='127.0.0.1', help='Bind address; loopback by default')
    parser.add_argument('--open', action='store_true', help='Open your default browser')
    parser.add_argument('--no-build', action='store_true', help='Serve the existing dist folder unchanged')
    args = parser.parse_args()
    if not 1 <= args.port <= 65535:
        parser.error('--port must be between 1 and 65535')
    try:
        if not args.no_build:
            build()
        if not (DIST / 'index.html').exists():
            parser.exit(1, 'dist/index.html is missing. Run python scripts/build.py first.\n')
        handler = functools.partial(PreviewHandler, directory=str(DIST))
        with ThreadingHTTPServer((args.host, args.port), handler) as server:
            hostname = '127.0.0.1' if args.host in ('0.0.0.0', '::') else args.host
            url = f'http://{hostname}:{args.port}/'
            print(f'\nYuteng Zhang | Academic website\nPreview: {url}\nServing: {DIST}\nPress Ctrl+C to stop.\n', flush=True)
            if args.open:
                timer = threading.Timer(.3, lambda: webbrowser.open(url))
                timer.daemon = True
                timer.start()
            try:
                server.serve_forever()
            except KeyboardInterrupt:
                print('\nPreview stopped.')
    except OSError as error:
        parser.exit(1, f'Cannot start preview: {error}\nTry another port: python scripts/serve.py --port 8001\n')
    except (ValueError, KeyError, TypeError) as error:
        parser.exit(1, f'Build failed: {error}\n')

if __name__ == '__main__':
    main()
