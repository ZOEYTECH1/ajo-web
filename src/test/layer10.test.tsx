/**
 * LAYER 10 — Observability Audit (Frontend)
 * Checks: Sentry initialisation gated on VITE_SENTRY_DSN,
 * ErrorBoundary catches render errors, graceful no-op without DSN.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as fs from 'fs';
import * as path from 'path';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

const ROOT = path.resolve(__dirname, '../..');

// ─────────────────────────────────────────────────────────────────────────────
// 10.1  SENTRY SETUP — graceful no-op without DSN
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 10.1 — Sentry: graceful initialisation', () => {
  it('src/lib/sentry.ts exists', () => {
    const p = path.resolve(ROOT, 'src/lib/sentry.ts');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('sentry.ts reads from VITE_SENTRY_DSN env variable', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/lib/sentry.ts'), 'utf8');
    expect(content).toMatch(/VITE_SENTRY_DSN/);
  });

  it('sentry.ts guards initialisation with an empty-DSN check', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/lib/sentry.ts'), 'utf8');
    // Must early-return when dsn is falsy
    expect(content).toMatch(/if\s*\(\s*!dsn\s*\)/);
  });

  it('sentry.ts exports an initSentry function', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/lib/sentry.ts'), 'utf8');
    expect(content).toMatch(/export\s+function\s+initSentry/);
  });

  it('initSentry is called in main.tsx before rendering', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/main.tsx'), 'utf8');
    expect(content).toMatch(/initSentry\(\)/);
    // It should appear before the createRoot / render call
    const initIdx   = content.indexOf('initSentry()');
    // Use 'createRoot(' to find the render *call*, not the import statement
    const renderIdx = content.indexOf('createRoot(');
    expect(initIdx).toBeLessThan(renderIdx);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 10.2  ERROR BOUNDARY — catches render errors and shows fallback UI
// ─────────────────────────────────────────────────────────────────────────────

// Component that throws on purpose
function Bomb({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('Test render error');
  return <div>Content rendered fine</div>;
}

describe('Layer 10.2 — ErrorBoundary: catches render errors', () => {
  // Suppress the expected console.error output during these tests
  const originalError = console.error;
  beforeEach(() => { console.error = vi.fn(); });
  afterEach(() => { console.error = originalError; });

  it('renders children normally when there is no error', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow={false} />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Content rendered fine')).toBeInTheDocument();
  });

  it('shows fallback UI when a child throws', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
  });

  it('fallback UI contains a "Try again" button', () => {
    render(
      <ErrorBoundary>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('button', { name: /try again/i })).toBeInTheDocument();
  });

  it('"Try again" button resets the boundary and re-renders children', async () => {
    const user = userEvent.setup();

    // Render with a controlled bomb; throw first, then stop
    let throwNow = true;
    const ControlledBomb = () => {
      if (throwNow) throw new Error('Intentional');
      return <div>Recovered!</div>;
    };

    render(
      <ErrorBoundary>
        <ControlledBomb />
      </ErrorBoundary>,
    );

    // Fallback visible
    expect(screen.getByRole('alert')).toBeInTheDocument();

    // Stop throwing, then click "Try again"
    throwNow = false;
    await user.click(screen.getByRole('button', { name: /try again/i }));

    expect(screen.getByText('Recovered!')).toBeInTheDocument();
  });

  it('renders a custom fallback node when provided', () => {
    render(
      <ErrorBoundary fallback={<p>Custom error UI</p>}>
        <Bomb shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Custom error UI')).toBeInTheDocument();
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 10.3  ERROR BOUNDARY WIRING — wrapped in main.tsx
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 10.3 — ErrorBoundary wired in main.tsx', () => {
  it('ErrorBoundary is imported in main.tsx', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/main.tsx'), 'utf8');
    expect(content).toMatch(/ErrorBoundary/);
  });

  it('main.tsx wraps RouterProvider with ErrorBoundary', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/main.tsx'), 'utf8');
    // ErrorBoundary should appear before RouterProvider in JSX
    const ebIdx = content.indexOf('<ErrorBoundary');
    const rpIdx = content.indexOf('<RouterProvider');
    expect(ebIdx).toBeGreaterThanOrEqual(0);
    expect(rpIdx).toBeGreaterThan(ebIdx);
  });
});
