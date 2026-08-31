/**
 * Sentry error tracking initialisation.
 *
 * Reads VITE_SENTRY_DSN from the environment; gracefully skips initialisation
 * when the variable is absent or empty (e.g. local development without a DSN).
 *
 * Usage: import and call `initSentry()` once, at the top of main.tsx before
 * anything else renders.
 */
import * as Sentry from '@sentry/react';

/**
 * Initialise Sentry with the project DSN and basic configuration.
 * Safe to call with an empty/missing DSN — Sentry will silently no-op.
 */
export function initSentry(): void {
  const dsn = import.meta.env.VITE_SENTRY_DSN as string | undefined;

  // Sentry requires a non-empty DSN string. Skip when not configured.
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE ?? 'production',
    // Capture 100 % of traces in development; tune in production.
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
    // Record breadcrumbs (user actions leading up to an error).
    maxBreadcrumbs: 50,
    // Attach the user context from the auth store after it hydrates.
    beforeSend(event) {
      return event;
    },
  });
}

export { Sentry };
