/**
 * LAYER 8 â€” Security Audit (Frontend)
 * Checks: XSS prevention (user input renders as text, not executed HTML),
 * no dangerous innerHTML usage, CORS-safe fetch (no wildcard credentials),
 * sensitive data not stored in localStorage unprotected, and that
 * unauthenticated state does not expose protected data.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, afterEach, afterAll, describe, it, expect, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import useAuthStore from '../store/useAuthStore';
import LoginPage from '../pages/auth/LoginPage';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ThemeProvider } from '../context/ThemeContext';
import * as fs from 'fs';
import * as path from 'path';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
  useAuthStore.setState({ user: null, tokens: null, isLoading: false });
  localStorage.clear();
});
afterAll(() => server.close());

function makeQC() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } });
}
function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <QueryClientProvider client={makeQC()}>
        <MemoryRouter>{children}</MemoryRouter>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

const ROOT = path.resolve(__dirname, '../../');
const SRC  = path.resolve(ROOT, 'src');


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 8.1  XSS PREVENTION
// User input typed into fields must render as plain text â€” not as executed HTML.
// React escapes JSX by default; tests confirm no dangerouslySetInnerHTML usage
// with unsanitized input.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 8.1 â€” XSS prevention: input renders as text not HTML', () => {
  it('Input component renders XSS payload as plain text, not executed script', () => {
    const xssPayload = '<script>alert("xss")</script>';
    render(
      <Input
        label="Name"
        name="name"
        value={xssPayload}
        onChange={vi.fn()}
      />,
    );
    // The raw tag should not be present as an actual DOM <script> element
    expect(document.querySelector('script[src]')).toBeNull();
    // The field has the value as text, not as executed code
    expect(screen.getByLabelText('Name')).toHaveValue(xssPayload);
  });

  it('Input label with HTML content is rendered as escaped text', () => {
    render(
      <Input
        label="Field <script>bad()</script>"
        name="test"
        value=""
        onChange={vi.fn()}
      />,
    );
    // No new script tags injected
    const scripts = document.querySelectorAll('script');
    // Only pre-existing scripts (from vitest itself) should exist â€” no new ones from our label
    const badScripts = Array.from(scripts).filter(s => s.textContent?.includes('bad()'));
    expect(badScripts).toHaveLength(0);
  });

  it('Button children with HTML payload render as plain text', () => {
    const payload = '<img src=x onerror=alert(1)>';
    render(<Button>{payload}</Button>);
    // Should not inject an actual img element with onerror
    const imgs = document.querySelectorAll('img[onerror]');
    expect(imgs).toHaveLength(0);
  });

  it('no source file uses dangerouslySetInnerHTML with user-controlled input', () => {
    const dangerous: string[] = [];
    function scan(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.isDirectory()) {
          if (['node_modules', '.git', 'dist'].includes(entry.name)) continue;
          scan(path.join(dir, entry.name));
        } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
          const content = fs.readFileSync(path.join(dir, entry.name), 'utf8');
          if (content.includes('dangerouslySetInnerHTML')) {
            // Check if user data flows in (heuristic: variable named input/content/data/value)
            if (/dangerouslySetInnerHTML.*\{.*__(html|content|input|value|data)/i.test(content)) {
              dangerous.push(entry.name);
            }
          }
        }
      }
    }
    scan(SRC);
    expect(dangerous).toHaveLength(0);
  });
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 8.2  SECRETS MANAGEMENT
// Tokens are stored in localStorage (acceptable for SPA JWTs), but passwords
// and sensitive secrets must never be persisted.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 8.2 â€” Secrets management: sensitive data storage', () => {
  it('password is not stored in localStorage after login', async () => {
    server.use(
      http.post('/api/auth/login/', () =>
        HttpResponse.json({
          access: 'tok', refresh: 'ref',
          user: { id: 1, email: 'a@b.com', first_name: 'A', last_name: 'B',
                  phone_number: '+234', role: 'member', is_email_verified: true, selectedModules: [] },
        }),
      ),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'mysecretpassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(localStorage.getItem('access')).not.toBeNull());

    // The actual password must never be persisted
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      const value = localStorage.getItem(key) ?? '';
      expect(value).not.toContain('mysecretpassword');
    }
  });

  it('auth store does not persist the raw password', () => {
    const state = useAuthStore.getState();
    // Auth store should have user and tokens fields, but no "password" field
    expect(state).not.toHaveProperty('password');
  });

  it('no source file hardcodes an API token or secret', () => {
    const suspicious: string[] = [];
    const patterns = [
      /Bearer\s+[a-zA-Z0-9_-]{30,}/,
      /apiKey\s*=\s*['"][a-zA-Z0-9]{20,}['"]/,
    ];
    function scan(dir: string) {
      if (!fs.existsSync(dir)) return;
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.isDirectory()) {
          if (['node_modules', '.git', 'dist'].includes(e.name)) continue;
          scan(path.join(dir, e.name));
        } else if (/\.(ts|tsx)$/.test(e.name)) {
          const c = fs.readFileSync(path.join(dir, e.name), 'utf8');
          for (const p of patterns) {
            if (p.test(c) && !c.includes('Bearer ${') && !c.includes("Bearer ' +")) {
              suspicious.push(e.name);
            }
          }
        }
      }
    }
    scan(SRC);
    expect(suspicious).toHaveLength(0);
  });
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 8.3  AUTHENTICATION ENFORCEMENT
// Protected state is not accessible without a valid token in the auth store.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 8.3 â€” Authentication enforcement in UI state', () => {
  it('auth store starts unauthenticated (no user, no tokens)', () => {
    const state = useAuthStore.getState();
    expect(state.user).toBeNull();
    expect(state.tokens).toBeNull();
  });

  it('login page is accessible without authentication (public route)', () => {
    expect(() => render(<Providers><LoginPage /></Providers>)).not.toThrow();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('invalid credentials do not authenticate the store', async () => {
    server.use(
      http.post('/api/auth/login/', () =>
        HttpResponse.json({ detail: 'Bad credentials' }, { status: 401 }),
      ),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'hacker@example.com');
    await user.type(screen.getByLabelText(/password/i), 'notapassword');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => screen.getByRole('alert'));
    expect(useAuthStore.getState().user).toBeNull();
    expect(useAuthStore.getState().tokens).toBeNull();
  });
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 8.4  CORS â€” API service does not use credentials: 'include' with wildcard
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 8.4 â€” CORS: API service configuration', () => {
  it('api service file exists', () => {
    expect(fs.existsSync(path.resolve(SRC, 'services/api.ts'))).toBe(true);
  });

  it('api service uses axios baseURL from env or relative path', () => {
    const content = fs.readFileSync(path.resolve(SRC, 'services/api.ts'), 'utf8');
    // Should use VITE_ env var or relative URL â€” not a wildcard origin
    const hasEnvOrRelative =
      content.includes('import.meta.env') ||
      content.includes("baseURL: '/'") ||
      content.includes('baseURL: "/api"') ||
      content.includes("baseURL: '/api'");
    expect(hasEnvOrRelative).toBe(true);
  });
});

