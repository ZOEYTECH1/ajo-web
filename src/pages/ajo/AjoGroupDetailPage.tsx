import { useEffect, useRef, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQueries, useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import clsx from 'clsx';
import {
  ChevronLeftIcon, ChevronUpIcon, ChevronDownIcon,
  UserGroupIcon, CalendarIcon, KeyIcon,
  PaperClipIcon, CheckCircleIcon, XCircleIcon, PlusIcon,
  Cog6ToothIcon, ArrowPathIcon, ClipboardDocumentIcon,
  ExclamationTriangleIcon, EyeIcon, ArrowRightStartOnRectangleIcon,
  TrophyIcon, ClockIcon,
} from '@heroicons/react/24/outline';
import { Table, type Column } from '../../components/ui/Table';
import api from '../../services/api';
import useAuthStore from '../../store/useAuthStore';

// ── API shapes ────────────────────────────────────────────────────────────────

interface UserSnap {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
}

interface Group {
  id: number;
  name: string;
  description: string;
  rules?: string;
  contribution_frequency: string;
  contribution_amount: string;
  member_count: number;
  invite_code: string;
  is_on_trial: boolean;
  is_subscription_active: boolean;
  admin: UserSnap;
  created_at: string;
  grace_period_days?: number;
}

interface Membership {
  id: number;
  user: UserSnap;
  user_name?: string;
  user_email?: string;
  status: string;
  joined_at: string | null;
  total_approved: string;
  consecutive_default_streak: number;
}

interface Payment {
  id: number;
  submitted_by: UserSnap;
  cycle_number: number | null;
  amount_entered: string;
  status: string;
  submitted_at: string;
  receipt_image?: string | null;
  rejection_reason?: string;
}

interface Cycle {
  id: number;
  cycle_number: number;
  start_date: string;
  end_date: string;
  status: string;
  total_member_count: number;
  can_normal_close: boolean;
  force_close_requested: boolean;
  force_close_acceptor_count: number;
}

interface RemovalProposal {
  id: number;
  target_membership: number;
  target_name: string;
  target_user_id: number;
  status: string;
  eligible_count: number;
  yes_count: number;
  no_count: number;
  current_user_vote: boolean | null;
  created_at: string;
}

interface CollectionOrderEntry {
  id: number;
  user_id: number;
  full_name: string;
  profile_photo: string | null;
  collection_slot: number;
}

interface Defaulter {
  id: number;
  user: { id: number; first_name: string; last_name: string; profile_photo?: string | null };
  total_approved: string;
}

interface DefaultersResponse {
  cycle_number: number;
  end_date: string;
  status: string;
  visible_from: string;
  grace_period_active: boolean;
  defaulters: Defaulter[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(v));
}

function fullName(u: UserSnap) {
  return `${u.first_name} ${u.last_name}`.trim() || 'Member';
}

function StatusBadge({ value }: { value: string }) {
  const s = value.toLowerCase();
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium capitalize',
      s === 'approved' || s === 'active' || s === 'confirmed'
        ? 'bg-green-100 text-green-700'
        : s === 'pending'
        ? 'bg-yellow-100 text-yellow-700'
        : s === 'rejected' || s === 'closed'
        ? 'bg-red-100 text-red-600'
        : 'bg-gray-100 text-gray-600',
    )}>
      {value}
    </span>
  );
}

// ── Shared style constants ────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500';
const orangeBtn =
  'rounded-lg bg-orange-600 text-white px-4 py-2 text-sm font-semibold hover:bg-orange-700 disabled:opacity-50 transition-colors';
const cancelBtn =
  'rounded-lg border border-gray-300 text-gray-700 px-4 py-2 text-sm font-semibold hover:bg-gray-50 transition-colors';

// ── Submit Payment Modal ──────────────────────────────────────────────────────

function SubmitPaymentModal({
  groupId,
  groupName,
  contributionAmount,
  onClose,
}: {
  groupId: number;
  groupName: string;
  contributionAmount: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [amount, setAmount] = useState(String(Math.round(Number(contributionAmount))));
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => {
      const form = new FormData();
      form.append('amount_entered', amount.trim());
      if (file) form.append('receipt_image', file);
      return api.post(`/groups/${groupId}/payments/`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-group-payments', String(groupId)] });
      setSuccess(true);
    },
    onError: (e: any) => {
      const d = e.response?.data;
      setErr(
        d?.amount_entered?.[0] ?? d?.receipt_image?.[0] ??
        d?.non_field_errors?.[0] ?? d?.detail ?? 'Something went wrong.',
      );
    },
  });

  function handleFile(f: File | null) {
    setFile(f);
    if (f) setPreview(URL.createObjectURL(f));
    else setPreview(null);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    const amt = Number(amount.trim());
    if (!amount.trim() || isNaN(amt) || amt <= 0) {
      setErr('Enter a valid payment amount.');
      return;
    }
    mutation.mutate();
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full text-center space-y-4">
          <CheckCircleIcon className="h-16 w-16 text-green-500 mx-auto" />
          <h2 className="text-xl font-bold text-gray-900">Payment Submitted!</h2>
          <p className="text-sm text-gray-500">
            Your payment is pending review by the group admin.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="w-full mt-2 rounded-lg bg-orange-600 text-white py-2.5 font-semibold hover:bg-orange-700 transition-colors"
          >
            Back to Group
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Submit Payment</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <p className="text-sm text-gray-500">
            Group: <span className="font-medium text-gray-800">{groupName}</span>
          </p>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Amount (NGN)</label>
            <input
              type="number"
              min="1"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setErr(''); }}
              className={inputCls}
              placeholder={String(Math.round(Number(contributionAmount)))}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Receipt (optional)</label>
            {preview ? (
              <div className="relative rounded-xl overflow-hidden border border-gray-200">
                <img src={preview} alt="Receipt preview" className="w-full h-48 object-cover" />
                <button
                  type="button"
                  onClick={() => handleFile(null)}
                  className="absolute top-2 right-2 bg-red-100 text-red-600 rounded-full p-1 hover:bg-red-200 transition-colors"
                >
                  <XCircleIcon className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl border-2 border-dashed border-gray-300 py-8 flex flex-col items-center gap-2 hover:border-orange-400 hover:bg-orange-50 transition-colors"
              >
                <PaperClipIcon className="h-8 w-8 text-gray-400" />
                <span className="text-sm font-medium text-gray-500">Attach receipt photo</span>
                <span className="text-xs text-gray-400">Click to choose from your files</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
            />
          </div>

          {err && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={`flex-1 ${cancelBtn}`}>Cancel</button>
            <button
              type="submit"
              disabled={mutation.isPending || !amount.trim()}
              className={`flex-1 ${orangeBtn}`}
            >
              {mutation.isPending ? 'Submitting…' : 'Submit Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Reject Reason Modal ───────────────────────────────────────────────────────

function RejectModal({
  onConfirm,
  onCancel,
}: {
  onConfirm: (reason: string) => void;
  onCancel: () => void;
}) {
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-lg font-bold text-gray-900">Reject Payment</h3>
        <p className="text-sm text-gray-500">
          Optionally provide a reason so the member knows what to fix.
        </p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Wrong amount entered"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400"
        />
        <div className="flex gap-3">
          <button type="button" onClick={onCancel} className={cancelBtn}>Cancel</button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            className="flex-1 rounded-lg bg-red-600 text-white py-2 text-sm font-semibold hover:bg-red-700"
          >
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Receipt Viewer Modal ──────────────────────────────────────────────────────

function ReceiptViewerModal({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-w-2xl w-full flex flex-col items-center"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-10 right-0 text-white/80 hover:text-white text-sm flex items-center gap-1"
        >
          <XCircleIcon className="h-6 w-6" />
          <span>Close</span>
        </button>
        <img
          src={url}
          alt="Payment receipt"
          className="rounded-xl object-contain max-h-[80vh] w-full"
        />
      </div>
    </div>
  );
}

// ── Group Settings Modal ──────────────────────────────────────────────────────

function GroupSettingsModal({
  group,
  onClose,
}: {
  group: Group;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: group.name,
    description: group.description ?? '',
    rules: group.rules ?? '',
    grace_period_days: String(group.grace_period_days ?? 0),
  });
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/groups/${group.id}/`, {
        name: form.name.trim(),
        description: form.description.trim(),
        rules: form.rules.trim(),
        grace_period_days: Math.min(30, Math.max(0, Number(form.grace_period_days) || 0)),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-group', String(group.id)] });
      setSuccess(true);
      setTimeout(onClose, 800);
    },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? (first as string[])[0] : String(first ?? 'Something went wrong.')));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!form.name.trim()) { setErr('Group name is required.'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Group Settings</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Group Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Description</label>
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Rules (optional)</label>
            <textarea
              rows={3}
              value={form.rules}
              onChange={(e) => setForm((f) => ({ ...f, rules: e.target.value }))}
              placeholder="e.g. All payments must be made by the 5th of each month…"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Grace Period (days, 0–30)
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={form.grace_period_days}
              onChange={(e) => setForm((f) => ({ ...f, grace_period_days: e.target.value }))}
              className={inputCls}
            />
          </div>

          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          {success && <p className="text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2">Settings saved!</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} className={orangeBtn}>
              {mutation.isPending ? 'Saving…' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Start Cycle Modal ─────────────────────────────────────────────────────────

function StartCycleModal({
  groupId,
  onClose,
}: {
  groupId: number;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () =>
      api.post(`/groups/${groupId}/cycles/`, { start_date: startDate, end_date: endDate }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-group-cycles', String(groupId)] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? (first as string[])[0] : String(first ?? 'Something went wrong.')));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!startDate || !endDate) { setErr('Both dates are required.'); return; }
    mutation.mutate();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900">Start New Cycle</h2>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XCircleIcon className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setErr(''); }}
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setErr(''); }}
              className={inputCls}
            />
          </div>

          {err && <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} className={orangeBtn}>
              {mutation.isPending ? 'Creating…' : 'Create Cycle'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Payments Tab ──────────────────────────────────────────────────────────────

function PaymentsTab({
  payments,
  groupId,
  isAdmin,
}: {
  payments: Payment[];
  groupId: number;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [rejectTarget, setRejectTarget] = useState<number | null>(null);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);

  const reviewMutation = useMutation({
    mutationFn: ({ paymentId, action, reason }: { paymentId: number; action: string; reason?: string }) =>
      api.patch(`/groups/${groupId}/payments/${paymentId}/`, { action, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-group-payments', String(groupId)] });
      setRejectTarget(null);
    },
  });

  const filteredPayments = filter === 'all'
    ? payments
    : payments.filter((p) => p.status === filter);

  const filterPills = [
    { key: 'all' as const,      label: 'All',      count: payments.length },
    { key: 'pending' as const,  label: 'Pending',  count: payments.filter((p) => p.status === 'pending').length },
    { key: 'approved' as const, label: 'Approved', count: payments.filter((p) => p.status === 'approved').length },
    { key: 'rejected' as const, label: 'Rejected', count: payments.filter((p) => p.status === 'rejected').length },
  ];

  const cols: Column<Record<string, unknown>>[] = [
    {
      key: 'submitted_by',
      header: 'Member',
      render: (_, row) => fullName(row.submitted_by as UserSnap),
    },
    { key: 'cycle_number', header: 'Cycle', render: (v) => String(v ?? '—') },
    { key: 'amount_entered', header: 'Amount', render: (v) => formatCurrency(v as string) },
    {
      key: 'submitted_at',
      header: 'Date',
      render: (v) => {
        try { return format(new Date(v as string), 'dd MMM yyyy'); } catch { return v as string; }
      },
    },
    { key: 'status', header: 'Status', render: (v) => <StatusBadge value={v as string} /> },
    {
      key: 'rejection_reason',
      header: 'Reason',
      render: (v) => v
        ? <span className="text-xs text-red-600">{v as string}</span>
        : <span className="text-xs text-gray-400">—</span>,
    },
    {
      key: 'receipt_image',
      header: 'Receipt',
      render: (v) => {
        if (!v) return <span className="text-xs text-gray-400">—</span>;
        return (
          <button
            type="button"
            onClick={() => setReceiptUrl(v as string)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-600 text-xs font-semibold hover:bg-blue-100 transition-colors"
          >
            <EyeIcon className="h-3 w-3" />
            View
          </button>
        );
      },
    },
    ...(isAdmin
      ? [{
          key: 'id',
          header: 'Actions',
          render: (id: unknown, row: Record<string, unknown>) => {
            if ((row.status as string) !== 'pending') return <span className="text-xs text-gray-400">—</span>;
            const payId = id as number;
            return (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => reviewMutation.mutate({ paymentId: payId, action: 'approve' })}
                  disabled={reviewMutation.isPending}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 disabled:opacity-50 transition-colors"
                >
                  <CheckCircleIcon className="h-3.5 w-3.5" /> Approve
                </button>
                <button
                  type="button"
                  onClick={() => setRejectTarget(payId)}
                  disabled={reviewMutation.isPending}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors"
                >
                  <XCircleIcon className="h-3.5 w-3.5" /> Reject
                </button>
              </div>
            );
          },
        } as Column<Record<string, unknown>>]
      : []),
  ];

  return (
    <>
      {/* Filter pills */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {filterPills.map(({ key, label, count }) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={clsx(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
              filter === key
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
            )}
          >
            {label}
            <span className={clsx(
              'inline-flex items-center justify-center h-4 min-w-[1rem] rounded-full text-[10px] font-bold px-0.5',
              filter === key ? 'bg-white/25 text-white' : 'bg-white text-gray-500',
            )}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <Table
        columns={cols}
        data={filteredPayments as unknown as Record<string, unknown>[]}
        emptyMessage="No payments yet."
      />

      {rejectTarget !== null && (
        <RejectModal
          onConfirm={(reason) => reviewMutation.mutate({ paymentId: rejectTarget, action: 'reject', reason })}
          onCancel={() => setRejectTarget(null)}
        />
      )}

      {receiptUrl && (
        <ReceiptViewerModal url={receiptUrl} onClose={() => setReceiptUrl(null)} />
      )}
    </>
  );
}

// ── Members Tab ───────────────────────────────────────────────────────────────

function MembersTab({
  members,
  groupId,
  isAdmin,
  removals,
  payments,
  activeCycle,
  currentUserId,
}: {
  members: Membership[];
  groupId: number;
  isAdmin: boolean;
  removals: RemovalProposal[];
  payments: Payment[];
  activeCycle: Cycle | undefined;
  currentUserId?: number;
}) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [memberSubTab, setMemberSubTab] = useState<'approved' | 'pending'>('approved');
  const [proposePendingId, setProposePendingId] = useState<number | null>(null);
  const [proposePendingName, setProposePendingName] = useState('');
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

  const approveMemberMutation = useMutation({
    mutationFn: ({ membershipId, action }: { membershipId: number; action: 'approve' | 'reject' }) =>
      api.patch(`/groups/${groupId}/members/${membershipId}/`, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-group-members', String(groupId)] });
      qc.invalidateQueries({ queryKey: ['ajo-group', String(groupId)] });
    },
  });

  const proposeRemovalMutation = useMutation({
    mutationFn: (membershipId: number) =>
      api.post(`/groups/${groupId}/members/${membershipId}/propose-removal/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-group-removals', String(groupId)] });
    },
  });

  const voteMutation = useMutation({
    mutationFn: ({ proposalId, approved }: { proposalId: number; approved: boolean }) =>
      api.post(`/groups/${groupId}/removals/${proposalId}/vote/`, { approved }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-group-removals', String(groupId)] });
    },
  });

  const leaveMutation = useMutation({
    mutationFn: () => api.post(`/groups/${groupId}/leave/`),
    onSuccess: () => {
      navigate('/ajo');
    },
  });

  const approvedMembers = members.filter((m) => m.status === 'approved');
  const pendingMembers = members.filter((m) => m.status === 'pending');
  const pendingRemovals = removals.filter((r) => r.status === 'pending');

  const approvedCols: Column<Record<string, unknown>>[] = [
    { key: 'user_name', header: 'Name', render: (_, row) => fullName(row.user as UserSnap) },
    { key: 'total_approved', header: 'Total Saved', render: (v) => formatCurrency(v as string) },
    {
      key: 'consecutive_default_streak',
      header: 'Streak',
      render: (v) => {
        const streak = v as number;
        if (!streak) return <span className="text-xs text-gray-400">—</span>;
        return (
          <span className={clsx(
            'inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold',
            streak >= 3 ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-700',
          )}>
            {streak}× default
          </span>
        );
      },
    },
    {
      key: 'joined_at',
      header: 'Joined',
      render: (v) => {
        if (!v) return '—';
        try { return format(new Date(v as string), 'dd MMM yyyy'); } catch { return v as string; }
      },
    },
    {
      key: 'user',
      header: 'This Cycle',
      render: (userSnap) => {
        if (!activeCycle) return <span className="text-xs text-gray-400">No cycle</span>;
        const userId = (userSnap as UserSnap).id;
        const pay = payments.find(
          (p) => p.submitted_by.id === userId && p.cycle_number === activeCycle.cycle_number,
        );
        if (!pay) {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-600">
              Not paid
            </span>
          );
        }
        if (pay.status === 'approved') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
              Approved
            </span>
          );
        }
        if (pay.status === 'pending') {
          return (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
              Pending
            </span>
          );
        }
        return <StatusBadge value={pay.status} />;
      },
    },
    { key: 'status', header: 'Member Status', render: (v) => <StatusBadge value={v as string} /> },
    ...(isAdmin
      ? [{
          key: 'id',
          header: 'Action',
          render: (id: unknown, row: Record<string, unknown>) => (
            <button
              type="button"
              onClick={() => {
                setProposePendingId(id as number);
                setProposePendingName(fullName((row as unknown as Membership).user));
              }}
              disabled={proposeRemovalMutation.isPending}
              className="px-2.5 py-1 rounded-md bg-red-50 text-red-600 text-xs font-semibold hover:bg-red-100 disabled:opacity-50 transition-colors"
            >
              Propose Removal
            </button>
          ),
        } as Column<Record<string, unknown>>]
      : []),
  ];

  const pendingCols: Column<Record<string, unknown>>[] = [
    { key: 'user_name', header: 'Name', render: (_, row) => fullName(row.user as UserSnap) },
    {
      key: 'joined_at',
      header: 'Requested',
      render: (v) => {
        if (!v) return '—';
        try { return format(new Date(v as string), 'dd MMM yyyy'); } catch { return v as string; }
      },
    },
    {
      key: 'id',
      header: 'Actions',
      render: (id: unknown) => (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => approveMemberMutation.mutate({ membershipId: id as number, action: 'approve' })}
            disabled={approveMemberMutation.isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-green-100 text-green-700 text-xs font-semibold hover:bg-green-200 disabled:opacity-50 transition-colors"
          >
            <CheckCircleIcon className="h-3.5 w-3.5" /> Approve
          </button>
          <button
            type="button"
            onClick={() => approveMemberMutation.mutate({ membershipId: id as number, action: 'reject' })}
            disabled={approveMemberMutation.isPending}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors"
          >
            <XCircleIcon className="h-3.5 w-3.5" /> Reject
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        <button
          type="button"
          onClick={() => setMemberSubTab('approved')}
          className={clsx(
            'px-4 py-2 text-sm font-medium transition-colors',
            memberSubTab === 'approved'
              ? 'border-b-2 border-orange-600 text-orange-600'
              : 'text-gray-500 hover:text-gray-700',
          )}
        >
          Approved
          <span className="ml-1.5 text-xs text-gray-400">{approvedMembers.length}</span>
        </button>
        {isAdmin && (
          <button
            type="button"
            onClick={() => setMemberSubTab('pending')}
            className={clsx(
              'px-4 py-2 text-sm font-medium transition-colors',
              memberSubTab === 'pending'
                ? 'border-b-2 border-orange-600 text-orange-600'
                : 'text-gray-500 hover:text-gray-700',
            )}
          >
            Pending
            {pendingMembers.length > 0 && (
              <span className="ml-1.5 text-xs bg-orange-100 text-orange-600 rounded-full px-1.5 py-0.5">
                {pendingMembers.length}
              </span>
            )}
          </button>
        )}
      </div>

      {memberSubTab === 'approved' && (
        <Table
          columns={approvedCols}
          data={approvedMembers as unknown as Record<string, unknown>[]}
          emptyMessage="No approved members."
        />
      )}

      {memberSubTab === 'pending' && isAdmin && (
        <Table
          columns={pendingCols}
          data={pendingMembers as unknown as Record<string, unknown>[]}
          emptyMessage="No pending membership requests."
        />
      )}

      {/* Propose removal confirm dialog */}
      {proposePendingId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Propose Removal</h3>
            <p className="text-sm text-gray-600">
              Propose removing <span className="font-semibold text-gray-900">{proposePendingName}</span> from the group?
              Other members will vote on whether to approve the removal.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setProposePendingId(null); setProposePendingName(''); }}
                className={cancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={proposeRemovalMutation.isPending}
                onClick={() => {
                  proposeRemovalMutation.mutate(proposePendingId, {
                    onSuccess: () => { setProposePendingId(null); setProposePendingName(''); },
                  });
                }}
                className="flex-1 rounded-lg bg-red-600 text-white py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {proposeRemovalMutation.isPending ? 'Proposing…' : 'Yes, Propose'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Removal proposals */}
      {pendingRemovals.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-700">Removal Proposals</h3>
          {pendingRemovals.map((proposal) => (
            <div
              key={proposal.id}
              className="rounded-xl border border-gray-200 p-4 space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{proposal.target_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {proposal.yes_count} yes · {proposal.no_count} no · {proposal.eligible_count} eligible
                  </p>
                </div>

                <div className="flex gap-2">
                  {proposal.target_user_id === currentUserId ? (
                    <span className="text-xs text-gray-400 italic">You cannot vote on your own removal</span>
                  ) : proposal.current_user_vote === null ? (
                    <>
                      <button
                        type="button"
                        onClick={() => voteMutation.mutate({ proposalId: proposal.id, approved: true })}
                        disabled={voteMutation.isPending}
                        className="px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors"
                      >
                        Vote to Remove
                      </button>
                      <button
                        type="button"
                        onClick={() => voteMutation.mutate({ proposalId: proposal.id, approved: false })}
                        disabled={voteMutation.isPending}
                        className="px-3 py-1.5 rounded-lg bg-gray-100 text-gray-700 text-xs font-semibold hover:bg-gray-200 disabled:opacity-50 transition-colors"
                      >
                        Vote to Keep
                      </button>
                    </>
                  ) : (
                    <span className={clsx(
                      'text-xs font-semibold px-3 py-1.5 rounded-lg',
                      proposal.current_user_vote ? 'bg-red-50 text-red-600' : 'bg-gray-100 text-gray-600',
                    )}>
                      You voted {proposal.current_user_vote ? 'to remove' : 'to keep'}
                    </span>
                  )}
                </div>
              </div>

              {/* Vote progress bar */}
              {proposal.eligible_count > 0 && (
                <div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-2 bg-orange-500 rounded-full transition-all"
                      style={{ width: `${Math.round((proposal.yes_count / proposal.eligible_count) * 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    {Math.round((proposal.yes_count / proposal.eligible_count) * 100)}% in favour · need &gt;50% to pass
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Leave group (non-admin members only) */}
      {!isAdmin && currentUserId && (
        <div className="pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={() => setShowLeaveConfirm(true)}
            className="inline-flex items-center gap-2 text-sm text-red-600 font-semibold hover:underline"
          >
            <ArrowRightStartOnRectangleIcon className="h-4 w-4" />
            Leave Group
          </button>
        </div>
      )}

      {/* Leave group confirm */}
      {showLeaveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <h3 className="text-lg font-bold text-gray-900">Leave Group</h3>
            <p className="text-sm text-gray-600">
              Are you sure you want to leave this group? This action cannot be undone.
            </p>
            {leaveMutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                {(leaveMutation.error as any)?.response?.data?.detail ?? 'Failed to leave group.'}
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowLeaveConfirm(false)}
                className={cancelBtn}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={leaveMutation.isPending}
                onClick={() => leaveMutation.mutate()}
                className="flex-1 rounded-lg bg-red-600 text-white py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {leaveMutation.isPending ? 'Leaving…' : 'Yes, Leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Cycles Tab ────────────────────────────────────────────────────────────────

function CyclesTab({
  cycles,
  groupId,
  isAdmin,
}: {
  cycles: Cycle[];
  groupId: number;
  isAdmin: boolean;
}) {
  const qc = useQueryClient();
  const [showStartCycle, setShowStartCycle] = useState(false);
  const [expandedDefaulters, setExpandedDefaulters] = useState<Record<number, boolean>>({});
  const [defaulterData, setDefaulterData] = useState<Record<number, DefaultersResponse | string>>({});

  const closeCycleMutation = useMutation({
    mutationFn: (cycleId: number) =>
      api.post(`/groups/${groupId}/cycles/${cycleId}/close/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-group-cycles', String(groupId)] });
    },
  });

  const requestForceCloseMutation = useMutation({
    mutationFn: (cycleId: number) =>
      api.post(`/groups/${groupId}/cycles/${cycleId}/request-early-close/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-group-cycles', String(groupId)] });
    },
  });

  const acceptForceCloseMutation = useMutation({
    mutationFn: (cycleId: number) =>
      api.post(`/groups/${groupId}/cycles/${cycleId}/accept-early-close/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-group-cycles', String(groupId)] });
    },
  });

  async function toggleDefaulters(cycleId: number) {
    const isOpen = expandedDefaulters[cycleId];
    setExpandedDefaulters((prev) => ({ ...prev, [cycleId]: !isOpen }));
    if (!isOpen && !defaulterData[cycleId]) {
      try {
        const res = await api.get<DefaultersResponse>(`/groups/${groupId}/cycles/${cycleId}/defaulters/`);
        setDefaulterData((prev) => ({ ...prev, [cycleId]: res.data }));
      } catch {
        setDefaulterData((prev) => ({ ...prev, [cycleId]: 'Failed to load defaulters.' }));
      }
    }
  }

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowStartCycle(true)}
            className={`inline-flex items-center gap-2 ${orangeBtn}`}
          >
            <PlusIcon className="h-4 w-4" />
            Start New Cycle
          </button>
        </div>
      )}

      {cycles.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No cycles started yet.</p>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => (
            <div key={cycle.id} className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4">
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">Cycle #{cycle.cycle_number}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {format(new Date(cycle.start_date), 'dd MMM yyyy')} —{' '}
                      {format(new Date(cycle.end_date), 'dd MMM yyyy')}
                    </p>
                    {cycle.force_close_requested && (
                      <p className="mt-1 text-xs text-orange-600 flex items-center gap-1">
                        <ClockIcon className="h-3 w-3" />
                        Early close: {cycle.force_close_acceptor_count}/{cycle.total_member_count} accepted
                      </p>
                    )}
                  </div>
                  <StatusBadge value={cycle.status} />
                  <span className="text-xs text-gray-400">{cycle.total_member_count} members</span>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => toggleDefaulters(cycle.id)}
                    className="px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
                  >
                    {expandedDefaulters[cycle.id] ? 'Hide Defaulters' : 'Defaulters'}
                  </button>

                  {/* Normal close — all members have paid */}
                  {isAdmin && cycle.status === 'active' && cycle.can_normal_close && (
                    <button
                      type="button"
                      onClick={() => closeCycleMutation.mutate(cycle.id)}
                      disabled={closeCycleMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-red-100 text-red-600 text-xs font-semibold hover:bg-red-200 disabled:opacity-50 transition-colors"
                    >
                      {closeCycleMutation.isPending ? 'Closing…' : 'Close Cycle'}
                    </button>
                  )}

                  {/* Request early close — not all paid yet */}
                  {isAdmin && cycle.status === 'active' && !cycle.can_normal_close && !cycle.force_close_requested && (
                    <button
                      type="button"
                      onClick={() => requestForceCloseMutation.mutate(cycle.id)}
                      disabled={requestForceCloseMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-600 text-xs font-semibold hover:bg-orange-200 disabled:opacity-50 transition-colors"
                    >
                      {requestForceCloseMutation.isPending ? 'Requesting…' : 'Request Early Close'}
                    </button>
                  )}

                  {/* Accept early close — all members can accept */}
                  {cycle.status === 'active' && cycle.force_close_requested && (
                    <button
                      type="button"
                      onClick={() => acceptForceCloseMutation.mutate(cycle.id)}
                      disabled={acceptForceCloseMutation.isPending}
                      className="px-3 py-1.5 rounded-lg bg-orange-100 text-orange-600 text-xs font-semibold hover:bg-orange-200 disabled:opacity-50 transition-colors"
                    >
                      {acceptForceCloseMutation.isPending ? 'Accepting…' : 'Accept Early Close'}
                    </button>
                  )}
                </div>
              </div>

              {expandedDefaulters[cycle.id] && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  {!defaulterData[cycle.id] ? (
                    <p className="text-xs text-gray-400 animate-pulse">Loading defaulters…</p>
                  ) : typeof defaulterData[cycle.id] === 'string' ? (
                    <p className="text-xs text-red-500">{defaulterData[cycle.id] as string}</p>
                  ) : (defaulterData[cycle.id] as DefaultersResponse).grace_period_active ? (
                    <p className="text-xs text-gray-500">
                      Grace period active — defaulters visible from{' '}
                      {format(new Date((defaulterData[cycle.id] as DefaultersResponse).visible_from), 'dd MMM yyyy')}.
                    </p>
                  ) : (defaulterData[cycle.id] as DefaultersResponse).defaulters.length === 0 ? (
                    <p className="text-xs text-gray-500">No defaulters for this cycle.</p>
                  ) : (
                    <ul className="space-y-1">
                      {(defaulterData[cycle.id] as DefaultersResponse).defaulters.map((d) => (
                        <li key={d.id} className="text-xs text-gray-700">
                          {d.user.first_name} {d.user.last_name}{' '}
                          <span className="text-orange-600">· paid {formatCurrency(d.total_approved)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showStartCycle && (
        <StartCycleModal groupId={groupId} onClose={() => setShowStartCycle(false)} />
      )}
    </div>
  );
}

// ── Collection Order Tab ──────────────────────────────────────────────────────

function CollectionOrderTab({
  groupId,
  isAdmin,
  active,
  activeCycleNumber,
}: {
  groupId: number;
  isAdmin: boolean;
  active: boolean;
  activeCycleNumber?: number;
}) {
  const qc = useQueryClient();
  const { data, isLoading, error } = useQuery<CollectionOrderEntry[]>({
    queryKey: ['ajo-group-collection-order', String(groupId)],
    queryFn: () => api.get(`/groups/${groupId}/collection-order/`).then((r) => r.data),
    enabled: active,
  });

  const [localOrder, setLocalOrder] = useState<CollectionOrderEntry[]>([]);
  const [isDirty, setIsDirty] = useState(false);
  const [saveErr, setSaveErr] = useState('');

  useEffect(() => {
    if (data) {
      setLocalOrder([...data].sort((a, b) => a.collection_slot - b.collection_slot));
      setIsDirty(false);
      setSaveErr('');
    }
  }, [data]);

  const totalSlots = localOrder.length;
  const effectiveSlot = activeCycleNumber != null && totalSlots > 0
    ? ((activeCycleNumber - 1) % totalSlots) + 1
    : null;

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch(`/groups/${groupId}/collection-order/`, { order: localOrder.map((e) => e.id) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-group-collection-order', String(groupId)] });
    },
    onError: (e: any) => {
      setSaveErr(e.response?.data?.detail ?? 'Failed to save order.');
    },
  });

  function moveUp(index: number) {
    if (index === 0) return;
    setLocalOrder((prev) => {
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
    setIsDirty(true);
  }

  function moveDown(index: number) {
    if (index === localOrder.length - 1) return;
    setLocalOrder((prev) => {
      const next = [...prev];
      [next[index], next[index + 1]] = [next[index + 1], next[index]];
      return next;
    });
    setIsDirty(true);
  }

  function shuffle() {
    setLocalOrder((prev) => {
      const next = [...prev];
      for (let i = next.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [next[i], next[j]] = [next[j], next[i]];
      }
      return next;
    });
    setIsDirty(true);
  }

  if (!active) return null;
  if (isLoading) return <p className="text-sm text-gray-400 animate-pulse">Loading collection order…</p>;
  if (error) return <p className="text-sm text-red-500">Failed to load collection order.</p>;
  if (!data || data.length === 0) return <p className="text-sm text-gray-500 text-center py-8">No collection order set.</p>;

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-500">Drag members up or down, then save.</p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={shuffle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 text-sm font-semibold hover:bg-gray-50 transition-colors"
            >
              <ArrowPathIcon className="h-4 w-4" />
              Shuffle
            </button>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={!isDirty || saveMutation.isPending}
              className={clsx(
                'inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors',
                isDirty
                  ? 'bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed',
              )}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save Order'}
            </button>
          </div>
        </div>
      )}

      {saveErr && (
        <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{saveErr}</p>
      )}

      <ol className="space-y-2">
        {localOrder.map((entry, index) => (
          (() => {
            const isCurrent = effectiveSlot != null && entry.collection_slot === effectiveSlot;
            return (
              <li
                key={entry.id}
                className={clsx(
                  'flex items-center gap-3 rounded-lg border px-4 py-3',
                  isCurrent
                    ? 'bg-orange-50 border-orange-200'
                    : 'border-gray-100 bg-white',
                )}
              >
                <span className={clsx('text-sm font-bold w-6 text-right shrink-0', isCurrent ? 'text-orange-600' : 'text-gray-400')}>
                  {index + 1}
                </span>
                {isCurrent && <TrophyIcon className="h-4 w-4 text-orange-500 shrink-0" />}
                <span className={clsx('text-sm font-medium flex-1', isCurrent ? 'text-orange-700 font-semibold' : 'text-gray-700')}>{entry.full_name}</span>
                {isCurrent && (
                  <span className="text-xs font-semibold bg-orange-100 text-orange-600 rounded-full px-2 py-0.5">Now</span>
                )}
                {isAdmin && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => moveUp(index)}
                      disabled={index === 0}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      title="Move up"
                    >
                      <ChevronUpIcon className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(index)}
                      disabled={index === localOrder.length - 1}
                      className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 transition-colors"
                      title="Move down"
                    >
                      <ChevronDownIcon className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            );
          })()
        ))}
      </ol>
    </div>
  );
}

// ── History Tab ───────────────────────────────────────────────────────────────

function HistoryTab({
  groupId,
  cycles,
  payments,
  active,
}: {
  groupId: number;
  cycles: Cycle[];
  payments: Payment[];
  active: boolean;
}) {
  const { data: collectionOrder = [] } = useQuery<CollectionOrderEntry[]>({
    queryKey: ['ajo-group-collection-order', String(groupId)],
    queryFn: () => api.get(`/groups/${groupId}/collection-order/`).then((r) => r.data),
    enabled: active,
  });

  const closedCycles = [...cycles]
    .filter((c) => c.status === 'closed')
    .sort((a, b) => b.cycle_number - a.cycle_number);

  if (closedCycles.length === 0) {
    return (
      <p className="text-sm text-gray-500 text-center py-8">
        No completed cycles yet. History will appear here once cycles are closed.
      </p>
    );
  }

  const sortedOrder = [...collectionOrder].sort((a, b) => a.collection_slot - b.collection_slot);

  return (
    <div className="space-y-3">
      {closedCycles.map((cycle) => {
        const recipient = sortedOrder[cycle.cycle_number - 1];
        const approvedPays = payments.filter((p) => p.cycle_number === cycle.cycle_number && p.status === 'approved');
        const pot = approvedPays.reduce((sum, p) => sum + Number(p.amount_entered), 0);
        const paidCount = approvedPays.length;

        return (
          <div key={cycle.id} className="rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                  <TrophyIcon className="h-4 w-4 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">Cycle #{cycle.cycle_number}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(new Date(cycle.start_date), 'dd MMM yyyy')} —{' '}
                    {format(new Date(cycle.end_date), 'dd MMM yyyy')}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {recipient && (
                  <div>
                    <p className="text-xs text-gray-500">Recipient</p>
                    <p className="text-sm font-semibold text-gray-900">{recipient.full_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Members Paid</p>
                  <p className="text-sm font-semibold text-gray-900">{paidCount}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Total Collected</p>
                  <p className="text-sm font-semibold text-green-700">{formatCurrency(pot)}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

type TabKey = 'payments' | 'members' | 'cycles' | 'order' | 'history';

export default function AjoGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [activeTab, setActiveTab] = useState<TabKey>('payments');
  const [showSubmit, setShowSubmit] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);

  const [groupQ, membersQ, paymentsQ, cyclesQ] = useQueries({
    queries: [
      {
        queryKey: ['ajo-group', id],
        queryFn: () => api.get<Group>(`/groups/${id}/`).then((r) => r.data),
        enabled: !!id,
      },
      {
        queryKey: ['ajo-group-members', id],
        queryFn: () => api.get<Membership[]>(`/groups/${id}/members/`).then((r) => r.data),
        enabled: !!id,
      },
      {
        queryKey: ['ajo-group-payments', id],
        queryFn: () => api.get<Payment[]>(`/groups/${id}/payments/`).then((r) => r.data),
        enabled: !!id,
      },
      {
        queryKey: ['ajo-group-cycles', id],
        queryFn: () => api.get<Cycle[]>(`/groups/${id}/cycles/`).then((r) => r.data),
        enabled: !!id,
      },
    ],
  });

  const { data: removals = [] } = useQuery<RemovalProposal[]>({
    queryKey: ['ajo-group-removals', id],
    queryFn: () => api.get<RemovalProposal[]>(`/groups/${id}/removals/`).then((r) => r.data),
    enabled: !!id && activeTab === 'members',
  });

  const regenerateMutation = useMutation({
    mutationFn: () => api.post(`/groups/${id}/invite/regenerate/`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ajo-group', id] });
    },
  });

  function copyInviteCode(code: string) {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (groupQ.isLoading || membersQ.isLoading || paymentsQ.isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-1/3" />
        <div className="h-36 bg-gray-200 rounded-xl" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (groupQ.error || !groupQ.data) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-6 text-center text-sm text-red-700">
        Failed to load group details.{' '}
        <Link to="/ajo" className="underline font-medium">Go back</Link>
      </div>
    );
  }

  const group    = groupQ.data;
  const members  = membersQ.data ?? [];
  const payments = paymentsQ.data ?? [];
  const cycles   = cyclesQ.data ?? [];

  const isAdmin         = currentUser?.id === group.admin.id;
  const activeCycle     = cycles.find((c) => c.status === 'active');
  const approvedMembers = members.filter((m) => m.status === 'approved');

  const myActivePay = activeCycle
    ? payments.find(
        (p) => p.submitted_by.id === currentUser?.id && p.cycle_number === activeCycle.cycle_number,
      )
    : undefined;
  const canSubmit = !!activeCycle && !isAdmin && !myActivePay;

  const pendingPaymentsCount = activeCycle
    ? payments.filter((p) => p.cycle_number === activeCycle.cycle_number && p.status === 'pending').length
    : 0;

  const tabs: { key: TabKey; label: string; count?: number }[] = [
    { key: 'payments', label: 'Payments', count: payments.length },
    { key: 'members',  label: 'Members',  count: approvedMembers.length },
    { key: 'cycles',   label: 'Cycles',   count: cycles.length },
    { key: 'order',    label: 'Collection Order' },
    { key: 'history',  label: 'History' },
  ];

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link to="/ajo" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ChevronLeftIcon className="h-4 w-4" />
        Back to groups
      </Link>

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setShowSettings(true)}
                  title="Group settings"
                  className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <Cog6ToothIcon className="h-5 w-5" />
                </button>
              )}
            </div>
            {group.description && (
              <p className="text-sm text-gray-500 mt-1">{group.description}</p>
            )}
            {group.rules && (
              <details className="mt-2 group/rules">
                <summary className="cursor-pointer text-xs text-orange-600 font-semibold hover:underline select-none">
                  View group rules
                </summary>
                <p className="mt-1.5 text-xs text-gray-600 bg-orange-50 rounded-lg px-3 py-2 leading-relaxed whitespace-pre-line">
                  {group.rules}
                </p>
              </details>
            )}
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-gray-600">
              <span className="inline-flex items-center gap-1">
                <UserGroupIcon className="h-4 w-4" />
                {group.member_count} members
              </span>
              {activeCycle && (
                <span className="inline-flex items-center gap-1">
                  <CalendarIcon className="h-4 w-4" />
                  Cycle {activeCycle.cycle_number} ends{' '}
                  {format(new Date(activeCycle.end_date), 'dd MMM yyyy')}
                </span>
              )}
            </div>

            {/* Invite code section — admin only */}
            {isAdmin && (
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1.5 font-mono tracking-widest text-gray-500 text-sm bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5">
                  <KeyIcon className="h-4 w-4 text-gray-400" />
                  {group.invite_code}
                </span>
                <button
                  type="button"
                  onClick={() => copyInviteCode(group.invite_code)}
                  title="Copy invite code"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 transition-colors"
                >
                  <ClipboardDocumentIcon className="h-3.5 w-3.5" />
                  {copied ? 'Copied!' : 'Copy'}
                </button>
                <button
                  type="button"
                  onClick={() => regenerateMutation.mutate()}
                  disabled={regenerateMutation.isPending}
                  title="Regenerate invite code"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 text-xs font-semibold hover:bg-gray-50 disabled:opacity-50 transition-colors"
                >
                  <ArrowPathIcon className={clsx('h-3.5 w-3.5', regenerateMutation.isPending && 'animate-spin')} />
                  Regenerate
                </button>
              </div>
            )}
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="bg-orange-50 rounded-lg px-5 py-3 text-center">
              <p className="text-orange-600 font-bold text-xl">{formatCurrency(group.contribution_amount)}</p>
              <p className="text-orange-500 text-xs capitalize">{group.contribution_frequency}</p>
            </div>
            {(group.is_on_trial || !group.is_subscription_active) && (
              <Link
                to={`/ajo/${id}/subscription`}
                className={clsx(
                  'text-xs rounded-full px-3 py-1 font-medium hover:opacity-80 transition-opacity',
                  group.is_on_trial
                    ? 'bg-blue-50 text-blue-600'
                    : 'bg-red-50 text-red-600',
                )}
              >
                {group.is_on_trial ? 'Trial active — upgrade' : 'No subscription — pay now'}
              </Link>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 pt-4 border-t border-gray-100 text-sm">
          <div>
            <p className="text-xs text-gray-500">Admin</p>
            <p className="font-medium text-gray-900">{fullName(group.admin)}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Total Cycles</p>
            <p className="font-medium text-gray-900">{cycles.length}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Active Cycle</p>
            <p className="font-medium text-gray-900">{activeCycle ? `#${activeCycle.cycle_number}` : 'None'}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">This Cycle Approved</p>
            <p className="font-medium text-green-700">
              {activeCycle
                ? formatCurrency(
                    payments
                      .filter((p) => p.cycle_number === activeCycle.cycle_number && p.status === 'approved')
                      .reduce((sum, p) => sum + Number(p.amount_entered), 0),
                  )
                : '—'}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">All-Time Approved</p>
            <p className="font-medium text-orange-600">
              {formatCurrency(
                payments
                  .filter((p) => p.status === 'approved')
                  .reduce((sum, p) => sum + Number(p.amount_entered), 0),
              )}
            </p>
          </div>
        </div>

        {/* Member action: submit payment */}
        {canSubmit && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowSubmit(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-orange-600 text-white px-5 py-2.5 text-sm font-semibold hover:bg-orange-700 transition-colors"
            >
              <PlusIcon className="h-4 w-4" />
              Submit My Payment
            </button>
          </div>
        )}

        {myActivePay && !isAdmin && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-3">
            <span className="text-sm text-gray-600">Your payment for this cycle:</span>
            <StatusBadge value={myActivePay.status} />
            {myActivePay.status === 'rejected' && myActivePay.rejection_reason && (
              <span className="text-xs text-red-600">— {myActivePay.rejection_reason}</span>
            )}
          </div>
        )}
      </div>

      {/* Pending payments banner — admin only */}
      {isAdmin && pendingPaymentsCount > 0 && (
        <div className="flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3">
          <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 shrink-0" />
          <p className="text-sm text-yellow-800">
            <span className="font-semibold">
              {pendingPaymentsCount} pending payment{pendingPaymentsCount !== 1 ? 's' : ''}
            </span>{' '}
            in the active cycle awaiting your review.{' '}
            <button
              type="button"
              onClick={() => setActiveTab('payments')}
              className="underline font-semibold hover:text-yellow-900"
            >
              Review now
            </button>
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="border-b border-gray-100 flex overflow-x-auto">
          {tabs.map(({ key, label, count }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={clsx(
                'px-6 py-3 text-sm font-medium whitespace-nowrap transition-colors',
                activeTab === key
                  ? 'border-b-2 border-orange-600 text-orange-600'
                  : 'text-gray-500 hover:text-gray-700',
              )}
            >
              {label}
              {count !== undefined && (
                <span className="ml-1.5 text-xs text-gray-400">{count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'payments' && (
            <PaymentsTab payments={payments} groupId={Number(id)} isAdmin={isAdmin} />
          )}
          {activeTab === 'members' && (
            <MembersTab
              members={members}
              groupId={Number(id)}
              isAdmin={isAdmin}
              removals={removals}
              payments={payments}
              activeCycle={activeCycle}
              currentUserId={currentUser?.id}
            />
          )}
          {activeTab === 'cycles' && (
            <CyclesTab cycles={cycles} groupId={Number(id)} isAdmin={isAdmin} />
          )}
          {activeTab === 'order' && (
            <CollectionOrderTab groupId={Number(id)} isAdmin={isAdmin} active={activeTab === 'order'} activeCycleNumber={activeCycle?.cycle_number} />
          )}
          {activeTab === 'history' && (
            <HistoryTab
              groupId={Number(id)}
              cycles={cycles}
              payments={payments}
              active={activeTab === 'history'}
            />
          )}
        </div>
      </div>

      {showSubmit && (
        <SubmitPaymentModal
          groupId={Number(id)}
          groupName={group.name}
          contributionAmount={group.contribution_amount}
          onClose={() => setShowSubmit(false)}
        />
      )}

      {showSettings && isAdmin && (
        <GroupSettingsModal group={group} onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
