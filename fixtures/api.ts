import { test as base, request as pwRequest, APIRequestContext } from '@playwright/test';
import { env } from '../utils/env';
import { getApiAuth, ApiAuth } from '../utils/apiAuth';

type WorkerFixtures = { apiAuth: ApiAuth };
type TestFixtures = { api: APIRequestContext };

/**
 * `apiAuth` — logs in once per worker.
 * `api`     — request context pre-configured with baseURL + x-api-key.
 * The built-in `request` fixture stays available for unauthenticated calls.
 */
export const test = base.extend<TestFixtures, WorkerFixtures>({
  apiAuth: [
    async ({}, use) => {
      const ctx = await pwRequest.newContext({ baseURL: env.apiBaseUrl, ignoreHTTPSErrors: true });
      await use(await getApiAuth(ctx));
      await ctx.dispose();
    },
    { scope: 'worker' },
  ],
  api: async ({ apiAuth }, use) => {
    const ctx = await pwRequest.newContext({
      baseURL: env.apiBaseUrl,
      ignoreHTTPSErrors: true,
      extraHTTPHeaders: { 'x-api-key': apiAuth.apiKey },
    });
    await use(ctx);
    await ctx.dispose();
  },
});

export { expect } from '@playwright/test';
