import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AjoLoaderOverlay } from '../../components/ui/AjoLoader';
import { login } from '../../services/authService';
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const { user, ...tokens } = await login({ email, password });
      localStorage.setItem('access', tokens.access);
      localStorage.setItem('refresh', tokens.refresh);
      setAuth(user, tokens);

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
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string; non_field_errors?: string[] } } };
      const message =
        axiosError.response?.data?.detail ||
        axiosError.response?.data?.non_field_errors?.[0] ||
        'Invalid email or password. Please try again.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

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
                  className="w-full text-left rounded-xl border border-(--border) px-4 py-3 text-sm font-semibold text-(--text-primary) hover:border-teal-400 hover:bg-(--primary-tint)/30 transition-colors"
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
                className="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2.5 text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-teal-500"
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
                className="w-full rounded-lg border border-(--border) bg-(--bg) px-3 py-2.5 text-sm text-(--text-primary) focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-teal-600 text-white py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-(--text-muted)">
            Not an organisation admin?{' '}
            <a href="/login" className="text-teal-600 hover:underline font-medium">Sign in here</a>
          </p>
        </div>
      </div>
    </div>
  );
}
