// Loads the single root .env file for whichever Node service imports this.
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const here = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(here, '..', '.env') });

const isProd = process.env.NODE_ENV === 'production';

// Read a secret. In production a missing secret stops the service;
// in development a clearly-named fallback is used and a warning is printed once.
export function secret(name, devFallback) {
  const value = process.env[name];
  if (value) return value;
  if (isProd) throw new Error(`Missing required environment variable ${name}`);
  console.warn(`[config] ${name} is not set - using an insecure development default`);
  return devFallback;
}

export function env(name, fallback) {
  const value = process.env[name];
  return value === undefined || value === '' ? fallback : value;
}

export function envInt(name, fallback) {
  const n = Number.parseInt(process.env[name] ?? '', 10);
  return Number.isFinite(n) ? n : fallback;
}
