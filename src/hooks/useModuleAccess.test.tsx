/**
 * A module the user doesn't use must never appear in the sidebar's main
 * nav, not even for a moment. `user.selected_modules` (an account-level
 * setting shared with mobile) is the source of truth; a background check
 * against real usage data auto-adds a module the moment the account has
 * real data in one it wasn't explicitly told about yet (e.g. accepting a
 * group invite), by PATCHing it onto the account -- mirroring mobile's own
 * "grow from server data, never remove" rule.
 */
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, afterEach, afterAll, describe, it, expect } from 'vitest';
import { http, HttpResponse, delay } from 'msw';
import { server } from '../test/mocks/server';
import { ThemeProvider } from '../context/ThemeContext';
import useAuthStore from '../store/useAuthStore';
import { Sidebar } from '../components/ui/Sidebar';
import type { User } from '../services/authService';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => {
  server.resetHandlers();
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

function baseUser(selected_modules: string[]): User {
  return {
    id: 1, email: 'a@b.com', first_name: 'A', last_name: 'B',
    phone_number: '+2340000000', role: 'member', profile_photo: null,
    is_email_verified: true, selected_modules,
  };
}

describe('useModuleAccess via Sidebar', () => {
  it('shows exactly the modules already on the account, nothing else, with no flash', async () => {
    useAuthStore.setState({ user: baseUser(['thrift']) });
    server.use(
      http.get('/api/thrift/', () => HttpResponse.json([{ id: 1, name: 'My Thrift' }])),
      http.get('/api/groups/', () => HttpResponse.json([])),
      http.get('/api/inventory/businesses/', () => HttpResponse.json([])),
      http.get('/api/notifications/', () => HttpResponse.json([])),
    );

    render(<Providers><Sidebar /></Providers>);

    await waitFor(() => expect(screen.getByRole('link', { name: /Thrift/i })).toBeInTheDocument());
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByText('Ajo Groups')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    // Ajo/Inventory are only ever in the de-emphasized Explore section --
    // never promoted to a real nav link just because they're unselected.
    expect(screen.queryByRole('link', { name: /^Ajo Groups$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Inventory$/i })).not.toBeInTheDocument();
  });

  it('auto-adds a module once the account has real data in it, even though it was never explicitly picked', async () => {
    useAuthStore.setState({ user: baseUser([]) });
    server.use(
      http.get('/api/thrift/', async () => {
        await delay(20);
        return HttpResponse.json([{ id: 1, name: 'My Thrift' }]);
      }),
      http.get('/api/groups/', async () => {
        await delay(20);
        return HttpResponse.json([]);
      }),
      http.get('/api/inventory/businesses/', async () => {
        await delay(20);
        return HttpResponse.json([]);
      }),
      http.get('/api/notifications/', () => HttpResponse.json([])),
      http.patch('/api/auth/me/', async ({ request }) => {
        const body = (await request.json()) as { selected_modules: string[] };
        return HttpResponse.json(baseUser(body.selected_modules));
      }),
    );

    render(<Providers><Sidebar /></Providers>);

    // Nothing shows yet -- not even Thrift, which the account genuinely has
    // data in -- until detection has actually run and the account synced.
    expect(screen.queryByText('Ajo Groups')).not.toBeInTheDocument();
    expect(screen.queryByText('Thrift')).not.toBeInTheDocument();
    expect(screen.queryByText('Inventory')).not.toBeInTheDocument();

    // Once detection confirms real Thrift usage, it gets added to the
    // account (PATCH) and promoted into the main nav.
    await waitFor(() => expect(screen.getByRole('link', { name: /Thrift/i })).toBeInTheDocument());
    expect(screen.getByText('Ajo Groups')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
  });

  it('keeps every module in Explore (none in main nav) for a genuinely new, fully unselected account', async () => {
    useAuthStore.setState({ user: baseUser([]) });
    server.use(
      http.get('/api/thrift/', () => HttpResponse.json([])),
      http.get('/api/groups/', () => HttpResponse.json([])),
      http.get('/api/inventory/businesses/', () => HttpResponse.json([])),
      http.get('/api/notifications/', () => HttpResponse.json([])),
    );

    render(<Providers><Sidebar /></Providers>);

    await waitFor(() => expect(screen.getByText('Explore')).toBeInTheDocument());
    expect(screen.getByText('Ajo Groups')).toBeInTheDocument();
    expect(screen.getByText('Thrift')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Ajo Groups$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Thrift$/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /^Inventory$/i })).not.toBeInTheDocument();
  });
});
