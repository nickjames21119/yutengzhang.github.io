# v4 verification report

Final successful checks: **45 Python tests, 62 Node.js tests, 77 browser checks**.

## What was exercised

| Suite | Result | Scope |
|---|---:|---|
| Python standard library | 45 / 45 | Build validation, EN/ZH/CV generation, local references and IDs, escaping, configuration rejection, unchanged avatar hash, single-ground bounds, visitor configuration helper, HTTP byte/status/MIME checks |
| Node.js | 62 / 62 | Geometry/matrix/quaternion/state logic, route continuity, vertex buffers, syntax of browser modules, safe aggregate projection, Worker request handling, real SQLite schema/trigger operations behind a D1-shaped test adapter |
| Chromium | 77 / 77 | Frameless/labelless scene, true drag rotation, hover fade, captured-pointer release, keyboard/touch interaction, theme/font/avatar/cursor, publication filters and removed UI, map empty/error states, mocked consent/API rendering, motion preference and resource disposal, 360/390/768/1024/1440 layout widths |

Node total consists of 30 scene/mathematics checks, 3 visitor-client utility checks and 29 backend checks. The browser's mocked transport verifies the client protocol without submitting real visitor records. One test-created aggregate marker is rendered only after all page previews have been captured; it is never embedded in production assets or preview images.

Final raw records are included in `verification/python-results.txt`, `verification/node-results.txt` and `verification/browser-report.json`.

## Environment and explicit limits

Local preparation environment: Python 3.13.5; Node.js 22.16.0; Chromium 144.0.7559.96 on Linux. The package targets Python 3.10+ for build/preview, but only the listed local versions were actually executed here.

Managed Chromium navigation to local HTTP URLs returned `ERR_BLOCKED_BY_ADMINISTRATOR`. Therefore browser checks loaded the exact generated HTML, CSS and source JavaScript modules into a blank test page, resolving module imports to Blob URLs. API fetches were replaced by a test-only transport. Python independently served every generated static file over HTTP and checked status, length and JavaScript MIME type. **These two checks do not amount to end-to-end browser HTTP deployment verification.**

WebGL could not be activated in this environment. All screenshots and browser checks used the included CPU three-dimensional compatibility renderer (`canvas3d`), with the same world geometry and camera transforms as the WebGL adapter. GPU shader performance, rendering on a physical GPU and WebGL context restoration on real hardware remain unverified.

The backend test adapter uses actual in-memory SQLite and the exact D1 migration to test unique keys, inserts, triggers, aggregation and pruning. It does **not** run the Cloudflare production runtime or validate actual edge geolocation fields. No D1 database has been created in the user's account, no Worker deployed, no token set, no real IPs collected, and no production abuse/load test performed.

During development, checks exposed outdated UI assumptions and timing assumptions; they were corrected and the final successful suites rerun. One later combined verification process exceeded the tool's execution window and was interrupted; a subsequent standalone browser run completed with all 77 checks passing. The recorded passing results do not claim that every intermediate attempt passed.

## Browser preview meaning

`dark-city.png`, `dark-agents.png`, `light-city.png`, `publications.png`, `visitor-map.png` and `mobile.png` are rendered from this site's code. They are not generated design mockups. The visitor screenshot intentionally shows unconfigured state and no markers. An optional GIF is a sequence of captured browser frames for visual illustration, not measured real-time frame-rate evidence.

## Reproduce

From the source root:

```bash
python scripts/build.py
python -m unittest discover -s tests -p 'test_*.py' -v
node --test tests/*.test.mjs
```

Browser tools are development-only dependencies, not needed to run the site:

```bash
python -m pip install playwright
python -m playwright install chromium
python tests/browser_smoke.py --chromium /actual/path/to/chromium
```

When local browser navigation is restricted, the explicitly labeled fallback is:

```bash
python tests/browser_smoke.py --offline-inject --chromium /actual/path/to/chromium
```

Use the actual Chromium executable path. On a system with `chromium` in PATH, `--chromium` may be omitted. The normal HTTP browser mode is provided for maintainers but was not verified in this environment. Cloud deployment workflows and Wrangler commands require a real account and are not included in the passing runtime count.

Before public release, verify the real Worker URL and D1 binding, submit a consenting test visit from a normal browser, inspect the true API response, and check display on a physical GPU/mobile device. No automated test suite proves absence of all defects.
