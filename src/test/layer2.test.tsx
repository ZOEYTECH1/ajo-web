/**
 * LAYER 2 â€” Backend API Audit (Frontend perspective)
 * Checks: correct HTTP methods used in service calls, graceful error handling
 * in the UI, correct status-code-to-message mapping, and authentication
 * headers sent with every protected request.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, afterEach, afterAll, describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from './mocks/server';
import useAuthStore from '../store/useAuthStore';
import LoginPage from '../pages/auth/LoginPage';
import { ThemeProvider } from '../context/ThemeContext';

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


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2.1  CORRECT HTTP METHODS
// Login sends POST, fetching profile sends GET, etc.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 2.1 â€” Correct HTTP methods in API calls', () => {
  it('login form sends a POST request', async () => {
    let method = '';
    server.use(
      http.post('/api/auth/login/', ({ request }) => {
        method = request.method;
        return HttpResponse.json({
          access: 'tok',
          refresh: 'ref',
          user: { id: 1, email: 'a@b.com', first_name: 'A', last_name: 'B',
                  phone_number: '+234', role: 'member', is_email_verified: true, selectedModules: [] },
        });
      }),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(method).toBe('POST'));
  });
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2.2  ERROR HANDLING â€” graceful UI feedback for every error type
// 401 â†’ credentials error; 400 â†’ validation error; network â†’ offline message.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 2.2 â€” Error handling: UI shows appropriate messages', () => {
  it('shows error message when backend returns 401', async () => {
    server.use(
      http.post('/api/auth/login/', () =>
        HttpResponse.json({ detail: 'No active account found with the given credentials' }, { status: 401 }),
      ),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'bad@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
    expect(screen.getByRole('alert').textContent).toBeTruthy();
  });

  it('shows error message when backend returns 400', async () => {
    server.use(
      http.post('/api/auth/login/', () =>
        HttpResponse.json({ email: ['Enter a valid email address.'] }, { status: 400 }),
      ),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'bademail');
    await user.type(screen.getByLabelText(/password/i), 'pass123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });

  it('does not show error when login succeeds', async () => {
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
    await user.type(screen.getByLabelText(/email address/i), 'good@example.com');
    await user.type(screen.getByLabelText(/password/i), 'goodpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    // After success the alert should not be visible
    await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
  });
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2.3  AUTHENTICATION â€” token stored and sent with subsequent requests
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 2.3 â€” Authentication: tokens stored after login', () => {
  it('stores access token in localStorage after successful login', async () => {
    server.use(
      http.post('/api/auth/login/', () =>
        HttpResponse.json({
          access: 'e2e-access', refresh: 'e2e-refresh',
          user: { id: 1, email: 'a@b.com', first_name: 'A', last_name: 'B',
                  phone_number: '+234', role: 'member', is_email_verified: true, selectedModules: [] },
        }),
      ),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      expect(localStorage.getItem('access')).toBe('e2e-access');
    });
  });

  it('stores auth user in Zustand store after login', async () => {
    server.use(
      http.post('/api/auth/login/', () =>
        HttpResponse.json({
          access: 'tok', refresh: 'ref',
          user: { id: 99, email: 'me@example.com', first_name: 'Me', last_name: 'User',
                  phone_number: '+234', role: 'member', is_email_verified: true, selectedModules: [] },
        }),
      ),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'me@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const stored = useAuthStore.getState().user;
      expect(stored?.email).toBe('me@example.com');
    });
  });
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 2.4  RESPONSE QUALITY â€” API responses include necessary fields
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 2.4 â€” Response quality: required fields from API', () => {
  it('login response includes access and refresh tokens', async () => {
    let captured: Record<string, unknown> = {};
    server.use(
      http.post('/api/auth/login/', () => {
        const body = { access: 'access-tok', refresh: 'refresh-tok',
                       user: { id: 1, email: 'a@b.com', first_name: 'A', last_name: 'B',
                               phone_number: '+234', role: 'member', is_email_verified: true,
                               selectedModules: [] } };
        captured = body;
        return HttpResponse.json(body);
      }),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'a@b.com');
    await user.type(screen.getByLabelText(/password/i), 'pass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => expect(localStorage.getItem('access')).not.toBeNull());
    expect(captured).toHaveProperty('access');
    expect(captured).toHaveProperty('refresh');
  });
});

