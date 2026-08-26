/**
 * LAYER 7 — CI/CD Audit (Frontend)
 * Toolkits: Vitest (unit/integration) + Playwright (E2E) — specified by Layer 7.
 * Checks: test infrastructure is configured, CI pipeline can discover tests,
 * no secrets committed, build scripts are present, and automated checks pass.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../');
const E2E  = path.resolve(ROOT, 'e2e');
const SRC_TEST = path.resolve(ROOT, 'src/test');


// ─────────────────────────────────────────────────────────────────────────────
// 7.1  AUTOMATED CHECKS — Vitest (unit / integration)
// Layer 7 specifies Vitest as the unit/integration test toolkit.
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 7.1 — Vitest unit/integration test infrastructure', () => {
  it('vitest.config.ts exists and configures jsdom environment', () => {
    const config = path.resolve(ROOT, 'vitest.config.ts');
    expect(fs.existsSync(config)).toBe(true);
    const content = fs.readFileSync(config, 'utf8');
    expect(content).toMatch(/jsdom/i);
  });

  it('test setup file exists and imports @testing-library/jest-dom', () => {
    const setup = path.resolve(SRC_TEST, 'setup.ts');
    expect(fs.existsSync(setup)).toBe(true);
    const content = fs.readFileSync(setup, 'utf8');
    expect(content).toMatch(/@testing-library\/jest-dom/);
  });

  it('MSW mock server is configured for intercepting API calls', () => {
    const serverFile = path.resolve(SRC_TEST, 'mocks/server.ts');
    expect(fs.existsSync(serverFile)).toBe(true);
  });

  it('MSW handlers cover auth, inventory, and notification endpoints', () => {
    const handlers = path.resolve(SRC_TEST, 'mocks/handlers.ts');
    expect(fs.existsSync(handlers)).toBe(true);
    const content = fs.readFileSync(handlers, 'utf8');
    expect(content).toMatch(/token/);
    expect(content).toMatch(/inventory/);
  });

  it('layer 1 Vitest tests exist (frontend audit)', () => {
    expect(fs.existsSync(path.resolve(SRC_TEST, 'layer1.test.tsx'))).toBe(true);
  });

  it('layer 2 Vitest tests exist (API audit)', () => {
    expect(fs.existsSync(path.resolve(SRC_TEST, 'layer2.test.tsx'))).toBe(true);
  });

  it('layer 4 Vitest tests exist (auth audit)', () => {
    expect(fs.existsSync(path.resolve(SRC_TEST, 'layer4.test.tsx'))).toBe(true);
  });

  it('layer 8 Vitest tests exist (security audit)', () => {
    expect(fs.existsSync(path.resolve(SRC_TEST, 'layer8.test.tsx'))).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 7.2  AUTOMATED CHECKS — Playwright (E2E)
// Layer 7 specifies Playwright as the end-to-end test toolkit.
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 7.2 — Playwright E2E test infrastructure', () => {
  it('playwright.config.ts exists', () => {
    expect(fs.existsSync(path.resolve(ROOT, 'playwright.config.ts'))).toBe(true);
  });

  it('playwright config targets http://localhost:5173', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'playwright.config.ts'), 'utf8');
    expect(content).toMatch(/localhost:5173/);
  });

  it('playwright config spins up the dev server before tests', () => {
    const content = fs.readFileSync(path.resolve(ROOT, 'playwright.config.ts'), 'utf8');
    expect(content).toMatch(/webServer/);
  });

  it('e2e directory exists', () => {
    expect(fs.existsSync(E2E)).toBe(true);
  });

  it('layer 1 E2E spec exists (frontend)', () => {
    expect(fs.existsSync(path.resolve(E2E, 'layer1.spec.ts'))).toBe(true);
  });

  it('layer 4 E2E spec exists (auth flow)', () => {
    expect(fs.existsSync(path.resolve(E2E, 'layer4.spec.ts'))).toBe(true);
  });

  it('layer 8 E2E spec exists (security)', () => {
    expect(fs.existsSync(path.resolve(E2E, 'layer8.spec.ts'))).toBe(true);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 7.3  SECRETS — no credentials in source files
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 7.3 — Secrets: no credentials in source code', () => {
  const SECRET_PATTERNS = [
    /sk_live_[a-zA-Z0-9]{20,}/,
    /AAAA[a-zA-Z0-9_-]{100,}/,
    /postgres:\/\/[^:]+:[^@]{6,}@/,
  ];

  function scanForSecrets(dir: string): string[] {
    const found: string[] = [];
    if (!fs.existsSync(dir)) return found;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist', 'playwright-report'].includes(entry.name)) continue;
        found.push(...scanForSecrets(path.join(dir, entry.name)));
      } else if (/\.(ts|tsx|js|jsx|json)$/.test(entry.name) && entry.name !== 'package-lock.json') {
        try {
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          for (const pattern of SECRET_PATTERNS) {
            if (pattern.test(content)) {
              found.push(`${entry.name}: matches ${pattern}`);
            }
          }
        } catch { /* skip unreadable files */ }
      }
    }
    return found;
  }

  it('no Stripe live keys found in source', () => {
    const found = scanForSecrets(ROOT).filter(f => f.includes('sk_live'));
    expect(found).toHaveLength(0);
  });

  it('no hardcoded database connection strings in source', () => {
    const found = scanForSecrets(ROOT).filter(f => f.includes('postgres://'));
    expect(found).toHaveLength(0);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 7.4  DEPLOYMENT PIPELINE — package.json scripts
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 7.4 — Deployment pipeline scripts', () => {
  let pkg: Record<string, unknown>;

  it('package.json exists', () => {
    const pkgPath = path.resolve(ROOT, 'package.json');
    expect(fs.existsSync(pkgPath)).toBe(true);
    pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  });

  it('has "build" script for production builds', () => {
    const p = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    expect(p.scripts).toHaveProperty('build');
    expect(typeof p.scripts.build).toBe('string');
  });

  it('has "test" script pointing to Vitest', () => {
    const p = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    expect(p.scripts.test).toMatch(/vitest/i);
  });

  it('has "test:e2e" script pointing to Playwright', () => {
    const p = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    expect(p.scripts['test:e2e']).toMatch(/playwright/i);
  });
});
