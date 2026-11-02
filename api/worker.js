/**
 * JALANKU Nearby API — Cloudflare Worker
 *
 * Accepts only JALANKU's supported nearby facility query shapes.
 * Does not act as a general-purpose URL proxy.
 */
const ALLOWED_ORIGIN = "https://kwnicegroup-byte.github.io";
const UPSTREAMS = [
  "https://lz4.overpass-api.de/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
  "https://overpass-api.de/api/interpreter"
];
const UPSTREAM_TIMEOUT_MS = 7000;
const CACHE_TTL_SECONDS = 300;
const MAX_QUERY_LENGTH = 1800;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin === ALLOWED_ORIGIN ? ALLOWED_ORIGIN : ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Accept, Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function json(body, status, origin, extra = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...corsHeaders(origin),
      ...extra
    }
  });
}

function validateAndNormalizeQuery(raw) {
  if (!raw || raw.length > MAX_QUERY_LENGTH) throw new Error("invalid_query_length");
  const header = raw.match(/^\[out:json\]\[timeout:(\d{1,2})\];\(/);
  if (!header || Number(header[1]) > 25) throw new Error("unsupported_query_header");
  const tail = ");out center tags;";
  if (!raw.endsWith(tail)) throw new Error("unsupported_query_shape");
  let body = raw.slice(header[0].length, -tail.length);
  const clauses = [];
  const clauseRe = /nwr\["(amenity|healthcare)"="(hospital|police|fuel|atm)"\]\(around:(\d{1,5}),(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)\);/g;
  let match;
  let consumed = "";
  let coordinateKey = null;
  while ((match = clauseRe.exec(body)) !== null) {
    consumed += match[0];
    const [, key, value, radiusText, latText, lonText] = match;
    const allowed =
      (key === "amenity" && ["hospital", "police", "fuel", "atm"].includes(value)) ||
      (key === "healthcare" && value === "hospital");
    if (!allowed) throw new Error("unsupported_facility_type");
    const radius = Number(radiusText), lat = Number(latText), lon = Number(lonText);
    if (radius !== 5000 || !Number.isFinite(lat) || !Number.isFinite(lon) ||
        lat < -90 || lat > 90 || lon < -180 || lon > 180) {
      throw new Error("invalid_search_coordinates");
    }
    const currentKey = lat.toFixed(5) + "," + lon.toFixed(5);
    if (coordinateKey && coordinateKey !== currentKey) throw new Error("mixed_search_coordinates");
    coordinateKey = currentKey;
    clauses.push(`nwr["${key}"="${value}"](around:5000,${lat},${lon});`);
  }
  if (!clauses.length || consumed !== body) throw new Error("unsupported_query_shape");
  return "[out:json][timeout:20];(" + clauses.join("") + ");out center tags;";
}

async function fetchUpstream(query) {
  const errors = [];
  for (const endpoint of UPSTREAMS) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint + "?data=" + encodeURIComponent(query), {
        method: "GET",
        headers: {
          "Accept": "application/json",
        },
        signal: controller.signal,
        cf: { cacheTtl: 0, cacheEverything: false }
      });
      if (!response.ok) {
        errors.push(new URL(endpoint).hostname + "_http_" + response.status);
        continue;
      }
      const payload = await response.json();
      if (!payload || !Array.isArray(payload.elements)) {
        errors.push(new URL(endpoint).hostname + "_invalid_json");
        continue;
      }
      return payload;
    } catch (error) {
      errors.push(new URL(endpoint).hostname + (error?.name === "AbortError" ? "_timeout" : "_network_error"));
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(errors.join(",") || "all_upstreams_failed");
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(origin) });
    }
    const url = new URL(request.url);
    if (url.pathname === "/health") {
      return json({ ok: true, service: "jalanku-nearby-api", version: 1 }, 200, origin);
    }
    if (url.pathname !== "/api/nearby" || request.method !== "GET") {
      return json({ error: "not_found" }, 404, origin);
    }
    if (origin && origin !== ALLOWED_ORIGIN) {
      return json({ error: "origin_not_allowed" }, 403, origin);
    }
    let query;
    try {
      query = validateAndNormalizeQuery(url.searchParams.get("data") || "");
    } catch (error) {
      return json({ error: "invalid_query", detail: error.message }, 400, origin);
    }

    // Cache API is scoped to the Worker edge location; the browser also retains
    // its existing local cache. Cache only normalized, allow-listed queries.
    const cacheKey = new Request(new URL("/api/cache/" + encodeURIComponent(query), url.origin).toString(), { method: "GET" });
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) {
      const headers = new Headers(cached.headers);
      Object.entries(corsHeaders(origin)).forEach(([k, v]) => headers.set(k, v));
      headers.set("X-JALANKU-Cache", "HIT");
      return new Response(cached.body, { status: 200, headers });
    }
    try {
      const payload = await fetchUpstream(query);
      const response = new Response(JSON.stringify(payload), {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=0, s-maxage=" + CACHE_TTL_SECONDS,
          "X-JALANKU-Cache": "MISS",
          ...corsHeaders(origin)
        }
      });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
      return response;
    } catch (error) {
      // Do not expose upstream internals to end users; return a traceable code.
      return json({ error: "nearby_sources_unavailable" }, 503, origin, {
        "Retry-After": "5",
        "X-JALANKU-Cache": "MISS"
      });
    }
  }
};
