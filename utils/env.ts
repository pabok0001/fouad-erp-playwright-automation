import 'dotenv/config';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env var ${name} — check your .env file`);
  return value;
}

export const env = {
  baseUrl: required('BASE_URL'),
  user: required('APP_USER'),
  password: required('APP_PASSWORD'),
  apiBaseUrl: required('API_BASE_URL'),
  apiVersion: process.env.API_VERSION ?? 'v1',
};

/**
 * Login for a module-specific user, read lazily so modules that don't need one
 * still run: moduleUser('DIAG') → DIAG_USER / DIAG_PASSWORD.
 */
export function moduleUser(prefix: string): { user: string; password: string } {
  return { user: required(`${prefix}_USER`), password: required(`${prefix}_PASSWORD`) };
}
