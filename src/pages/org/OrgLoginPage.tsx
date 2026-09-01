import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AjoLoaderOverlay } from '../../components/ui/AjoLoader';
import { login } from '../../services/authService';
import useAuthStore from '../../store/useAuthStore';
import api from '../../services/api';

interface OrgInfo {
  id: number;
  name: string;
  slug: string;
  org_type: string;
  logo_url: string;
  is_verified: boolean;
}

const TYPE_LABEL: Record<string, string> = {
  mfb: 'Microfinance Bank',
  bank: 'Bank',
  cooperative: 'Cooperative',
  other: 'Organisation',
};

export default function OrgLoginPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate  = useNavigate();
  const { setAuth } = useAuthStore();

  const [org, setOrg]           = useState<OrgInfo | null>(null);
  const [orgError, setOrgError] = useState('');
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Load org info (public, no auth)
  useEffect(() => {
    if (!slug) return;
    api.get(`/thrift/orgs/public/${slug}/`)
      .then(r => setOrg(r.data))
      .catch(() => setOrgError('Organisation not found. Please check the link.'));
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setError('');
    setIsLoading(true);

    try {
      const { user, ...tokens } = await login({ email, password });
      localStorage.setItem('access', tokens.access);
      localStorage.setItem('refresh', tokens.refresh);
      setAuth(user, tokens);

      // Check if this user is an admin of this org
      const orgsRes = await api.get('/thrift/orgs/');
      const matched = (orgsRes.data as OrgInfo[]).find(o => o.id === org.id);

      if (matched) {
        navigate(`/thrift/org/${org.id}`, { replace: true });
      } else {
        // Logged in but not an admin of this org — send to main app
        navigate('/dashboard', { replace: true });
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

  if (orgError) {
    return (
      <div className="min-h-screen bg-(--bg) flex items-center justify-center px-4">
        <div className="text-center space-y-3">
          <p className="text-2xl font-bold text-(--text-primary)">404</p>
          <p className="text-sm text-(--text-secondary)">{orgError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg) flex items-center justify-center px-4 py-12">
      {isLoading && <AjoLoaderOverlay message="Signing you in…" />}

      <div className="w-full max-w-md">
        {/* Org branding */}
        <div className="text-center mb-8">
          {org?.logo_url ? (
            <img
              src={org.logo_url}
              alt={org?.name}
              className="h-16 w-16 mx-auto rounded-xl object-contain mb-3 border border-(--border)"
            />
          ) : (
            <div className="h-16 w-16 mx-auto rounded-xl bg-teal-600 flex items-center justify-center mb-3 text-white text-2xl font-extrabold">
              {org ? org.name.charAt(0).toUpperCase() : '…'}
            </div>
          )}

          {org ? (
            <>
              <h1 className="text-2xl font-extrabold text-(--text-primary)">{org.name}</h1>
              <p className="mt-1 text-sm text-(--text-secondary)">
                {TYPE_LABEL[org.org_type] ?? 'Organisation'} Portal
              </p>
              {org.is_verified && (
                <span className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-full px-2.5 py-0.5">
                  ✓ Verified
                </span>
              )}
            </>
          ) : (
            <div className="h-6 w-40 mx-auto bg-(--border) rounded animate-pulse" />
          )}
        </div>

        <div className="bg-(--surface) rounded-2xl shadow-sm border border-(--border) p-8 space-y-5">
          <h2 className="text-lg font-bold text-(--text-primary) text-center">Admin Sign In</h2>

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
              disabled={isLoading || !org}
              className="w-full rounded-lg bg-teal-600 text-white py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {isLoading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-xs text-(--text-muted)">
            Powered by <span className="font-semibold text-(--primary)">Scribe</span>
          </p>
        </div>
      </div>
    </div>
  );
}
