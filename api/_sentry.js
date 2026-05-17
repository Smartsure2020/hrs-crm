import * as Sentry from '@sentry/node';

let initialized = false;

export function initSentry() {
  if (initialized || !process.env.SENTRY_DSN) return;
  initialized = true;
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'development',
    tracesSampleRate: 0.1,
  });
}

export { Sentry };
