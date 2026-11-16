import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { CredentialResponse } from '@react-oauth/google';
import { AjoLoaderOverlay } from '../../components/ui/AjoLoader';
import { GoogleAuthButton } from '../../components/ui/GoogleAuthButton';
import { login, googleSignIn } from '../../services/authService';
import useAuthStore from '../../store/useAuthStore';
import api from '../../services/api';

interface OrgInfo {
  uuid: string;
  name: string;
}

export default function OrgLoginPage() {
  const navigate    = useNavigate();
  const { setAuth } = useAuthStore();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [orgs, setOrgs]         = useState<OrgInfo[]>([]);

  // Shared by both the email/password form and Google sign-in below — the
  // part that's specific to this org portal (as opposed to the main app's
  // post-auth routing) is picking which org to land in, not how the user
  // authenticated.
  const routeToOrg = async () => {
    const res = await api.get<OrgInfo[]>('/thrift/orgs/');
    const userOrgs = res.data;

    if (userOrgs.length === 0) {
      setError('This account is not linked to any organisation.');
      return;
    }

    if (userOrgs.length === 1) {
      navigate(`/org/${userOrgs[0].uuid}`, { replace: true });
    } else {
      // Multiple orgs — let them pick
      setOrgs(userOrgs);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { user, ...tokens } = await login({ email, password });
      localStorage.setItem('access', tokens.access);
      localStorage.setItem('refresh', tokens.refresh);
      setAuth(user, tokens);
      await routeToOrg();
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

  const handleGoogleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed. Please try again.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const { user, ...tokens } = await googleSignIn(credentialResponse.credential);
      localStorage.setItem('access', tokens.access);
      localStorage.setItem('refresh', tokens.refresh);
      setAuth(user, tokens);
      await routeToOrg();
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleError = () => setError('Google sign-in failed. Please try again.');

  // Org picker — shown after login when user admins multiple orgs
  if (orgs.length > 1) {
    return (
      <div className="min-h-screen bg-(--bg) flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-(--surface) rounded-2xl shadow-sm border border-(--border) p-8 space-y-4">
            <h2 className="text-lg font-bold text-(--text-primary)">Select Organisation</h2>
            <p className="text-sm text-(--text-secondary)">You manage multiple organisations. Which one would you like to open?</p>
            <div className="space-y-2">
              {orgs.map(org => (
                <button
                  key={org.uuid}
                  type="button"
                  onClick={() => navigate(`/org/${org.uuid}`, { replace: true })}
                  className="w-full text-left rounded-xl border border-(--border) px-4 py-3 text-sm font-semibold text-(--text-primary) hover:border-(--primary-light) hover:bg-(--primary-tint)/30 transition-colors"
                >
                  {org.name}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg) flex items-center justify-center px-4 py-12">
      {isLoading && <AjoLoaderOverlay message="Signing you in…" />}

      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-extrabold text-(--text-primary)">Organisation Portal</h1>
          <p className="mt-1 text-sm text-(--text-secondary)">Sign in to manage your thrift groups</p>
        </div>

        <div className="bg-(--surface) rounded-2xl shadow-sm border border-(--border) p-8 space-y-5">
          {error && (
            <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="org-email" className="block text-sm font-semibold text-(--text-secondary) mb-1">
                Email address
              </label>
              <input
                id="org-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2.5 text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>

            <div>
              <label htmlFor="org-password" className="block text-sm font-semibold text-(--text-secondary) mb-1">
                Password
              </label>
              <input
                id="org-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2.5 text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-(--primary)"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-(--accent) text-white py-2.5 text-sm font-semibold hover:bg-(--accent-dark) disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-3">
            <div className="flex-1 border-t border-(--border)" />
            <span className="text-xs text-(--text-muted)">or continue with</span>
            <div className="flex-1 border-t border-(--border)" />
          </div>

          <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} text="continue_with" />

          <p className="text-center text-xs text-(--text-muted)">
            Not an organisation admin?{' '}
            <a href="/login" className="text-(--primary) hover:underline font-medium">Sign in here</a>
          </p>
        </div>
      </div>
    </div>
  );
}
