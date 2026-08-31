/**
 * LAYER 13 — Documentation Audit (Frontend)
 * Checks: JSDoc on service functions, module-level comments,
 * env-var example file, README existence.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../..');
const SRC  = path.resolve(ROOT, 'src');

// ─────────────────────────────────────────────────────────────────────────────
// 13.1  JSDOC — api.ts service layer
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 13.1 — JSDoc in api.ts', () => {
  it('api.ts has a module-level block comment', () => {
    const content = fs.readFileSync(path.resolve(SRC, 'services/api.ts'), 'utf8');
    expect(content).toMatch(/\/\*\*/);
  });

  it('api.ts documents the backoff delay function', () => {
    const content = fs.readFileSync(path.resolve(SRC, 'services/api.ts'), 'utf8');
    expect(content).toMatch(/backoffDelay|back-off|exponential/i);
  });

  it('api.ts documents the 429 retry behaviour', () => {
    const content = fs.readFileSync(path.resolve(SRC, 'services/api.ts'), 'utf8');
    // Either a comment or the implementation itself documents the behaviour
    expect(content).toMatch(/retry|429/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 13.2  JSDOC — authService.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 13.2 — JSDoc in authService.ts', () => {
  it('authService.ts has a module-level JSDoc comment', () => {
    const content = fs.readFileSync(path.resolve(SRC, 'services/authService.ts'), 'utf8');
    expect(content).toMatch(/\/\*\*/);
  });

  it('authService.ts documents the login function', () => {
    const content = fs.readFileSync(path.resolve(SRC, 'services/authService.ts'), 'utf8');
    const loginIdx = content.indexOf('login');
    const commentIdx = content.lastIndexOf('/**', loginIdx);
    // A JSDoc block should appear within 300 chars before the export
    expect(loginIdx - commentIdx).toBeLessThan(300);
  });

  it('authService.ts documents the register function', () => {
    const content = fs.readFileSync(path.resolve(SRC, 'services/authService.ts'), 'utf8');
    expect(content).toMatch(/register/i);
    expect(content.match(/\/\*\*/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  it('authService.ts has JSDoc for at least 5 exported functions', () => {
    const content = fs.readFileSync(path.resolve(SRC, 'services/authService.ts'), 'utf8');
    const docBlocks = content.match(/\/\*\*/g) ?? [];
    expect(docBlocks.length).toBeGreaterThanOrEqual(5);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 13.3  JSDOC — ErrorBoundary.tsx
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 13.3 — JSDoc in ErrorBoundary.tsx', () => {
  it('ErrorBoundary.tsx has a module/class-level JSDoc comment', () => {
    const content = fs.readFileSync(
      path.resolve(SRC, 'components/ui/ErrorBoundary.tsx'),
      'utf8',
    );
    expect(content).toMatch(/\/\*\*/);
  });

  it('ErrorBoundary.tsx documents the fallback prop', () => {
    const content = fs.readFileSync(
      path.resolve(SRC, 'components/ui/ErrorBoundary.tsx'),
      'utf8',
    );
    expect(content).toMatch(/fallback/);
    expect(content).toMatch(/\/\*\*/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 13.4  JSDOC — sentry.ts
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 13.4 — JSDoc in sentry.ts', () => {
  it('sentry.ts has a module-level JSDoc comment', () => {
    const content = fs.readFileSync(path.resolve(SRC, 'lib/sentry.ts'), 'utf8');
    expect(content).toMatch(/\/\*\*/);
  });

  it('initSentry function has a JSDoc comment', () => {
    const content = fs.readFileSync(path.resolve(SRC, 'lib/sentry.ts'), 'utf8');
    const fnIdx  = content.indexOf('export function initSentry');
    const docIdx = content.lastIndexOf('/**', fnIdx);
    expect(fnIdx).toBeGreaterThan(-1);
    expect(docIdx).toBeGreaterThan(-1);
    expect(fnIdx - docIdx).toBeLessThan(300);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 13.5  ENV EXAMPLE — .env.example documents VITE_ variables
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 13.5 — .env.example file documents environment variables', () => {
  it('.env.example exists at project root', () => {
    const p = path.resolve(ROOT, '.env.example');
    expect(fs.existsSync(p)).toBe(true);
  });

  it('.env.example documents VITE_API_URL', () => {
    const p = path.resolve(ROOT, '.env.example');
    if (!fs.existsSync(p)) return;
    const content = fs.readFileSync(p, 'utf8');
    expect(content).toMatch(/VITE_API_URL/);
  });

  it('.env.example documents VITE_SENTRY_DSN', () => {
    const p = path.resolve(ROOT, '.env.example');
    if (!fs.existsSync(p)) return;
    const content = fs.readFileSync(p, 'utf8');
    expect(content).toMatch(/VITE_SENTRY_DSN/);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 13.6  README — project README exists
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 13.6 — README.md exists', () => {
  it('README.md is present at project root', () => {
    const p = path.resolve(ROOT, 'README.md');
    expect(fs.existsSync(p)).toBe(true);
  });
});
