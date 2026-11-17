// Read-only client for the make.fun public API.
//
// Performance notes, all visible in the code below:
// - One request per view, and no request at all when the answer is fresh.
// - Every answer is cached in memory and revalidated with If-None-Match:
//   the API's ETags are bound to the minute, so a revisit inside the same
//   minute costs a 304 with no body, and a revisit after the minute turns
//   costs one small GET. Fresh answers (under 45 s old) are reused as-is.
// - Board calls pass activity=times so the server trims each listing's
//   submissions/chat rows to their timestamps instead of full objects.

export const API_ORIGIN = 'https://make.fun';
const API = API_ORIGIN + '/api';

// url -> { etag, body, at } of the last answer we stored.
const cache = new Map();
const FRESH_MS = 45_000;
let networkGets = 0;

export function apiStats() {
  return { networkGets, cachedUrls: cache.size };
}

/** GET a JSON path of the API, revalidating a stored answer when it is stale. */
export async function apiGet(path) {
  const url = API + path;
  const hit = cache.get(url);
  if (hit && Date.now() - hit.at < FRESH_MS) return hit.body;
  const headers = {};
  if (hit && hit.etag) headers['If-None-Match'] = hit.etag;
  networkGets += 1;
  const res = await fetch(url, { headers });
  if (res.status === 304 && hit) {
    hit.at = Date.now();
    return hit.body;
  }
  if (!res.ok) {
    const err = new Error(`make.fun API ${res.status} for ${path}`);
    err.status = res.status;
    throw err;
  }
  const body = await res.json();
  cache.set(url, { etag: res.headers.get('ETag'), body, at: Date.now() });
  return body;
}

/** Live bounties only, soonest deadline first is the server's order. */
export function boardOpen() {
  return apiGet('/competitions?status=open&limit=100&activity=times');
}

/** Every bounty, open and past, for the "All bounties" tab. */
export function boardAll() {
  return apiGet('/competitions?limit=100&activity=times');
}

/** One bounty, with its rewards table and dates; submissions trimmed to a count. */
export function bounty(slug) {
  return apiGet('/competitions/' + encodeURIComponent(slug) + '?submissions=summary');
}

/** A bounty's leaderboard; view is 'overall' or 'performance' when given. */
export function leaderboard(slug, view) {
  const q = view ? '?view=' + encodeURIComponent(view) : '';
  return apiGet('/competitions/' + encodeURIComponent(slug) + '/leaderboard' + q);
}

/** An account's public profile by handle. */
export function profile(handle) {
  return apiGet('/profiles/' + encodeURIComponent(handle));
}
