/**
 * Route-level error boundary for react-router's data router.
 *
 * createBrowserRouter/RouterProvider catch render and loader errors
 * internally, before they ever reach a normal React error boundary wrapping
 * <RouterProvider> — without an `errorElement` on a route, react-router falls
 * back to its own generic "Unexpected Application Error!" page, and the
 * error never reaches Sentry. This component is meant to be set as the
 * `errorElement` on every top-level route so real errors are still reported
 * and the user still sees the app's own friendly fallback, not react-router's
 * default one.
 *
 * A route simply not matching (bad URL) is not an application error — this
 * renders a plain "page not found" message for that case instead of
 * reporting it to Sentry.
 */
import { isRouteErrorResponse, useRouteError, Link } from 'react-router-dom';

export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error)) {
    return (
      <div role="alert" className="flex flex-col items-center justify-center min-h-screen p-8 text-center gap-4">
        <h2 className="text-base font-semibold text-(--text-primary)">
          {error.status === 404 ? 'Page not found' : `Error ${error.status}`}
        </h2>
        <p className="text-sm text-(--text-secondary)">{error.statusText}</p>
        <Link to="/" className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors">
          Go home
        </Link>
      </div>
    );
  }

  const err = error instanceof Error ? error : new Error(String(error));

  // Forward to Sentry when it is initialised (safe no-op otherwise).
  import('../../lib/sentry').then(({ Sentry }) => {
    Sentry.captureException(err);
  }).catch(() => { /* Sentry not available — ignore */ });
  console.error('[RouteErrorBoundary] Caught error:', err);

  return (
    <div role="alert" className="flex flex-col items-center justify-center min-h-screen p-8 text-center gap-4">
      <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
        <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      </div>
      <div>
        <h2 className="text-base font-semibold text-(--text-primary)">Something went wrong</h2>
        <p className="mt-1 text-sm text-(--text-secondary)">An unexpected error occurred. Please try again.</p>
      </div>
      <Link to="/" className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors">
        Go home
      </Link>
    </div>
  );
}
