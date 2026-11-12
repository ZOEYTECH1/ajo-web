import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { UserGroupIcon, BanknotesIcon, CubeIcon, CheckIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import api from '../../services/api';
import useAuthStore from '../../store/useAuthStore';

type ModuleKey = 'ajo' | 'thrift' | 'inventory';

interface ModuleOption {
  key: ModuleKey;
  icon: typeof UserGroupIcon;
  title: string;
  description: string;
  detail: string;
  accent: string;
  tint: string;
}

const OPTIONS: ModuleOption[] = [
  {
    key: 'ajo',
    icon: UserGroupIcon,
    title: 'Ajo Groups',
    description: 'Informal savings circles',
    detail: 'Manage peer savings circles with friends, market traders, and family. Track who paid, who is next to collect, and settle disputes with proof.',
    accent: 'text-(--primary)',
    tint: 'bg-(--primary-tint)',
  },
  {
    key: 'thrift',
    icon: BanknotesIcon,
    title: 'Thrift',
    description: 'Formal thrift & cooperative groups',
    detail: 'Run or join a structured thrift or cooperative contribution group. Full audit trail, rotation management, and an approval queue for the collector.',
    accent: 'text-green-600 dark:text-green-400',
    tint: 'bg-green-50 dark:bg-green-950/40',
  },
  {
    key: 'inventory',
    icon: CubeIcon,
    title: 'Inventory',
    description: 'Stock & sales for your shop',
    detail: 'Track products, record sales, log daily opening and closing stock, manage expenses, and see analytics for your business.',
    accent: 'text-purple-600 dark:text-purple-400',
    tint: 'bg-purple-50 dark:bg-purple-950/40',
  },
];

/**
 * Shown once, the first time a user with no selected_modules reaches a
 * protected page (see ProtectedLayout's redirect). Account-level choice,
 * shared with mobile -- picking here shows up there too, and vice versa.
 */
export default function PickModulesPage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();
  const [selected, setSelected] = useState<ModuleKey[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const toggle = (key: ModuleKey) => {
    setSelected((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));
  };

  const handleContinue = async () => {
    if (selected.length === 0 || !user) return;
    setError('');
    setIsSaving(true);
    try {
      const resp = await api.patch('/auth/me/', { selected_modules: selected });
      setUser(resp.data);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Could not save your selection. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--bg) flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-(--text-primary)">
            Welcome{user?.first_name ? `, ${user.first_name}` : ''}
          </h1>
          <p className="mt-2 text-sm text-(--text-secondary)">
            What will you use Scribe for? Select everything that applies — you can always add more later.
          </p>
        </div>

        <div className="space-y-3">
          {OPTIONS.map((opt) => {
            const isSelected = selected.includes(opt.key);
            const Icon = opt.icon;
            return (
              <button
                key={opt.key}
                type="button"
                onClick={() => toggle(opt.key)}
                role="checkbox"
                aria-checked={isSelected}
                aria-label={opt.title}
                className={clsx(
                  'w-full text-left bg-(--surface) rounded-xl p-4 transition-colors border-2',
                  isSelected ? 'border-(--primary)' : 'border-(--border) hover:border-(--primary)/40',
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={clsx('h-12 w-12 rounded-full flex items-center justify-center shrink-0', isSelected ? opt.tint : 'bg-(--bg)')}>
                    <Icon className={clsx('h-6 w-6', isSelected ? opt.accent : 'text-(--text-muted)')} aria-hidden="true" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={clsx('text-sm font-bold', isSelected ? opt.accent : 'text-(--text-primary)')}>{opt.title}</p>
                    <p className="text-xs text-(--text-secondary) mt-0.5">{opt.description}</p>
                  </div>
                  <div className={clsx(
                    'h-6 w-6 rounded-full border-2 flex items-center justify-center shrink-0',
                    isSelected ? 'bg-(--primary) border-(--primary)' : 'border-(--border)',
                  )}>
                    {isSelected && <CheckIcon className="h-3.5 w-3.5 text-white" aria-hidden="true" />}
                  </div>
                </div>
                {isSelected && (
                  <p className="text-xs text-(--text-secondary) mt-3 pt-3 border-t border-(--border) leading-relaxed">
                    {opt.detail}
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600 bg-red-50 dark:bg-red-950/40 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        <Button
          type="button"
          variant="primary"
          fullWidth
          loading={isSaving}
          disabled={selected.length === 0}
          onClick={handleContinue}
          className="mt-6"
        >
          {selected.length === 0 ? 'Pick at least one' : "Let's go"}
        </Button>

        <p className="mt-4 text-center text-xs text-(--text-muted)">
          You can activate more modules from your account page at any time.
        </p>
      </div>
    </div>
  );
}
