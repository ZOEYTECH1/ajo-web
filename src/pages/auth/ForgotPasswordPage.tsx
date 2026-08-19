import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';

function resendOtp(email: string) {
  return api.post('/auth/resend-otp/', { email, type: 'email' });
}

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => resendOtp(email),
    onSuccess: () => setSuccess(true),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const error = mutation.isError
    ? ((mutation.error as { response?: { data?: { detail?: string } } }).response?.data?.detail ?? 'Something went wrong.')
    : null;

  return (
    <div className="min-h-screen bg-(--bg) flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-(--primary)">Ajo</h1>
          <p className="mt-1 text-sm text-(--text-secondary)">Reset your password</p>
        </div>

        <div className="bg-(--surface) rounded-2xl shadow-sm border border-(--border) p-8">
          {!success ? (
            <>
              <p className="mb-6 text-sm text-(--text-secondary)">
                Enter your email address and we'll send you a one-time code to reset your password.
              </p>

              {error && (
                <div
                  className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate className="space-y-4">
                <Input
                  label="Email address"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />

                <Button
                  type="submit"
                  variant="primary"
                  fullWidth
                  loading={mutation.isPending}
                  disabled={!email}
                >
                  Send OTP
                </Button>
              </form>
            </>
          ) : (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-(--primary)/10 mx-auto">
                <svg className="w-7 h-7 text-(--primary)" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25H4.5a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5H4.5a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-(--text-primary)">Check your email</h2>
              <p className="text-sm text-(--text-secondary)">
                We sent a one-time code to <span className="font-medium text-(--text-primary)">{email}</span>. Enter it on the next page to continue.
              </p>
              <Button
                type="button"
                variant="primary"
                fullWidth
                onClick={() => navigate('/verify-otp', { state: { email } })}
              >
                I have my OTP
              </Button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-(--text-secondary)">
            Remember your password?{' '}
            <Link to="/login" className="font-medium text-(--primary) hover:text-(--primary-dark)">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
