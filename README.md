Current release: **v8**. See [START_HERE_V8_CN.md](START_HERE_V8_CN.md) for changes, deployment and testing.

Earlier release: **v7**. Its historical notes remain at [START_HERE_V7_CN.md](START_HERE_V7_CN.md).

> **v6 updated guide:** [START_HERE_V6_CN.md](START_HERE_V6_CN.md) (Chinese, with source and GitHub Pages instructions). Previous details below may refer to v5.1.

> **Current release v5.1:** See [UPGRADE_V5_1.md](UPGRADE_V5_1.md) and [START_HERE_CN.md](START_HERE_CN.md) first. Below is the original architecture documentation.

# Yuteng Zhang — Academic homepage v4

[中文运行说明](README_CN.md) · [Visitor-service setup](docs/VISITOR_MAP_SETUP_CN.md) · [Architecture](ARCHITECTURE.md) · [Test report](TEST_REPORT.md)

A maintainable static academic site with a single-ground 3D urban district, traffic, smooth hover reveal of a non-anthropomorphic agent network, quaternion drag controls, an unchanged user-selected avatar, black/gold and light themes, bilingual content, restrained typography, text-only publication rows and a matching custom cursor.

## Preview

Python 3.10+, no third-party packages:

```bash
python scripts/serve.py --open
```

On macOS/Linux, use `python3` as needed. Windows also has `run.bat`.
Open `http://127.0.0.1:8000/`; keep the terminal open. Do not use `file://` for ES modules.

Edit `data/profile.json` for content, `data/scene.json` for geometry and animation, and `data/visitors.json` for the visitor-service endpoint. Run `python scripts/build.py` after edits. `dist/` is generated, not the authoring source.

## Visitor records

A bundled Cloudflare Worker + D1 implementation accepts **explicitly opted-in** visitor records, infers coarse 2° cells from Cloudflare request metadata and renders public aggregates. Raw IPs are never persisted by application code. Daily secret-keyed HMAC deduplication entries are retained for approximately 24–48 hours; regional counts for 90 days. DNT/GPC are respected. Counts are daily-deduplicated network visits, not unique people or precise city locations.

**No cloud service has been deployed or configured in this package.** The local server returns an honest unconfigured state, the base map is self-hosted, and no fabricated visitor dots or totals ship. Static hosting alone cannot record shared persistent visits. Follow the setup guide to deploy the Worker and database, either with the site or alongside GitHub Pages.

## Checks

```bash
python scripts/build.py
python -m unittest discover -s tests -p 'test_*.py'
node --test tests/*.test.mjs
```

Node.js 22+ is needed only for backend tests/deployment. Browser regression uses Playwright installed separately. This delivery was tested with offline source-module loading and CPU 3D rendering because browser loopback navigation and WebGL were unavailable. No actual Cloudflare deployment, production D1 transaction or physical GPU test is claimed.

The map coastlines derive from public-domain Natural Earth geometry; the avatar is the user's supplied asset. See `ASSET_LICENSES.md`. No external fonts are bundled.
