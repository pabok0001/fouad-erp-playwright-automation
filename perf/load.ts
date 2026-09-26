// Load: ramp up to VUS users, hold for DURATION, ramp down.
// Defaults are modest (10 VUs, 2m). Tune with: npm run perf:load -- -e VUS=25 -e DURATION=5m
// ⚠️ Coordinate with the server owner before running against a shared/live environment.
import { Options } from 'k6/options';
import { login, Auth } from './lib/api.ts';
import { regRecordJourney } from './lib/scenario.ts';

const VUS = Number(__ENV.VUS || 10);
const DURATION = __ENV.DURATION || '2m';

export const options: Options = {
  insecureSkipTLSVerify: true,
  stages: [
    { duration: '30s', target: VUS },
    { duration: DURATION, target: VUS },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{name:RegRecord/GetByRegDates}': ['p(95)<3000'],
    'http_req_duration{name:RegRecord/RegNo/{id}}': ['p(95)<1500'],
    checks: ['rate>0.99'],
  },
};

export function setup(): Auth {
  return login();
}

export default function (auth: Auth) {
  regRecordJourney(auth);
}
