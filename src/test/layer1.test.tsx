/**
 * LAYER 1 â€” Frontend Audit
 * Checks: component organization, accessibility (correct HTML elements,
 * ARIA attributes, keyboard navigation), form error messages that preserve
 * input, and design consistency markers.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeAll, afterEach, afterAll, describe, it, expect, vi } from 'vitest';
import { server } from './mocks/server';
import { http, HttpResponse } from 'msw';

import LoginPage from '../pages/auth/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ThemeProvider } from '../context/ThemeContext';

beforeAll(() => server.listen({ onUnhandledRequest: 'bypass' }));
afterEach(() => server.resetHandlers());
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
// 1.1  ACCESSIBILITY â€” correct HTML semantics
// Buttons for actions, links for navigation; images labeled; fields have labels.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 1.1 â€” Accessibility: correct HTML elements', () => {
  it('Login: submit is a <button> not a <div> or <span>', () => {
    render(<Providers><LoginPage /></Providers>);
    const btn = screen.getByRole('button', { name: /sign in/i });
    expect(btn.tagName).toBe('BUTTON');
  });

  it('Login: "Sign up" is an <a> link, not a button', () => {
    render(<Providers><LoginPage /></Providers>);
    const link = screen.getByRole('link', { name: /sign up/i });
    expect(link.tagName).toBe('A');
  });

  it('Login: email field has an accessible label', () => {
    render(<Providers><LoginPage /></Providers>);
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
  });

  it('Login: password field has an accessible label', () => {
    render(<Providers><LoginPage /></Providers>);
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
  });

  it('Input: sets aria-invalid=true when error prop is provided', () => {
    render(<Input label="Email" name="email" value="" onChange={vi.fn()} error="Required" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });

  it('Input: does not set aria-invalid when no error', () => {
    render(<Input label="Email" name="email" value="" onChange={vi.fn()} />);
    const input = screen.getByLabelText('Email');
    expect(input).not.toHaveAttribute('aria-invalid', 'true');
  });

  it('Input: error message has role="alert" for screen readers', () => {
    render(<Input label="Email" name="email" value="" onChange={vi.fn()} error="Invalid email" />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('Button: disabled button is not reachable by keyboard as active', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1.2  FORMS â€” error messages shown; input preserved on failed submission
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 1.2 â€” Forms: errors and input preservation', () => {
  it('Login: submit button is disabled when fields are empty', () => {
    render(<Providers><LoginPage /></Providers>);
    expect(screen.getByRole('button', { name: /sign in/i })).toBeDisabled();
  });

  it('Login: submit button enables when email + password are filled', async () => {
    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);

    await user.type(screen.getByLabelText(/email address/i), 'test@example.com');
    await user.type(screen.getByLabelText(/password/i), 'password123');
    expect(screen.getByRole('button', { name: /sign in/i })).not.toBeDisabled();
  });

  it('Login: shows error alert on failed login', async () => {
    server.use(
      http.post('/api/auth/login/', () =>
        HttpResponse.json({ detail: 'No active account found' }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);

    await user.type(screen.getByLabelText(/email address/i), 'bad@example.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toBeInTheDocument(),
    );
  });

  it('Login: email input retains value after a failed submit', async () => {
    server.use(
      http.post('/api/auth/login/', () =>
        HttpResponse.json({ detail: 'Bad credentials' }, { status: 401 }),
      ),
    );
    const user = userEvent.setup();
    render(<Providers><LoginPage /></Providers>);

    await user.type(screen.getByLabelText(/email address/i), 'keep@me.com');
    await user.type(screen.getByLabelText(/password/i), 'wrongpass');
    await user.click(screen.getByRole('button', { name: /sign in/i }));

    await waitFor(() => screen.getByRole('alert'));
    expect(screen.getByLabelText(/email address/i)).toHaveValue('keep@me.com');
  });

  it('Input: shows error message below the field', () => {
    render(
      <Input
        label="Phone"
        name="phone"
        value=""
        onChange={vi.fn()}
        error="Phone number is required."
      />,
    );
    expect(screen.getByText('Phone number is required.')).toBeInTheDocument();
  });
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1.3  CONSISTENCY â€” design tokens applied uniformly
// Primary action buttons use the same color class throughout.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 1.3 â€” Consistency: design system tokens', () => {
  it('Button: primary variant uses orange-600 background', () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole('button').className).toContain('bg-orange-600');
  });

  it('Button: primary variant uses white text', () => {
    render(<Button>Primary</Button>);
    expect(screen.getByRole('button').className).toContain('text-white');
  });

  it('Button: danger variant uses red background', () => {
    render(<Button variant="danger">Delete</Button>);
    expect(screen.getByRole('button').className).toContain('bg-red-600');
  });

  it('Button: fullWidth adds w-full class', () => {
    render(<Button fullWidth>Full</Button>);
    expect(screen.getByRole('button').className).toContain('w-full');
  });

  it('Button: loading state shows a spinner', () => {
    render(<Button loading>Waitâ€¦</Button>);
    expect(document.querySelector('svg.animate-spin')).toBeInTheDocument();
  });

  it('Button: loading state disables the button', () => {
    render(<Button loading>Waitâ€¦</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });
});


// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// 1.4  ORGANIZATION â€” components are independently renderable
// Each component file exports a usable component without side-effects.
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

describe('Layer 1.4 â€” Organization: components render in isolation', () => {
  it('Button renders without crashing', () => {
    expect(() => render(<Button>Test</Button>)).not.toThrow();
  });

  it('Input renders without crashing', () => {
    expect(() =>
      render(<Input label="Field" name="field" value="" onChange={vi.fn()} />),
    ).not.toThrow();
  });

  it('LoginPage renders without crashing', () => {
    expect(() => render(<Providers><LoginPage /></Providers>)).not.toThrow();
  });

  it('Button onClick fires exactly once per click', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Button onClick={handler}>Click</Button>);
    await user.click(screen.getByRole('button'));
    expect(handler).toHaveBeenCalledTimes(1);
  });

  it('Button does not fire onClick when disabled', async () => {
    const user = userEvent.setup();
    const handler = vi.fn();
    render(<Button disabled onClick={handler}>No</Button>);
    await user.click(screen.getByRole('button'));
    expect(handler).not.toHaveBeenCalled();
  });

  it('Input calls onChange when user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input label="Name" name="name" value="" onChange={onChange} />);
    await user.type(screen.getByLabelText('Name'), 'hello');
    expect(onChange).toHaveBeenCalled();
  });
});

