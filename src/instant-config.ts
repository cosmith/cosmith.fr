import { config } from 'dotenv';

config();

export const INSTANT_APP_ID =
  process.env.INSTANT_APP_ID || 'de6141d2-6507-48c1-981e-9ba2c71ccc6d';

export function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}
