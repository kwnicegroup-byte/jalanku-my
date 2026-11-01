# JALANKU Nearby API (Cloudflare Worker)

This is a backend deployment package. It is deliberately separate from the live GitHub Pages app so the current app remains unchanged until the API is deployed and tested.

## What it does

- Gives the browser one same-purpose JALANKU endpoint instead of asking every phone/network to contact public Overpass hosts directly.
- Validates and rebuilds only the nearby queries used by JALANKU (hospital, police, ATM and fuel, 5 km radius); it is not an open proxy.
- Tries the configured Overpass upstreams server-side in sequence, with a 9-second per-upstream timeout.
- Caches successful normalized query results at the Cloudflare edge for 5 minutes.
- Provides `/health` for a basic deployment check.
- Restricts browser origins to the JALANKU GitHub Pages origin.

## Deploy in Cloudflare

1. Sign in to Cloudflare and open **Workers & Pages**.
2. Create a Worker named `jalanku-nearby-api`.
3. Paste the contents of `worker.js` into the Worker editor and deploy.
4. Open `https://YOUR-WORKER.YOUR-SUBDOMAIN.workers.dev/health`. Expected JSON includes `"ok":true`.
5. Keep the deployed URL; it will be used in the next frontend change.

No Cloudflare account credentials or secrets are stored in this repository.

## Important limitations

- This Worker still depends on public Overpass upstreams. It reduces exposure to user-side Wi-Fi/DNS/CORS routing differences and adds edge caching, but it does **not** guarantee service if all upstreams are down or rate-limited. For government-scale production, use a contracted provider or managed/self-hosted OSM data service with a service-level commitment.
- Deploying this Worker alone does not change the live app. The frontend must be updated to use the deployed URL only after the health check and query test pass.
- Test from at least one home Wi-Fi, one office Wi-Fi, and mobile data before switching production traffic.
- Search results are based on OpenStreetMap data and may be incomplete or outdated.
