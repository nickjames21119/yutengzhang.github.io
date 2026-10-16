# Test report — v5.1

- `python scripts/build.py`: PASS.
- `python -m unittest discover -s tests -p "test_*.py"`: **60 passed**.
- `node --test tests/*.test.mjs`: **62 passed** (including D1/Worker tests via mocks).
- Chromium CSS/layout checks at widths **360, 375, 390, 430, 740, 768, 980, 1024, 1050, 1200, 1440 px**: all without horizontal overflow.
- Existing Chromium browser-smoke suite: **58 checks passed** through graphics resource disposal; the full suite run did not finish before the tool timeout, so no claim is made that all browser smoke checks completed.
- The screenshots are offline Chrome renderings using original geometry/scene modules and an emulated API returning unavailable status; they contain **no simulated visitor locations**.
- Cloudflare Worker deployment, real production IP geolocation, live GitHub Pages hosting and real GPU WebGL are **not verified**. They require the owner's credentials and environment.

These tests do not prove absence of bugs and do not represent live production traffic.
