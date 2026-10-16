# Technical references

Official public documentation consulted for this update on 2026-10-15. These references support the integration design, not a claim that cloud deployment was completed.

| Area | Official documentation |
|---|---|
| Worker static assets, ASSETS binding, API-first routing | https://developers.cloudflare.com/workers/static-assets/binding/ |
| Cloudflare location fields | https://developers.cloudflare.com/workers/examples/geolocation-hello-world/ |
| Cloudflare trusted request headers | https://developers.cloudflare.com/fundamentals/reference/http-headers/ |
| D1 creation/binding | https://developers.cloudflare.com/d1/get-started/ |
| D1 SQL/SQLite support | https://developers.cloudflare.com/d1/sql-api/sql-statements/ |
| D1 migrations command | https://developers.cloudflare.com/d1/wrangler-commands/ |
| D1 batch and prepared statements | https://developers.cloudflare.com/d1/worker-api/d1-database/ |
| Worker secrets and deploy commands | https://developers.cloudflare.com/workers/wrangler/commands/workers/ |
| Wrangler system/version requirements | https://developers.cloudflare.com/workers/wrangler/install-and-update/ |
| GitHub Pages scope | https://docs.github.com/en/pages/getting-started-with-github-pages/what-is-github-pages |
| Natural Earth public-domain terms | https://www.naturalearthdata.com/about/terms-of-use/ |

The sample uses Wrangler major version 4 through npx, not a pinned minor tested in this environment. Lock the actually verified tooling version in the deployment environment after an initial successful deployment. No guarantee about current pricing, service availability in every region or universal legal compliance is made.
