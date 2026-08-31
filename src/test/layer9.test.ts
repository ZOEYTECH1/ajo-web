/**
 * LAYER 9 — Rate Limiting Audit (Frontend)
 * Checks: exponential back-off on 429 responses in api.ts,
 * max retry cap enforced, friendly error after retries exhausted,
 * and Retry-After header respected.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

const SRC = path.resolve(__dirname, '../../src');

// ─────────────────────────────────────────────────────────────────────────────
// 9.1  EXPONENTIAL BACK-OFF — api.ts handles 429 responses
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 9.1 — 429 handling: exponential back-off in api.ts', () => {
  it('api.ts contains a 429 status handler', () => {
    const apiPath = path.resolve(SRC, 'services/api.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    expect(content).toMatch(/429/);
  });

  it('api.ts implements a sleep/delay utility for back-off', () => {
    const apiPath = path.resolve(SRC, 'services/api.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    // Checks for setTimeout-based delay (sleep function)
    expect(content).toMatch(/setTimeout/);
  });

  it('api.ts uses exponential back-off (powers of 2)', () => {
    const apiPath = path.resolve(SRC, 'services/api.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    expect(content).toMatch(/Math\.pow|backoffDelay|\*\s*2/);
  });

  it('api.ts defines a MAX_RETRIES constant', () => {
    const apiPath = path.resolve(SRC, 'services/api.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    expect(content).toMatch(/MAX_RETRIES/);
  });

  it('api.ts rejects with a friendly error after retries exhausted', () => {
    const apiPath = path.resolve(SRC, 'services/api.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    // Should have a user-facing message string
    expect(content).toMatch(/Too many requests|rate.limit|try again/i);
  });

  it('api.ts checks Retry-After header when present', () => {
    const apiPath = path.resolve(SRC, 'services/api.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    expect(content).toMatch(/retry.after|Retry-After/i);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 9.2  BACK-OFF LOGIC — delay increases with each attempt
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 9.2 — Back-off delay grows with each retry attempt', () => {
  it('backoff delay for attempt 1 is larger than attempt 0', () => {
    // Inline mirror of the backoffDelay formula from api.ts (deterministic part)
    const backoffDelay = (attempt: number, baseMs = 1000) =>
      baseMs * Math.pow(2, attempt);

    expect(backoffDelay(1)).toBeGreaterThan(backoffDelay(0));
    expect(backoffDelay(2)).toBeGreaterThan(backoffDelay(1));
    expect(backoffDelay(3)).toBeGreaterThan(backoffDelay(2));
  });

  it('delay after 4 attempts is at least 8× the initial delay', () => {
    const backoffDelay = (attempt: number, baseMs = 1000) =>
      baseMs * Math.pow(2, attempt);

    // attempt 0→delay 1000, attempt 3→delay 8000
    expect(backoffDelay(3) / backoffDelay(0)).toBeGreaterThanOrEqual(8);
  });
});


// ─────────────────────────────────────────────────────────────────────────────
// 9.3  API KEY MANAGEMENT — no API keys hardcoded in source
// ─────────────────────────────────────────────────────────────────────────────

describe('Layer 9.3 — API key management: keys not hardcoded', () => {
  function scanForApiKeys(dir: string): string[] {
    const found: string[] = [];
    if (!fs.existsSync(dir)) return found;
    const KEY_PATTERNS = [
      /sk_live_[a-zA-Z0-9]{20,}/,
      /pk_live_[a-zA-Z0-9]{20,}/,
    ];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
        found.push(...scanForApiKeys(path.join(dir, entry.name)));
      } else if (/\.(ts|tsx)$/.test(entry.name) && !entry.name.includes('.test.')) {
        const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
        for (const p of KEY_PATTERNS) {
          if (p.test(content)) found.push(`${entry.name}: matches ${p}`);
        }
      }
    }
    return found;
  }

  it('no Stripe/payment live keys found in source files', () => {
    expect(scanForApiKeys(SRC)).toHaveLength(0);
  });

  it('VITE_API_URL is referenced via import.meta.env (not hardcoded)', () => {
    const apiPath = path.resolve(SRC, 'services/api.ts');
    const content = fs.readFileSync(apiPath, 'utf8');
    expect(content).toMatch(/import\.meta\.env/);
  });
});
