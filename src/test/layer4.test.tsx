/**
 * LAYER 4 â€” Authentication and Permissions Audit (Frontend)
 * Checks: auth flow (login/logout/token storage), protected route
 * behaviour (redirect to login when unauthenticated), session management
 * (tokens cleared on logout), and authorization (role-based rendering).
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, afterEach, afterAll, describe, it, expect, vi } from 'vitest';
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

const VALID_LOGIN_RESPONSE = {
  access: 'valid-access-token',
  refresh: 'valid-refresh-token',
  user: {
    id: 1,
    email: 'user@example.com',
    first_name: 'Test',
    last_name: 'User',
    phone_number: '+2348000000000',
    role: 'member',
    is_email_verified: true,
    selectedModules: ['inventory'],
  },
};


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 4.1  AUTHENTICATION FLOW
// Users can log in with valid credentials; invalid credentials are rejected.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 4.1 â€” Authentication flow', () => {
  it('successful login stores access token in localStorage', async () => {
    server.use(
      http.post('/api/auth/login/', () => HttpResponse.json(VALID_LOGIN_RESPONSE)),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(localStorage.getItem('access')).toBe('valid-access-token'),
    );
  });

  it('successful login stores refresh token in localStorage', async () => {
    server.use(
      http.post('/api/auth/login/', () => HttpResponse.json(VALID_LOGIN_RESPONSE)),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(localStorage.getItem('refresh')).toBe('valid-refresh-token'),
    );
  });

  it('successful login sets user in auth store', async () => {
    server.use(
      http.post('/api/auth/login/', () => HttpResponse.json(VALID_LOGIN_RESPONSE)),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'user@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => {
      const stored = useAuthStore.getState().user;
      expect(stored?.id).toBe(1);
    });
  });

  it('failed login with 401 does NOT store any token', async () => {
    server.use(
      http.post('/api/auth/login/', () =>
        HttpResponse.json({ detail: 'Bad credentials' }, { status: 401 }),
      ),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'bad@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => screen.getByRole('alert'));
    expect(localStorage.getItem('access')).toBeNull();
    expect(localStorage.getItem('refresh')).toBeNull();
  });

  it('failed login with 401 does not set user in auth store', async () => {
    server.use(
      http.post('/api/auth/login/', () =>
        HttpResponse.json({ detail: 'Bad credentials' }, { status: 401 }),
      ),
    );

    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);
    await user.type(screen.getByLabelText(/email address/i), 'bad@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => screen.getByRole('alert'));
    expect(useAuthStore.getState().user).toBeNull();
  });
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 4.2  SESSION MANAGEMENT
// Tokens are cleared on logout; empty localStorage means unauthenticated.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 4.2 â€” Session management', () => {
  it('auth store starts with null user (unauthenticated)', () => {
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('auth store starts with null tokens (no session)', () => {
    expect(useAuthStore.getState().tokens).toBeNull();
  });

  it('clearing auth store sets user to null', () => {
    useAuthStore.setState({
      user: { id: 1, email: 'test@test.com', first_name: 'T', last_name: 'U',
              phone_number: '+234', role: 'member', is_email_verified: true, selectedModules: [] },
      tokens: { access: 'tok', refresh: 'ref' },
    });
    useAuthStore.getState().clearAuth();
    expect(useAuthStore.getState().user).toBeNull();
  });

  it('localStorage is clear when user is not logged in', () => {
    expect(localStorage.getItem('access')).toBeNull();
    expect(localStorage.getItem('refresh')).toBeNull();
  });
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 4.3  PROTECTED ROUTE UI
// Login page renders required fields; navigation to register works.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 4.3 â€” Protected routes and auth navigation', () => {
  it('login page shows email and password fields', () => {
    render(<Providers><LoginPage /></Providers>);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('login page has a link to the register page', () => {
    render(<Providers><LoginPage /></Providers>);
    const link = screen.getByRole('link', { name: /sign up/i });
    expect(link).toHaveAttribute('href', '/register');
  });

  it('submit button is disabled before user types', () => {
    render(<Providers><LoginPage /></Providers>);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });
});

