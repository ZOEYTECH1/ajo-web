import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { AjoLoader, AjoLoaderOverlay } from '../../components/ui/AjoLoader';
import { login } from '../../services/authService';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';
import useAuthStore from '../../store/useAuthStore';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { user, ...tokens } = await login({ email, password });
      localStorage.setItem('access', tokens.access);
      localStorage.setItem('refresh', tokens.refresh);
      setAuth(user, tokens);
      navigate('/dashboard', { replace: true });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: Record<string, unknown> } };
      const data = axiosError.response?.data;
      const first = data ? Object.values(data)[0] : undefined;
      const fieldMessage = Array.isArray(first) ? first[0] : typeof first === 'string' ? first : undefined;
      const message =
        (typeof data?.detail === 'string' ? data.detail : undefined) ||
        fieldMessage ||
        'Invalid email or password. Please try again.';
      setError(String(message));
    } finally {
      setIsLoading(false);
    }
  };

  const { handleSuccess: handleGoogleSuccess, handleError: handleGoogleError } = useGoogleAuth(setError, setIsLoading);

  return (
    <div className="min-h-screen bg-(--bg) flex items-center justify-center px-4 py-12">
      {isLoading && <AjoLoaderOverlay message="Signing you in…" />}

      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <AjoLoader size={52} />
          </div>
          <h1 className="text-3xl font-extrabold text-(--primary) mt-2">Scribe</h1>
          <p className="mt-1 text-sm text-(--text-secondary)">Sign in to your account</p>
        </div>

        <div className="bg-(--surface) rounded-2xl shadow-sm border border-(--border) p-8">
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
            <Input
              label="Password"
              name="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <div className="flex justify-end">
              <Link to="/forgot-password" className="text-xs text-(--text-muted) hover:text-(--primary)">
                Forgot password?
              </Link>
            </div>

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isLoading}
              disabled={!email || !password}
            >
              Sign in
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 border-t border-(--border)" />
            <span className="text-xs text-(--text-muted)">or continue with</span>
            <div className="flex-1 border-t border-(--border)" />
          </div>

          <div className="flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleError}
              width="336"
              text="continue_with"
              shape="pill"
            />
          </div>

          <p className="mt-6 text-center text-sm text-(--text-secondary)">
            Don't have an account?{' '}
            <Link to="/register" className="font-medium text-(--primary) hover:text-(--primary-dark)">
              Sign up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
