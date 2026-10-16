# v8 verification report — 2026-10-16

## Offline and unit checks

- `python scripts/build.py`: passed.
- `python -m unittest discover -s tests -p 'test*.py'`: **99 tests passed** (including 10 new v8 requirements checks).
- `node --test tests/*.test.mjs`: **62 tests passed** (scene math, visitor API, client/map behavior).
- Source scene modules: all 13 recorded SHA-256 checks still match the established 3D city/agent code.

## Browser checks

- Chromium with offline source-module loading and CPU 3D fallback: desktop 1440px, mobile 390px and 320px, **no horizontal overflow** and no page JavaScript exceptions in the targeted layout checks.
- Header identity beside logo, advisor underline, ThinkLab link removal, no category/search UI, `Publication` heading and Freight summary: verified against rendered DOM and computed CSS.
- 26 small star points with four cross-glints: no 16px square artifacts in final CSS, night mode animation running, dark/light visibility checked. Drift transform changed between measured frames.
- Hover -> Agent reveal -> drag rotation -> leave -> city: passed in independent browser check. Light mode correctly hides stars.
- Extended historical browser smoke suite completed **67 individual assertions** before hitting the runtime timeout in mobile touch-emulation; it is **not reported as a complete pass**. All 67 assertions before termination were successful.

## Not claimed

- No physical GPU WebGL or production GitHub Pages/Cloudflare deployment tests. Browser loaded JS modules through offline test mapping, not a publicly hosted environment.
- Visitor map application/backend remains packaged but requires separate configuration and one-time Cloudflare Worker+D1 deployment to show actual visits. No live visitor data is stored in this package.
