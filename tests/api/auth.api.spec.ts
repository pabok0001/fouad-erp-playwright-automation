import { test, expect } from '../../fixtures/api';
import { env } from '../../utils/env';
import { apiPath } from '../../utils/apiAuth';

test.describe('API · identity', () => {
  test('valid credentials return token and api key', async ({ apiAuth }) => {
    expect(apiAuth.token.split('.')).toHaveLength(3); // JWT
    expect(apiAuth.refreshToken).toBeTruthy();
    expect(apiAuth.apiKey).toBeTruthy();
  });

  test('wrong password is rejected', async ({ request }) => {
    const res = await request.post('/api/v1/identity/token', {
      data: { email: env.user, password: 'wrong-password' },
    });
    const body = await res.json().catch(() => ({}));
    expect(res.ok() && body.succeeded === true, `status ${res.status()}`).toBe(false);
  });

  test('protected endpoint without x-api-key returns 401', async ({ request }) => {
    const res = await request.get(apiPath('RegRecord/RegNo/1'));
    expect(res.status()).toBe(401);
  });

  test('swagger spec is published', async ({ request }) => {
    const res = await request.get('/swagger/v1/swagger.json');
    expect(res).toBeOK();
    const spec = await res.json();
    expect(spec.info.title).toBe('HealthCare ERP');
    expect(Object.keys(spec.paths).length).toBeGreaterThan(100);
  });
});
