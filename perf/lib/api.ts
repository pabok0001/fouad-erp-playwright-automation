import http from 'k6/http';
import { check, fail } from 'k6';

export const BASE = __ENV.API_BASE_URL;
export const VERSION = __ENV.API_VERSION || 'v1';
const JSON_HEADERS = { 'Content-Type': 'application/json' };

export interface Auth {
  apiKey: string;
}

/** Log in once (call from setup()) so VUs don't hammer the token endpoint. */
export function login(): Auth {
  if (!BASE || !__ENV.APP_USER || !__ENV.APP_PASSWORD) fail('API_BASE_URL / APP_USER / APP_PASSWORD not set — run via "npm run perf:*"');
  const res = http.post(
    `${BASE}/api/v1/identity/token`,
    JSON.stringify({ email: __ENV.APP_USER, password: __ENV.APP_PASSWORD }),
    { headers: JSON_HEADERS, tags: { name: 'identity/token' } },
  );
  const ok = check(res, { 'login 200': (r) => r.status === 200 });
  if (!ok) fail(`login failed: HTTP ${res.status} ${res.body}`);
  return { apiKey: (res.json('data.userApiKey') as string) };
}

export function authHeaders(auth: Auth) {
  return { ...JSON_HEADERS, 'x-api-key': auth.apiKey };
}

export const path = (p: string) => `${BASE}/api/${VERSION}/${p}`;
