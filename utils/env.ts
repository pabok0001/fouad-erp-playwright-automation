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
