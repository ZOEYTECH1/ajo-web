/**
 * A module the user doesn't use must never appear in the sidebar's main
 * nav, not even for a moment while the other modules are still loading.
 * useModuleAccess used to default every flag to `true` while its queries
 * were in flight, so a user who only uses Thrift would briefly see Ajo
 * Groups and Inventory too, before they got yanked away the instant real
 * data arrived. Fixed so every flag starts `false` and only flips once its
 * own answer is known.
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

beforeAll(() => {
  useAuthStore.setState({
    user: { id: 1, email: 'a@b.com', first_name: 'A', last_name: 'B' } as never,
  });
});

describe('useModuleAccess via Sidebar', () => {
  it('never shows a module the user does not use, even while other modules are still loading', async () => {
    // Thrift resolves immediately with real usage; Ajo and Inventory resolve
    // slightly later with zero usage -- the exact shape that used to cause
    // Ajo/Inventory to flash into the main nav before being removed.
    server.use(
      http.get('/api/thrift/', () => HttpResponse.json([{ id: 1, name: 'My Thrift' }])),
      http.get('/api/groups/', async () => {
        await delay(30);
        return HttpResponse.json([]);
      }),
      http.get('/api/inventory/businesses/', async () => {
        await delay(30);
        return HttpResponse.json([]);
      }),
      http.get('/api/notifications/', () => HttpResponse.json([])),
    );

    render(<Providers><Sidebar /></Providers>);

    // Immediately after mount, nothing module-related has rendered yet --
    // not even Thrift, which the user genuinely uses, and critically never
    // Ajo Groups or Inventory, which they don't.
    expect(screen.queryByText('Ajo Groups')).not.toBeInTheDocument();
    expect(screen.queryByText('Inventory')).not.toBeInTheDocument();
    expect(screen.queryByText('Thrift')).not.toBeInTheDocument();

    // Once everything resolves: Thrift is in the main nav, Ajo/Inventory
    // never appeared there at any point -- only in the de-emphasized
    // "Explore" section, and only after their own real answer came back.
    await waitFor(() => expect(screen.getByRole('link', { name: /Thrift/i })).toBeInTheDocument());
    expect(screen.getByText('Explore')).toBeInTheDocument();
    expect(screen.getByText('Ajo Groups')).toBeInTheDocument();
    expect(screen.getByText('Inventory')).toBeInTheDocument();
  });

  it('shows all three modules once loading finishes for a genuinely new user with zero usage anywhere', async () => {
    server.use(
      http.get('/api/thrift/', () => HttpResponse.json([])),
      http.get('/api/groups/', () => HttpResponse.json([])),
      http.get('/api/inventory/businesses/', () => HttpResponse.json([])),
      http.get('/api/notifications/', () => HttpResponse.json([])),
    );

    render(<Providers><Sidebar /></Providers>);

    await waitFor(() => expect(screen.getByRole('link', { name: /Ajo Groups/i })).toBeInTheDocument());
    expect(screen.getByRole('link', { name: /Thrift/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Inventory/i })).toBeInTheDocument();
    expect(screen.queryByText('Explore')).not.toBeInTheDocument();
  });
});
