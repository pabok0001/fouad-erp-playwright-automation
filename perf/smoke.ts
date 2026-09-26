// Smoke: 1 virtual user for 30s — verifies the script and API work. Safe to run anytime.
import { Options } from 'k6/options';
import { login, Auth } from './lib/api.ts';
import { regRecordJourney } from './lib/scenario.ts';

export const options: Options = {
  insecureSkipTLSVerify: true, // self-signed certificate
  vus: 1,
  duration: '30s',
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<2000'],
    checks: ['rate>0.99'],
  },
};

export function setup(): Auth {
  return login();
}

export default function (auth: Auth) {
  regRecordJourney(auth);
}
