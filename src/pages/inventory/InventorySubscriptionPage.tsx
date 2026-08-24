import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import {
  CheckCircleIcon,
  XCircleIcon,
  CreditCardIcon,
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
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
        Trial Active
      </span>
    );
  if (biz.is_subscription_active)
    return (
      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        Active
      </span>
    );
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700">
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
      api.post(`/inventory/businesses/${biz.id}/subscription/verify/`, {
        tx_ref: txRef.trim(),
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
    <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6 space-y-5">
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
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-700">
          You are on a free trial. Trial ends on{' '}
          <span className="font-semibold">
            {format(new Date(biz.trial_end), 'dd MMM yyyy')}
          </span>
          .
        </div>
      )}

      {/* Active subscription info */}
      {biz.is_subscription_active && biz.subscription_expires && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          Subscription active — expires on{' '}
          <span className="font-semibold">
            {format(new Date(biz.subscription_expires), 'dd MMM yyyy')}
          </span>
          .
        </div>
      )}

      {/* Success message */}
      {successMsg && (
        <div className="flex items-start gap-3 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
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
                'px-4 py-2 rounded-lg text-sm font-medium border transition-colors',
                months === value
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-(--surface) border-(--border) text-(--text-secondary) hover:border-orange-400 hover:text-orange-600',
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

      {/* Subscribe button */}
      {!showVerify && (
        <button
          type="button"
          disabled={initiateMutation.isPending}
          onClick={() => initiateMutation.mutate()}
          className="w-full rounded-lg bg-orange-600 text-white py-2.5 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
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
            className={inputCls}
          />
          {verifyErr && (
            <div className="flex items-start gap-2 text-sm text-red-600">
              <XCircleIcon className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{verifyErr}</span>
            </div>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => { setShowVerify(false); setVerifyErr(''); }}
              className="flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!txRef.trim() || verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
              className="flex-1 rounded-lg bg-orange-600 text-white py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors"
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
        <div className="rounded-xl bg-(--surface) border border-(--border) px-6 py-16 text-center">
          <p className="text-sm text-(--text-muted)">No businesses found.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {businesses.map((biz) => (
            <BusinessSubscriptionCard key={biz.id} biz={biz} />
          ))}
        </div>
      )}
    </div>
  );
}
