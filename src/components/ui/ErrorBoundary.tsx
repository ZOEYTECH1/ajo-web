/**
 * React Error Boundary component.
 *
 * Wraps a section of the tree and catches any render-time or lifecycle errors
 * thrown by descendant components. Instead of crashing the whole page, it
 * renders a friendly fallback UI and logs the error to Sentry when configured.
 *
 * Usage:
 *   <ErrorBoundary>
 *     <SomeFeature />
 *   </ErrorBoundary>
 *
 * Or with a custom fallback:
 *   <ErrorBoundary fallback={<p>Oops!</p>}>
 *     <SomeFeature />
 *   </ErrorBoundary>
 */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  /** Content to protect. */
  children: ReactNode;
  /**
   * Custom fallback UI to show when an error is caught.
   * Defaults to a generic "Something went wrong" panel.
   */
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // Forward to Sentry when it is initialised (safe no-op otherwise).
    try {
      // Dynamic import avoids hard coupling when Sentry is not installed.
      import('../../lib/sentry').then(({ Sentry }) => {
        Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
      }).catch(() => { /* Sentry not available — ignore */ });
    } catch {
      // Never throw from componentDidCatch.
    }

    // Always log to the console so developers can see the error locally.
    console.error('[ErrorBoundary] Caught error:', error, info);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback;
    }

    return (
      <div
        role="alert"
        className="flex flex-col items-center justify-center p-8 text-center gap-4"
      >
        <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-950/40 flex items-center justify-center">
          <svg
            className="w-6 h-6 text-red-600 dark:text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"
            />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-semibold text-(--text-primary)">
            Something went wrong
          </h2>
          <p className="mt-1 text-sm text-(--text-secondary)">
            An unexpected error occurred. Please try again.
          </p>
        </div>
        <button
          type="button"
          onClick={this.handleRetry}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }
}
