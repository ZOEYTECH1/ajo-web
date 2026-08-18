import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Input } from './Input';

describe('Input', () => {
  const defaultProps = {
    label: 'Email',
    name: 'email',
    value: '',
    onChange: vi.fn(),
  };

  it('renders the label', () => {
    render(<Input {...defaultProps} />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('renders with the given value', () => {
    render(<Input {...defaultProps} value="test@example.com" />);
    expect(screen.getByLabelText('Email')).toHaveValue('test@example.com');
  });

  it('shows error message when error prop is provided', () => {
    render(<Input {...defaultProps} error="Email is required." />);
    expect(screen.getByText('Email is required.')).toBeInTheDocument();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('does not show error message when error is not provided', () => {
    render(<Input {...defaultProps} />);
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('calls onChange when user types', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Input {...defaultProps} onChange={onChange} />);
    await user.type(screen.getByLabelText('Email'), 'hello');
    expect(onChange).toHaveBeenCalled();
  });

  it('renders required indicator when required is true', () => {
    render(<Input {...defaultProps} required />);
    // The asterisk is rendered as aria-hidden
    const asterisk = document.querySelector('[aria-hidden="true"]');
    expect(asterisk).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Input {...defaultProps} disabled />);
    expect(screen.getByLabelText('Email')).toBeDisabled();
  });

  it('renders placeholder text', () => {
    render(<Input {...defaultProps} placeholder="Enter email" />);
    expect(screen.getByPlaceholderText('Enter email')).toBeInTheDocument();
  });

  it('uses correct input type', () => {
    render(<Input {...defaultProps} type="password" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'password');
  });

  it('sets aria-invalid when there is an error', () => {
    render(<Input {...defaultProps} error="Required" />);
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true');
  });
});
