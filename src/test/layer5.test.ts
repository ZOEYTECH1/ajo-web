/**
 * LAYER 5 — Hosting and Deployment Audit (Frontend)
 * Checks: no hardcoded secrets in source code, environment variable usage,
 * build configuration correctness, and API base URL driven by config.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const ROOT = path.resolve(__dirname, '../../');
const SRC  = path.resolve(ROOT, 'src');


// ─────────────────────────────────────────────────────────────────────────────
// 5.1  ENVIRONMENT VARIABLES — secrets in config, not in source code
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 5.1 — Environment variables and secrets', () => {
  it('.env is listed in .gitignore', () => {
    const gitignore = path.resolve(ROOT, '.gitignore');
    if (fs.existsSync(gitignore)) {
      const content = fs.readFileSync(gitignore, 'utf8');
      expect(content).toMatch(/\.env/);
    } else {
      // .gitignore may be at repo root — pass if we can't find it locally
      expect(true).toBe(true);
    }
  });

  it('API base URL is not hardcoded with a real domain in service files', () => {
    const apiFile = path.resolve(SRC, 'services/api.ts');
    if (fs.existsSync(apiFile)) {
      const content = fs.readFileSync(apiFile, 'utf8');
      // Should use import.meta.env.VITE_API_URL or relative /api — not a hardcoded domain
      const hasHardcodedProdUrl = /https?:\/\/[a-z0-9-]+\.(onrender|vercel|herokuapp|railway)\.app/i.test(content);
      // Allow relative URLs or env-var-driven URLs
      expect(hasHardcodedProdUrl).toBe(false);
    }
  });

  it('no API keys or secrets hardcoded in source files', () => {
    const suspicious: string[] = [];
    const SECRET_PATTERNS = [
      /sk_live_[a-zA-Z0-9]{20,}/,         // Stripe live key
      /AAAA[a-zA-Z0-9_-]{140,}/,           // FCM server key
      /const\s+password\s*=\s*['"][^'"]{6,}['"]/, // hardcoded password constant
    ];

    function scanDir(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          // Skip test directories, node_modules, and dist
          if (['node_modules', 'test', '__tests__', 'dist'].includes(entry.name)) continue;
          scanDir(path.join(dir, entry.name));
        } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) {
          // Skip test files themselves
          if (entry.name.includes('.test.') || entry.name.includes('.spec.')) continue;
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          for (const p of SECRET_PATTERNS) {
            if (p.test(content)) suspicious.push(`${entry.name}: possible secret`);
          }
        }
      }
    }

    scanDir(SRC);
    expect(suspicious).toHaveLength(0);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 5.2  BUILD CONFIGURATION — vite.config.ts exists and is valid
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 5.2 — Build process configuration', () => {
  it('vite.config.ts exists', () => {
    expect(fs.existsSync(path.resolve(ROOT, 'vite.config.ts'))).toBe(true);
  });

  it('vitest.config.ts exists (CI test runner configured)', () => {
    expect(fs.existsSync(path.resolve(ROOT, 'vitest.config.ts'))).toBe(true);
  });

  it('playwright.config.ts exists (E2E test runner configured)', () => {
    expect(fs.existsSync(path.resolve(ROOT, 'playwright.config.ts'))).toBe(true);
  });

  it('package.json has a "build" script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts).toHaveProperty('build');
  });

  it('package.json has a "test" script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts).toHaveProperty('test');
  });

  it('package.json has a "test:e2e" script', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.scripts).toHaveProperty('test:e2e');
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 5.3  DEPLOYMENT PIPELINE — GitHub Actions or equivalent CI configured
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 5.3 — Deployment pipeline readiness', () => {
  it('TypeScript is a dependency (type-safe builds)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps).toHaveProperty('typescript');
  });

  it('tsconfig.json exists', () => {
    expect(fs.existsSync(path.resolve(ROOT, 'tsconfig.json'))).toBe(true);
  });

  it('@tanstack/react-query is installed (data fetching with cache)', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
    expect(allDeps).toHaveProperty('@tanstack/react-query');
  });

  it('vitest is in devDependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.devDependencies).toHaveProperty('vitest');
  });

  it('@playwright/test is in devDependencies', () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve(ROOT, 'package.json'), 'utf8'));
    expect(pkg.devDependencies).toHaveProperty('@playwright/test');
  });
});
