import * as path from 'path';
import * as dotenv from 'dotenv';
import { randomBytes } from 'crypto';

const BLOCKED_JWT_SECRETS = new Set([
  'tu-super-secret-key-cambiar-en-prod',
  ['mi', 'secreto', 'jwt', 'super', 'seguro', 'para', 'jordan', 'cambiar', 'en', 'produccion'].join('_'),
  'dev-insecure-jwt-secret-do-not-use-in-production',
]);

const MIN_JWT_SECRET_LENGTH_PROD = 32;

function loadDotenv(): void {
  const root = process.cwd();
  dotenv.config({ path: path.join(root, '.env.local') });
  dotenv.config({ path: path.join(root, '.env') });
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Must be imported in `main.ts` before `./app.module` to fail fast before
 * TypeORM/JWT bootstrapping.
 */
export function validateEnvOrExit(): void {
  loadDotenv();

  if (!isProduction()) {
    if (!process.env.JWT_SECRET?.trim()) {
      process.env.JWT_SECRET = randomBytes(32).toString('hex');
      console.warn('[env] JWT_SECRET generated automatically for development.');
    }
    return;
  }

  const errors: string[] = [];

  const jwt = process.env.JWT_SECRET?.trim();
  if (!jwt) {
    errors.push('JWT_SECRET is required in production.');
  } else {
    if (jwt.length < MIN_JWT_SECRET_LENGTH_PROD) {
      errors.push(
        `JWT_SECRET must have at least ${MIN_JWT_SECRET_LENGTH_PROD} characters in production.`,
      );
    }
    if (BLOCKED_JWT_SECRETS.has(jwt)) {
      errors.push('JWT_SECRET cannot be an example or placeholder value.');
    }
  }

  for (const key of [
    'DB_HOST',
    'DB_USERNAME',
    'DB_PASSWORD',
    'DB_DATABASE',
  ] as const) {
    const value = process.env[key]?.trim();
    if (!value) {
      errors.push(`${key} is required in production.`);
    }
  }

  if (process.env.DB_SYNCHRONIZE === 'true') {
    errors.push('DB_SYNCHRONIZE cannot be true in production.');
  }

  if (process.env.ALLOW_TYPEORM_SYNC === 'true') {
    errors.push('ALLOW_TYPEORM_SYNC cannot be true in production.');
  }

  if (!process.env.CORS_ORIGINS?.trim()) {
    errors.push('CORS_ORIGINS is required in production.');
  }

  if (errors.length > 0) {
    console.error('Invalid production environment variables:\n');
    for (const error of errors) {
      console.error(`   - ${error}`);
    }
    process.exit(1);
  }
}

validateEnvOrExit();
