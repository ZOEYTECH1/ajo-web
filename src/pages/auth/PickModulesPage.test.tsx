import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, beforeEach, afterEach, afterAll, describe, it, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../test/mocks/server';
import { ThemeProvider } from '../../context/ThemeContext';
import useAuthStore from '../../store/useAuthStore';
import PickModulesPage from './PickModulesPage';
import type { User } from '../../services/authService';

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

const USER: User = {
  id: 1, email: 'a@b.com', first_name: 'Amaka', last_name: 'B',
  phone_number: '+2340000000', role: 'member', profile_photo: null,
  is_email_verified: true, selected_modules: [],
};

beforeEach(() => {
  useAuthStore.setState({ user: USER });
});

describe('PickModulesPage', () => {
  it('disables the continue button until at least one module is picked', async () => {
    render(<Providers><PickModulesPage /></Providers>);
    expect(screen.getByRole('button', { name: /pick at least one/i })).toBeDisabled();

    const user = userEvent.setup();
    await user.click(screen.getByRole('checkbox', { name: /thrift/i }));
    expect(screen.getByRole('button', { name: /let's go/i })).toBeEnabled();
  });

  it('submits the selected modules and updates the account', async () => {
    let sentBody: unknown = null;
    server.use(
      http.patch('/api/auth/me/', async ({ request }) => {
        sentBody = await request.json();
        return HttpResponse.json({ ...USER, selected_modules: ['thrift', 'inventory'] });
      }),
    );

    const user = userEvent.setup();
    render(<Providers><PickModulesPage /></Providers>);

    await user.click(screen.getByRole('checkbox', { name: /thrift/i }));
    await user.click(screen.getByRole('checkbox', { name: /inventory/i }));
    await user.click(screen.getByRole('button', { name: /let's go/i }));

    await waitFor(() => expect(sentBody).toEqual({ selected_modules: ['thrift', 'inventory'] }));
    await waitFor(() => expect(useAuthStore.getState().user?.selected_modules).toEqual(['thrift', 'inventory']));
  });

  it('shows an error and stays on the page if saving fails', async () => {
    server.use(
      http.patch('/api/auth/me/', () => HttpResponse.json({ detail: 'error' }, { status: 500 })),
    );

    const user = userEvent.setup();
    render(<Providers><PickModulesPage /></Providers>);

    await user.click(screen.getByRole('checkbox', { name: /ajo groups/i }));
    await user.click(screen.getByRole('button', { name: /let's go/i }));

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
  });
});
