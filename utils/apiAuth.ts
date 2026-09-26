import { APIRequestContext, expect } from '@playwright/test';
import { env } from './env';

export interface ApiAuth {
  token: string;
  refreshToken: string;
  /** Sent as the `x-api-key` header — this is what the API actually authorizes on. */
  apiKey: string;
}

export interface ApiResult<T> {
  data: T;
  messages: string[];
  succeeded: boolean;
  errors: unknown[];
}

/** POST /api/v1/identity/token and return the credentials needed for other calls. */
export async function getApiAuth(
  request: APIRequestContext,
  user = env.user,
  password = env.password,
): Promise<ApiAuth> {
  const res = await request.post('/api/v1/identity/token', { data: { email: user, password } });
  expect(res, 'token request').toBeOK();
  const body = (await res.json()) as ApiResult<{ token: string; refreshToken: string; userApiKey: string }>;
  expect(body.succeeded, `token request: ${body.messages?.join('; ')}`).toBe(true);
  return { token: body.data.token, refreshToken: body.data.refreshToken, apiKey: body.data.userApiKey };
}

/** Versioned API path, e.g. apiPath('RegRecord/RegNo/123') → /api/v1/RegRecord/RegNo/123 */
export const apiPath = (path: string) => `/api/${env.apiVersion}/${path.replace(/^\//, '')}`;
