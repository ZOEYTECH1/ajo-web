/**
 * Sentry error tracking initialisation.
 *
 * Reads VITE_SENTRY_DSN from the environment; gracefully skips initialisation
 * when the variable is absent or empty (e.g. local development without a DSN).
 *
 * Usage: import and call `initSentry()` once, at the top of main.tsx before
 * anything else renders.
 *
 * Alerting: configure Sentry alert rules in the Sentry dashboard at
 *   https://sentry.io → [project] → Alerts → Create Alert Rule
 * Recommended: error rate spike alert (>10 new issues/hour) and
 * performance degradation alert (p95 > 2 s).
 */
import * as Sentry from '@sentry/react';

/** Fields that must never appear in Sentry event payloads. */
const SENSITIVE_FIELDS = [
  'password', 'token', 'secret', 'authorization', 'credit_card', 'pin', 'access_token', 'refresh_token',
] as const;

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
    // Capture 100 % of traces in development; 10 % in production (cost-effective).
    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
    // Record breadcrumbs (user actions leading up to an error).
    maxBreadcrumbs: 50,
    // Scrub PII / secrets from outbound events before they reach Sentry servers.
    beforeSend(event) {
      if (event.request?.data && typeof event.request.data === 'object') {
        const data = event.request.data as Record<string, unknown>;
        SENSITIVE_FIELDS.forEach((field) => {
          if (field in data) data[field] = '[Filtered]';
        });
      }
      return event;
    },
  });
}

export { Sentry };
