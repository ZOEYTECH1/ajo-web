import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CheckCircleIcon,
  XCircleIcon,
  CreditCardIcon,
  CheckIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import api from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Business {
  id: number;
  name: string;
  is_subscription_active: boolean;
  is_on_trial: boolean;
  subscription_expires: string | null;
  trial_end: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';

const PRICE_PER_MONTH = 2000;

const FEATURES = [
  'Unlimited products & categories',
  'Daily P&L dashboard',
  'Sales tracking & history',
  'Customer credit management',
  'Expense logging & categorisation',
  'Low stock & expiry alerts',
  'Best sellers analytics',
  'Warehouse receive & dispatch',
  'Product request management',
  'Multi-branch support',
  'CSV export for sales & expenses',
];

const MONTH_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: '1 month' },
  { value: 3, label: '3 months' },
  { value: 6, label: '6 months' },
  { value: 12, label: '12 months' },
];

function fmt(v: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(v));
}

function StatusBadge({ biz }: { biz: Business }) {
  if (biz.is_on_trial)
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400">
        Trial Active
      </span>
    );
  if (biz.is_subscription_active)
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 dark:bg-green-950/50 text-green-700 dark:text-green-400">
        Active
      </span>
    );
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 dark:bg-red-950/50 text-red-700 dark:text-red-400">
      Inactive
    </span>
  );
}

// ── Business Subscription Card ─────────────────────────────────────────────────

function BusinessSubscriptionCard({ biz }: { biz: Business }) {
  const qc = useQueryClient();
  const [months, setMonths] = useState(3);
  const [txRef, setTxRef] = useState('');
  const [showVerify, setShowVerify] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [verifyErr, setVerifyErr] = useState('');

  const initiateMutation = useMutation({
    mutationFn: () =>
      api
        .post(`/inventory/businesses/${biz.id}/subscription/initiate/`, {
          months,
        })
        .then((r) => r.data as { link: string }),
    onSuccess: (data) => {
      window.open(data.link, '_blank');
      setShowVerify(true);
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      api.get(`/inventory/businesses/${biz.id}/subscription/verify/`, {
        params: { transaction_id: txRef.trim() },
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-businesses'] });
      setSuccessMsg('Payment verified! Your subscription is now active.');
      setShowVerify(false);
      setTxRef('');
      setVerifyErr('');
    },
    onError: (e: any) => {
      setVerifyErr(e.response?.data?.detail ?? 'Something went wrong.');
    },
  });

  const total = PRICE_PER_MONTH * months;

  return (
    <div className="surface-soft p-6 space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <CreditCardIcon className="h-6 w-6 text-orange-600" />
          <h2 className="text-lg font-bold text-(--text-primary)">{biz.name}</h2>
        </div>
        <StatusBadge biz={biz} />
      </div>

      {/* Trial info */}
      {biz.is_on_trial && biz.trial_end && (
        <div className="rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-4 py-3 text-sm text-yellow-700 dark:text-yellow-400 shadow-sm">
          You are on a free trial. Trial ends on{' '}
          <span className="font-semibold">
            {format(new Date(biz.trial_end), 'dd MMM yyyy')}
          </span>
          .
        </div>
      )}

      {/* Active subscription info */}
      {biz.is_subscription_active && biz.subscription_expires && (
        <div className="rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400 shadow-sm">
          Subscription active — expires on{' '}
          <span className="font-semibold">
            {format(new Date(biz.subscription_expires), 'dd MMM yyyy')}
          </span>
          .
        </div>
      )}

      {/* Success message */}
      {successMsg && (
        <div className="flex items-start gap-3 rounded-lg bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 px-4 py-3 text-sm text-green-700 dark:text-green-400 shadow-sm">
          <CheckCircleIcon className="h-5 w-5 mt-0.5 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Pricing */}
      <div className="rounded-lg bg-(--bg) border border-(--border) px-4 py-3 text-sm text-(--text-secondary)">
        <span className="font-semibold text-(--text-primary)">{fmt(PRICE_PER_MONTH)}</span> / month per business
      </div>

      {/* Month selector */}
      <div>
        <p className="text-sm font-semibold text-(--text-secondary) mb-2">Select duration</p>
        <div className="flex flex-wrap gap-2">
          {MONTH_OPTIONS.map(({ value, label }) => (
            <button
              key={value}
              type="button"
              onClick={() => setMonths(value)}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 active:scale-[0.96]',
                months === value
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'surface-soft-sm surface-soft-interactive text-(--text-secondary) hover:text-orange-600',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="flex items-center justify-between py-3 border-t border-(--border)">
        <span className="text-sm font-medium text-(--text-secondary)">Total</span>
        <span className="text-lg font-bold text-(--text-primary)">{fmt(total)}</span>
      </div>

      {/* What's included */}
      <div className="rounded-xl bg-(--bg) border border-(--border) p-4">
        <p className="text-sm font-bold text-(--text-primary) mb-3">What's included</p>
        <ul className="space-y-2">
          {FEATURES.map(f => (
            <li key={f} className="flex items-center gap-2 text-sm text-(--text-secondary)">
              <CheckIcon className="h-4 w-4 text-orange-500 shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Subscribe button */}
      {!showVerify && (
        <button
          type="button"
          disabled={initiateMutation.isPending}
          onClick={() => initiateMutation.mutate()}
          className="w-full rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100"
        >
          {initiateMutation.isPending ? 'Redirecting to payment…' : `Subscribe · ${fmt(total)}`}
        </button>
      )}

      {/* Verify payment section */}
      {showVerify && (
        <div className="space-y-3 rounded-xl bg-(--bg) border border-(--border) p-4">
          <p className="text-sm font-semibold text-(--text-secondary)">
            Verify Payment
          </p>
          <p className="text-xs text-(--text-secondary)">
            After completing payment, enter your transaction reference below to activate your subscription.
          </p>
          <input
            type="text"
            value={txRef}
            onChange={(e) => setTxRef(e.target.value)}
            placeholder="e.g. FLW-MOCK-abc123"
            aria-label="Transaction reference for verification"
            className={inputCls}
          />
          {verifyErr && (
            <div role="alert" className="flex items-start gap-2 text-sm text-red-600">
              <XCircleIcon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden="true" />
              <span>{verifyErr}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setShowVerify(false); setVerifyErr(''); }}
              className="flex-1 rounded-lg surface-soft-sm surface-soft-interactive text-(--text-secondary) py-2 text-sm font-semibold hover:bg-(--primary-tint)/30"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!txRef.trim() || verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
              className="flex-1 rounded-lg bg-orange-600 text-white py-2 text-sm font-semibold hover:bg-orange-700 hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100"
            >
              {verifyMutation.isPending ? 'Verifying…' : 'Confirm Payment'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InventorySubscriptionPage() {
  const { data: businesses = [], isLoading } = useQuery<Business[]>({
    queryKey: ['inventory-businesses'],
    queryFn: () => api.get('/inventory/businesses/').then((r) => r.data),
  });

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">Subscription</h1>
        <p className="text-sm text-(--text-secondary)">
          Manage your inventory module subscription
        </p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div
              key={i}
              className="h-64 rounded-xl bg-(--surface) border border-(--border) animate-pulse"
            />
          ))}
        </div>
      ) : businesses.length === 0 ? (
        <div className="surface-soft px-6 py-16 text-center">
          <p className="text-sm text-(--text-muted)">No businesses found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {businesses.map((biz, i) => (
            <div key={biz.id} className="animate-rise-in" style={{ '--delay': `${i * 60}ms` } as React.CSSProperties}>
              <BusinessSubscriptionCard biz={biz} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
