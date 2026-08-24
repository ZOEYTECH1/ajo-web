import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeftIcon,
  CheckCircleIcon,
  XCircleIcon,
  CreditCardIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import api from '../../services/api';
import useAuthStore from '../../store/useAuthStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminSnap {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Group {
  id: number;
  name: string;
  contribution_amount: string;
  contribution_frequency: 'daily' | 'weekly' | 'monthly';
  member_count: number;
  is_subscription_active: boolean;
  is_on_trial: boolean;
  subscription_expires: string | null;
  admin: AdminSnap;
}

interface InitiateResponse {
  link: string;
  tx_ref: string;
}

interface VerifyResponse {
  status: 'successful' | 'failed';
  extends_until: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(isoString: string) {
  try {
    return new Intl.DateTimeFormat('en-NG', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date(isoString));
  } catch {
    return isoString;
  }
}

const RATE_MAP: Record<Group['contribution_frequency'], number> = {
  daily: 0.01,
  weekly: 0.025,
  monthly: 0.05,
};

const RATE_LABEL: Record<Group['contribution_frequency'], string> = {
  daily: '1%',
  weekly: '2.5%',
  monthly: '5%',
};

const CYCLE_OPTIONS = [1, 3, 6, 12] as const;

// ── Shared styles (mirrors the project's existing convention) ─────────────────

const orangeBtn =
  'rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors';

const inputCls =
  'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';

// ── Status badge ──────────────────────────────────────────────────────────────

function SubscriptionStatusBadge({ group }: { group: Group }) {
  if (group.is_subscription_active) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">
        Active
      </span>
    );
  }
  if (group.is_on_trial) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700">
        Trial
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
      Inactive
    </span>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AjoSubscriptionPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [selectedCycles, setSelectedCycles] = useState<typeof CYCLE_OPTIONS[number]>(3);
  const [paymentInitiated, setPaymentInitiated] = useState(false);
  const [transactionId, setTransactionId] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState<VerifyResponse | null>(null);

  // ── Fetch group ──────────────────────────────────────────────────────────────

  const { data: group, isLoading, error } = useQuery<Group>({
    queryKey: ['ajo-group', id],
    queryFn: () => api.get<Group>(`/groups/${id}/`).then((r) => r.data),
    enabled: !!id,
  });

  // ── Initiate subscription payment ────────────────────────────────────────────

  const initiateMutation = useMutation({
    mutationFn: () =>
      api
        .post<InitiateResponse>(`/groups/${id}/subscription/initiate/`, {
          cycles: selectedCycles,
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      window.open(data.link, '_blank');
      setPaymentInitiated(true);
    },
  });

  // ── Verify subscription payment ──────────────────────────────────────────────

  const verifyMutation = useMutation({
    mutationFn: () =>
      api
        .post<VerifyResponse>(`/groups/${id}/subscription/verify/`, {
          transaction_id: transactionId.trim(),
        })
        .then((r) => r.data),
    onSuccess: (data) => {
      if (data.status === 'successful') {
        setVerifySuccess(data);
        setVerifyError('');
        qc.invalidateQueries({ queryKey: ['ajo-group', id] });
      } else {
        setVerifyError('Payment verification failed. Please check your transaction ID and try again.');
      }
    },
    onError: (e: any) => {
      const d = e.response?.data;
      setVerifyError(
        d?.detail ?? d?.transaction_id?.[0] ?? d?.non_field_errors?.[0] ?? 'Verification failed. Please try again.',
      );
    },
  });

  // ── Loading / error states ───────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-5 bg-(--border) rounded w-32" />
        <div className="h-8 bg-(--border) rounded w-56" />
        <div className="h-32 bg-(--border) rounded-xl" />
        <div className="h-48 bg-(--border) rounded-xl" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-6 text-center text-sm text-red-700">
        Failed to load group details.{' '}
        <Link to="/ajo" className="underline font-medium">
          Go back
        </Link>
      </div>
    );
  }

  // ── Derived values ───────────────────────────────────────────────────────────

  const isAdmin = currentUser?.id === group.admin.id;
  const rate = RATE_MAP[group.contribution_frequency];
  const feePerCycle = rate * Number(group.contribution_amount) * group.member_count;
  const totalFee = feePerCycle * selectedCycles;

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Back link */}
      <Link
        to={`/ajo/${id}`}
        className="inline-flex items-center gap-1 text-sm text-(--text-secondary) hover:text-(--text-primary)"
      >
        <ChevronLeftIcon className="h-4 w-4" />
        Back to group
      </Link>

      {/* Page title */}
      <h1 className="text-2xl font-bold text-(--text-primary)">
        {group.name} — Subscription
      </h1>

      {/* Status card */}
      <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-5 space-y-3">
        <div className="flex items-center gap-3">
          <span className="text-sm font-semibold text-(--text-primary)">Current status</span>
          <SubscriptionStatusBadge group={group} />
        </div>

        {group.is_subscription_active && group.subscription_expires && (
          <p className="text-sm text-green-700 font-medium">
            Active until {formatDate(group.subscription_expires)}
          </p>
        )}

        {!group.is_subscription_active && group.is_on_trial && (
          <p className="text-sm text-blue-700 font-medium">Trial active</p>
        )}

        {!group.is_subscription_active && !group.is_on_trial && (
          <p className="text-sm text-red-600 font-medium">No active subscription</p>
        )}
      </div>

      {/* How it works */}
      <div className="flex gap-3 rounded-xl bg-(--bg) border border-(--border) px-4 py-4">
        <InformationCircleIcon className="h-5 w-5 text-(--text-muted) shrink-0 mt-0.5" />
        <p className="text-sm text-(--text-secondary)">
          The platform fee keeps your group running. Pay for multiple cycles in advance to save time.
        </p>
      </div>

      {/* Pricing breakdown */}
      <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-5 space-y-3">
        <h2 className="text-sm font-semibold text-(--text-primary)">Pricing breakdown</h2>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="text-(--text-secondary)">Frequency</dt>
          <dd className="text-(--text-primary) font-medium capitalize">
            {group.contribution_frequency}
          </dd>

          <dt className="text-(--text-secondary)">Contribution amount</dt>
          <dd className="text-(--text-primary) font-medium">
            {formatCurrency(Number(group.contribution_amount))}
          </dd>

          <dt className="text-(--text-secondary)">Members</dt>
          <dd className="text-(--text-primary) font-medium">{group.member_count}</dd>

          <dt className="text-(--text-secondary)">Platform rate</dt>
          <dd className="text-(--text-primary) font-medium">
            {RATE_LABEL[group.contribution_frequency]} per cycle
          </dd>

          <dt className="text-(--text-secondary) font-semibold">Fee per cycle</dt>
          <dd className="text-orange-600 font-bold">{formatCurrency(feePerCycle)}</dd>
        </dl>
      </div>

      {/* Cycle selector + Pay Now (admin only) */}
      {isAdmin && (
        <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-5 space-y-5">
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-(--text-primary)">Select cycles</h2>

            {/* Button group */}
            <div className="flex gap-2">
              {CYCLE_OPTIONS.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setSelectedCycles(n)}
                  className={clsx(
                    'flex-1 py-2 rounded-lg text-sm font-semibold border transition-colors',
                    selectedCycles === n
                      ? 'bg-orange-600 text-white border-orange-600'
                      : 'bg-(--surface) text-(--text-secondary) border-(--border) hover:border-orange-400 hover:text-orange-600',
                  )}
                >
                  {n}
                </button>
              ))}
            </div>

            <p className="text-sm text-(--text-secondary)">
              Total:{' '}
              <span className="font-bold text-(--text-primary)">{formatCurrency(totalFee)}</span>
            </p>
          </div>

          {/* Pay Now button */}
          {!verifySuccess && (
            <button
              type="button"
              onClick={() => {
                setPaymentInitiated(false);
                setVerifyError('');
                initiateMutation.mutate();
              }}
              disabled={initiateMutation.isPending}
              className={clsx('w-full sm:w-auto', orangeBtn, 'flex items-center justify-center gap-2 py-3 px-6')}
            >
              <CreditCardIcon className="h-4 w-4" />
              {initiateMutation.isPending ? 'Opening payment…' : 'Pay Now'}
            </button>
          )}

          {initiateMutation.isError && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {(initiateMutation.error as any)?.response?.data?.detail ??
                'Failed to initiate payment. Please try again.'}
            </p>
          )}

          {/* Verify section — shown after Pay Now is clicked */}
          {paymentInitiated && !verifySuccess && (
            <div className="space-y-4 pt-2 border-t border-(--border)">
              <p className="text-sm text-(--text-secondary)">
                After completing payment, enter your transaction ID below to confirm.
              </p>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-(--text-primary)">
                  Transaction ID
                </label>
                <input
                  type="text"
                  value={transactionId}
                  onChange={(e) => {
                    setTransactionId(e.target.value);
                    setVerifyError('');
                  }}
                  placeholder="e.g. FLW-MOCK-123456"
                  className={inputCls}
                />
              </div>

              {verifyError && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-200 px-3 py-2.5">
                  <XCircleIcon className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-700">{verifyError}</p>
                </div>
              )}

              <button
                type="button"
                onClick={() => verifyMutation.mutate()}
                disabled={verifyMutation.isPending || !transactionId.trim()}
                className={clsx(orangeBtn, 'w-full sm:w-auto')}
              >
                {verifyMutation.isPending ? 'Verifying…' : 'Verify Payment'}
              </button>
            </div>
          )}

          {/* Success state */}
          {verifySuccess && (
            <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-4">
              <CheckCircleIcon className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">Payment verified!</p>
                <p className="text-sm text-green-700 mt-0.5">
                  Subscription extended until{' '}
                  <span className="font-semibold">{formatDate(verifySuccess.extends_until)}</span>
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Non-admin notice */}
      {!isAdmin && (
        <div className="rounded-xl bg-(--bg) border border-(--border) px-4 py-4 text-sm text-(--text-secondary)">
          Only the group admin can manage the subscription. Contact{' '}
          <span className="font-medium text-(--text-primary)">
            {group.admin.first_name} {group.admin.last_name}
          </span>{' '}
          to renew.
        </div>
      )}
    </div>
  );
}
