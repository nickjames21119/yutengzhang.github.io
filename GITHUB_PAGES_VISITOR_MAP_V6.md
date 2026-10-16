# GitHub Pages + live visitor map (v6)

The webpage stays on `github.io`. GitHub Pages cannot execute server-side code or store a visitor history. Therefore a one-time, separate Cloudflare Worker + D1 deployment is necessary. After setup, each future GitHub Pages deployment works without a local server. The map requests the live aggregate at the external HTTPS Worker API. No fake visitor positions are bundled.

## First-time setup

1. Create a Cloudflare account and log in with `npx wrangler@4 login`.
2. Run `npx wrangler@4 d1 create yuteng-visitors` and copy the UUID.
3. Run `python scripts/configure_visitors.py --database-id UUID --allow-origin https://YOUR_GITHUB_USERNAME.github.io`. The allowed origin excludes repository paths.
4. `npx wrangler@4 d1 migrations apply yuteng-visitors --remote` then `npx wrangler@4 deploy`.
5. `npx wrangler@4 secret put VISITOR_SECRET` (at least 32 random characters, generate with Python `secrets.token_hex(32)`).
6. Take the actual HTTPS Worker URL printed by deploy, append `/api`, and set it in the front-end: `python scripts/configure_visitors.py --api-base https://YOUR_WORKER.workers.dev/api`.
7. `python scripts/build.py`, commit the **source project** to GitHub; select GitHub Actions in Settings > Pages. The included `pages.yml` builds and publishes it.
8. Test the Worker API response in your browser: `https://YOUR_WORKER.workers.dev/api/visitors`. It should return `status:ok` and empty aggregates initially. Then opt in on the site and confirm a point is shown.

For a project Pages URL, use `https://YOUR_GITHUB_USERNAME.github.io` as CORS origin, not a URL with `/repository`. Confirm `wrangler.jsonc` has `ALLOWED_ORIGINS` set to exactly your public site origin.

## Design/privacy

No explanatory paragraph appears beneath the map. Dots blink with asynchronous phase delays and pulse. Only genuine records appear. A compact `◎` settings button remains so visitors can choose whether to contribute; consent is required by this implementation and DNT/GPC is respected. Status is screen-reader accessible but visually hidden. The back-end records coarse 2-degree IP-inferred grid aggregates, does not persist raw IP in the application database, and retains 90 days of aggregates; hosting platform connection logs are separate.

**Important:** There is no honest zero-configuration static-only way for GitHub Pages to automatically collect and persist real visitor IP locations. The Cloudflare deployment above is a one-time external service setup. Avoid putting GeoIP keys or private tokens in client-side JavaScript.
