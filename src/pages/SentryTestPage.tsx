/**
 * Temporary diagnostic page — deliberately throws so the top-level
 * ErrorBoundary forwards it to Sentry, confirming the live deployed site's
 * VITE_SENTRY_DSN actually reaches Sentry (not just a local dev run).
 * Visit /sentry-test once, check the Sentry dashboard, then remove this file
 * and its route. It has no ongoing purpose.
 */
export default function SentryTestPage(): never {
  throw new Error('Sentry connectivity test — safe to ignore, triggered deliberately from /sentry-test');
}
