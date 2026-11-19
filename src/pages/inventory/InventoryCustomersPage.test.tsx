/**
 * Credit history: the new "Credit history" button opens a modal showing
 * past charges/payments for a customer (the backend's new
 * InventoryCustomerCreditEntry ledger), paginated via the shared
 * Table + Pagination components.
 */
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, afterEach, afterAll, describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server';
import { ThemeProvider } from '../../context/ThemeContext';
import InventoryCustomersPage from './InventoryCustomersPage';

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

const BUSINESS = {
  id: 1, name: 'My Shop', mode: 'retail', my_role: 'owner',
  parent_business: null, is_on_trial: true, is_subscription_active: true, branch_count: 0,
};

const CUSTOMER = {
  id: 7, name: 'Amaka', phone: '0801', notes: '', credit_balance: '500.00', created_at: '2026-01-01T00:00:00Z',
};

function mockBaseEndpoints() {
  server.use(
    http.get('/api/inventory/businesses/', () => HttpResponse.json([BUSINESS])),
    http.get('/api/inventory/customers/', () => HttpResponse.json([CUSTOMER])),
  );
}

describe('Customer credit history modal', () => {
  it('opens and shows the ledger entries for a customer', async () => {
    mockBaseEndpoints();
    server.use(
      http.get('/api/inventory/customers/7/credit/', () =>
        HttpResponse.json({
          count: 1,
          next: null,
          previous: null,
          results: [
            { id: 1, direction: 'charge', amount: '500.00', balance_after: '500.00', note: 'Bread x2', recorded_at: '2026-01-02T10:00:00Z' },
          ],
        }),
      ),
    );

    const user = userEvent.setup();
    render(<Providers><InventoryCustomersPage /></Providers>);

    // The customer list itself also renders through the shared Table
    // component now, so it too shows up in both the mobile card view and
    // the desktop table at once inside jsdom's viewport-less environment.
    await waitFor(() => expect(screen.getAllByText('Amaka').length).toBeGreaterThan(0));

    // Same dual card/table rendering -- the action button exists once per
    // view, so pick the first match; both fire the identical handler.
    await user.click(screen.getAllByTitle('Credit history')[0]);

    await waitFor(() => expect(screen.getByText(/Credit History/)).toBeInTheDocument());
    // The shared Table component renders both a mobile card view and the
    // desktop table at once (CSS media queries pick one — jsdom has no
    // viewport, so both are present in the DOM), so entries legitimately
    // appear twice here.
    await waitFor(() => expect(screen.getAllByText('Bread x2').length).toBeGreaterThan(0));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getAllByText('Charge').length).toBeGreaterThan(0);
  });

  it('shows an empty state when the customer has no credit activity', async () => {
    mockBaseEndpoints();
    server.use(
      http.get('/api/inventory/customers/7/credit/', () =>
        HttpResponse.json({ count: 0, next: null, previous: null, results: [] }),
      ),
    );

    const user = userEvent.setup();
    render(<Providers><InventoryCustomersPage /></Providers>);

    // The customer list itself also renders through the shared Table
    // component now, so it too shows up in both the mobile card view and
    // the desktop table at once inside jsdom's viewport-less environment.
    await waitFor(() => expect(screen.getAllByText('Amaka').length).toBeGreaterThan(0));
    // Same dual card/table rendering -- the action button exists once per
    // view, so pick the first match; both fire the identical handler.
    await user.click(screen.getAllByTitle('Credit history')[0]);

    // Appears once in the mobile card view and once in the desktop table
    // (both render in jsdom, which has no viewport to resolve the
    // responsive CSS that normally shows only one).
    await waitFor(() => expect(screen.getAllByText('No credit activity yet.').length).toBeGreaterThan(0));
  });

  it('shows an error banner if the history request fails', async () => {
    mockBaseEndpoints();
    server.use(
      http.get('/api/inventory/customers/7/credit/', () => HttpResponse.json({ detail: 'error' }, { status: 500 })),
    );

    const user = userEvent.setup();
    render(<Providers><InventoryCustomersPage /></Providers>);

    // The customer list itself also renders through the shared Table
    // component now, so it too shows up in both the mobile card view and
    // the desktop table at once inside jsdom's viewport-less environment.
    await waitFor(() => expect(screen.getAllByText('Amaka').length).toBeGreaterThan(0));
    // Same dual card/table rendering -- the action button exists once per
    // view, so pick the first match; both fire the identical handler.
    await user.click(screen.getAllByTitle('Credit history')[0]);

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
