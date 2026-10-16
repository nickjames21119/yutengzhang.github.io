# v4 Architecture and maintenance

## Boundaries

Content is server-rendered at build time by Python's standard library; no client framework is needed to read publications or biography. JavaScript progressively enhances interaction. The visitor backend is separate from the site's static build and can be deployed or removed independently.

| Layer | Owner | Inputs → outputs |
|---|---|---|
| Content/config validation | `scripts/build.py`, `experience.py`, `visitors.py` | JSON + templates + local assets → bilingual HTML, CV, assets, sitemap |
| Base semantic layout | `styles.css` | Article/research/timeline/CV rules |
| Shared visual identity | `experience.css` | Black/gold and light tokens, frameless stage, page motion |
| Final v4 sizing | `refinement.css` | Editorial font scale, responsive proportions, custom cursors |
| Scene lifecycle | `scene/SceneController.js` | Pointer/keyboard/theme/motion → transforms and frame data |
| Procedural city | `geometry/urbanDistrict.js`, `layers/CityLayer.js` | Validated city config + seed → meshes and traffic routes |
| Agent visualization | `layers/AgentLayer.js` | Node positions + time/reveal → crystalline nodes and curved light links |
| Rendering adapters | `core/Renderer.js`, `core/SoftwareRenderer.js` | Same buffers/MVP → WebGL or CPU-depth pixels |
| Interaction | `core/ArcballControls.js`, `interaction/Pointer.js` | Device events → quaternion, cursor state |
| Page motion | `motion/PageMotion.js` | Viewport + visibility + preference → reveal/CSS/motion events |
| Visitor client | `visitors/VisitorMap.js` | Consent + aggregate API → safe SVG markers/counters |
| Visitor backend | `backend/worker.js` | Trusted CF metadata + explicit consent → D1 write/aggregate read |

`styles.css` is shared with the printable CV. Do not globally replace it to change one hero size. Keep final homepage size changes in `refinement.css`, shared color tokens in `experience.css`, and map-specific appearance in `visitors/visitors.css`.

## Scene flow

```text
scene.json → validation → inline scene-data → SceneController
                                             ├─ ArcballControls → quaternion
                                             ├─ state.js → reveal target / motion eligibility
                                             └─ layer registry → city / agents / ambient
                                                    ↓
                                     update(time) → render(frame)
                                                    ↓
                                           reusable renderer buffers
```

All buildings have `base = 0` and grow upward on one xz ground plane. The canal, bridges, street grid, elevated rails and vehicles share world coordinates. No face basis transforms or cube-city module remain. The building heights and perspective provide actual depth.

A fade variable `reveal` runs from 0 to 1. Hover changes its target; damping produces gradual transparency changes. `pointerdown` latches the currently dominant scene so it does not change under a drag. Pointer capture preserves rotation outside the canvas; releasing recomputes hover from the release coordinates. The scene then returns to automatic hover behavior.

The final model-view-projection composes camera distance, user quaternion, idle yaw rotation and a scene target translation. The same matrix applies to roads, buildings, Agent nodes and light links. This avoids visually independent layers drifting when rotated.

Agent geometry is illustrative, not an inference graph extracted from a model. It has no anthropomorphic features and no rendered text labels. IDs/labels in JSON remain useful as metadata and for future module extensions; they do not create DOM labels.

Idle animation stops when offscreen, hidden or reduced. Manual rotation and requested transitions remain possible. No wheel zoom listener or visible control toolbar is attached. Keyboard controls are preserved for accessibility. An internal `setView()` method is a maintenance/testing API, not a UI feature.

## Add a scene layer

Create `public/assets/scene/layers/YourLayer.js`:

```javascript
export class YourLayer {
  constructor(renderer, config) {
    this.renderer = renderer;
    // Allocate your buffers once, using the same mesh API as existing layers.
  }
  update(time) {
    // Reuse arrays/buffers; do not register window listeners here.
  }
  render({mvp, reveal, day, time}) {
    // Use the shared MVP and theme interpolation. Inspect CityLayer for examples.
  }
  dispose() {
    // Release each allocated mesh exactly once.
  }
}
```

Register a factory in `layers/registry.js`. Keep storage, fetch requests and LLM calls out of render loops. An expensive layout algorithm belongs in preprocessing, not in every frame. Unit-test finite vertices, route continuity, the required mesh API and buffer disposal.

## Visitor data flow

GET and POST are deliberately separate. The map can show existing public aggregates without permission to record the current viewer. A visitor must opt in before the client sends `{ "consent": true }` to POST. Saved choices expire in 180 days.

Only `request.cf` and Cloudflare connection headers are accepted for geolocation/deduplication. The request body cannot set IP, coordinates, country or counts. The Worker has no public admin endpoint or data-dump endpoint.

The SQLite migration uses a unique `(day, token)` primary key and an AFTER INSERT trigger. An `INSERT OR IGNORE` only fires the aggregation trigger for a new daily token. Duplicate parallel requests cannot independently increment a read-then-write counter. The test suite exercises this using actual in-memory SQLite behind a D1-shaped adapter; this is not a substitute for cloud integration testing.

GET groups `visit_days` across the last 90 UTC dates, returns no HMACs/IPs and caps the map response to 1500 cells. Cron performs physical pruning separately. If extending retention, display period or resolution, update both server constants and privacy copy in `scripts/visitors.py`.

The consent record is a local preference, not an authentication credential or a tracking ID. CORS only constrains browser origins; non-browser clients can forge headers. Edge rate limiting and account-level usage limits remain operational responsibilities. The optional `VISIT_LIMITER` hook requires an actual configured Cloudflare binding to do anything.

## Custom cursor

The actual pointer is a local SVG `cursor:` URL with a visible fallback, never `cursor:none`. The separate inertial ring has `pointer-events:none`; it cannot block clicks. It starts a short animation loop only while moving. Touch/high-contrast environments retain functional standard behavior. No pointer-lock API is used.

## Safe publishing

Only `public/` and generated HTML enter `dist/`. JSON content and scene settings are serialized safely; secrets, Worker source, raw user photos, private research/transcripts, D1 dumps, `.dev.vars` and `.wrangler` must never enter that directory. Current avatar is exactly the user's selected cartoon, not generated or color-processed in this update.

Public-only configuration lives in `wrangler.jsonc` and `data/visitors.json`; secret values must be set through Wrangler/cloud secrets. `configure_visitors.py` validates every supplied value before writing either file and never makes network requests.

## Build/test expectations

After structural changes, rebuild, run the Python and Node suites, and inspect both themes at narrow and wide sizes. `tests/browser_smoke.py` supports local HTTP and an explicit offline-injection option for restricted environments. Its API fixture is test-only; keep synthetic records outside `public/` and production D1.
