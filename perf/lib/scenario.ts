import http from 'k6/http';
import { check, group, sleep } from 'k6';
import { Auth, authHeaders, path } from './api.ts';

/**
 * One virtual-user iteration: read-only patient registration lookups.
 * (No writes — load tests must not create records on the server.)
 */
export function regRecordJourney(auth: Auth) {
  const headers = authHeaders(auth);
  const to = new Date();
  const from = new Date(to.getTime() - 7 * 24 * 3600 * 1000);
  let uhid: number | undefined;

  group('list registrations (7 days)', () => {
    const res = http.post(
      path('RegRecord/GetByRegDates'),
      JSON.stringify({ fromDate: from.toISOString(), toDate: to.toISOString() }),
      { headers, tags: { name: 'RegRecord/GetByRegDates' } },
    );
    check(res, {
      'list 200': (r) => r.status === 200,
      'list succeeded': (r) => r.json('succeeded') === true,
    });
    const rows = (res.status === 200 ? (res.json('data') as Array<{ uhid: number }>) : []) || [];
    if (rows.length) uhid = rows[Math.floor(Math.random() * rows.length)].uhid;
  });

  if (uhid) {
    group('get patient by UHID', () => {
      const res = http.get(path(`RegRecord/RegNo/${uhid}`), { headers, tags: { name: 'RegRecord/RegNo/{id}' } });
      check(res, {
        'get 200': (r) => r.status === 200,
        'get matches uhid': (r) => r.json('data.uhid') === uhid,
      });
    });
  }

  sleep(1 + Math.random()); // think time
}
