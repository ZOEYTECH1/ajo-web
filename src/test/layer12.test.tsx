/**
 * LAYER 12 — UX / Accessibility Audit (Frontend)
 * Checks: skip-to-content link, aria-labels on icon-only buttons,
 * aria-pressed on toggle buttons, role="alert" on error fallback,
 * ErrorBoundary accessible fallback, ThemeButton pressed state, main id.
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import * as fs from 'fs';
import * as path from 'path';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';

const ROOT = path.resolve(__dirname, '../..');

// ─────────────────────────────────────────────────────────────────────────────
// 12.1  SKIP LINK — keyboard navigation baseline
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 12.1 — Skip-to-content link', () => {
  it('Layout.tsx contains a skip-to-content anchor targeting #main-content', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/components/ui/Layout.tsx'), 'utf8');
    expect(content).toMatch(/href="#main-content"/);
    expect(content).toMatch(/Skip to main content/i);
  });

  it('Layout.tsx has a <main> element with id="main-content"', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/components/ui/Layout.tsx'), 'utf8');
    expect(content).toMatch(/id="main-content"/);
    expect(content).toMatch(/<main/);
  });

  it('main element has tabIndex={-1} for programmatic focus', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/components/ui/Layout.tsx'), 'utf8');
    expect(content).toMatch(/tabIndex=\{-1\}/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 12.2  ARIA LABELS — icon-only interactive elements
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 12.2 — Aria-labels on icon-only buttons', () => {
  it('hamburger menu button has aria-label="Open sidebar"', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/components/ui/Layout.tsx'), 'utf8');
    expect(content).toMatch(/aria-label="Open sidebar"/);
  });

  it('close sidebar button has aria-label="Close sidebar"', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/components/ui/Layout.tsx'), 'utf8');
    expect(content).toMatch(/aria-label="Close sidebar"/);
  });

  it('theme buttons each carry an aria-label', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/components/ui/Layout.tsx'), 'utf8');
    expect(content).toMatch(/aria-label="Switch to light mode"/);
    expect(content).toMatch(/aria-label="Switch to dark mode"/);
    expect(content).toMatch(/aria-label="Use system/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 12.3  ARIA PRESSED — toggle-button state
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 12.3 — aria-pressed on theme toggle buttons', () => {
  it('ThemeButton in Layout.tsx uses aria-pressed prop', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/components/ui/Layout.tsx'), 'utf8');
    expect(content).toMatch(/aria-pressed/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 12.4  ROLE ALERT — error boundary fallback
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 12.4 — ErrorBoundary fallback has role="alert"', () => {
  const originalError = console.error;
  beforeEach(() => { console.error = vi.fn(); });
  afterEach(() => { console.error = originalError; });

  function Bomb(): ReactNode {
    throw new Error('Render error');
  }

  it('error fallback is announced via role="alert"', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('error fallback message is readable', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    expect(screen.getByText(/unexpected error/i)).toBeInTheDocument();
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 12.5  THEME CONTAINER — group role for radio-like controls
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 12.5 — Theme toggle container has role="group"', () => {
  it('theme button container uses role="group" in Layout.tsx', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/components/ui/Layout.tsx'), 'utf8');
    expect(content).toMatch(/role="group"/);
    expect(content).toMatch(/aria-label="Theme selection"/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 12.6  OVERLAY ARIA-HIDDEN — decorative backdrop
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 12.6 — Mobile overlay backdrop is aria-hidden', () => {
  it('the click-away overlay div has aria-hidden="true"', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'src/components/ui/Layout.tsx'), 'utf8');
    expect(content).toMatch(/aria-hidden="true"/);
  });
});
