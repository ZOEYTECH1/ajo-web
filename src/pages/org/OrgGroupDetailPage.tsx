import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { ArrowLeftIcon, XCircleIcon, SignalIcon } from '@heroicons/react/24/outline';
import { Skeleton, SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';
import { useThriftGroupSocket } from '../../hooks/useThriftGroupSocket';

interface GroupBrief {
  id: number;
  uuid: string;
  name: string;
  frequency: string;
  collector: { id: number; first_name: string; last_name: string } | null;
  member_count: number;
}

interface Cycle {
  id: number;
  cycle_number: number;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'completed';
}

interface Member {
  id: number;
  user: { id: number; first_name: string; last_name: string };
}

interface Payment {
  id: number;
  member: number;
  member_name: string;
  cycle_id: number | null;
  amount: string;
  period_date: string;
  status: 'pending' | 'confirmed' | 'disputed';
  dispute_reason: string;
  dispute_audio: string | null;
  disputed_at: string | null;
}

type ViewMode = 'day' | 'week' | 'circle' | 'all';

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(v));
}

function fmt(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function todayISO() {
  return new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD, local time
}

/** Monday–Sunday range (as YYYY-MM-DD strings) containing the given date. */
function weekRange(dateStr: string): [string, string] {
  const d = new Date(`${dateStr}T00:00:00`);
  const day = d.getDay(); // 0 = Sun .. 6 = Sat
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  const toISO = (x: Date) => x.toLocaleDateString('en-CA');
  return [toISO(monday), toISO(sunday)];
}

function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      status === 'confirmed' ? 'bg-green-100 text-green-700'
      : status === 'disputed' ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700',
    )}>
      {status}
    </span>
  );
}

function DisputeDetailModal({ payment, onClose }: { payment: Payment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Dispute Details</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div className="rounded-xl bg-(--bg) border border-(--border) px-4 py-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-(--text-muted) text-xs font-medium">Payer</p>
              <p className="font-semibold text-(--text-primary) mt-0.5">{payment.member_name}</p>
            </div>
            <div>
              <p className="text-(--text-muted) text-xs font-medium">Amount</p>
              <p className="font-semibold text-(--text-primary) mt-0.5">{formatCurrency(payment.amount)}</p>
            </div>
            <div>
              <p className="text-(--text-muted) text-xs font-medium">Period</p>
              <p className="font-semibold text-(--text-primary) mt-0.5">{fmt(payment.period_date)}</p>
            </div>
            {payment.disputed_at && (
              <div>
                <p className="text-(--text-muted) text-xs font-medium">Disputed at</p>
                <p className="font-semibold text-(--text-primary) mt-0.5">
                  {new Date(payment.disputed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-1">Dispute Reason</p>
            <p className="text-sm text-(--text-primary) bg-red-50 border border-red-100 rounded-lg px-4 py-3 leading-relaxed">
              {payment.dispute_reason || <span className="italic text-(--text-muted)">No reason provided.</span>}
            </p>
          </div>

          {payment.dispute_audio ? (
            <div>
              <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-2">Voice Note</p>
              <audio controls src={payment.dispute_audio} className="w-full rounded-lg">
                Your browser does not support audio playback.
              </audio>
            </div>
          ) : (
            <p className="text-xs text-(--text-muted) italic">No voice note attached.</p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default function OrgGroupDetailPage() {
  const { uuid: orgUuid, groupUuid } = useParams<{ uuid: string; groupUuid: string }>();
  const qc = useQueryClient();

  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [anchorDate, setAnchorDate] = useState(todayISO());
  const [selectedCycleId, setSelectedCycleId] = useState<number | null>(null);
  const [viewDispute, setViewDispute] = useState<Payment | null>(null);
  const [isLive, setIsLive] = useState(false);
  const [earlyEndAlert, setEarlyEndAlert] = useState<string | null>(null);

  const { data: group, isLoading: groupLoading, error: groupError } = useQuery<GroupBrief>({
    queryKey: ['org-group', groupUuid],
    queryFn: () => api.get(`/thrift/${groupUuid}/`).then(r => r.data),
    enabled: !!groupUuid,
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ['org-group-payments', groupUuid],
    queryFn: () => api.get(`/thrift/${groupUuid}/payments/`).then(r => r.data),
    enabled: !!groupUuid,
  });

  const { data: cycles = [] } = useQuery<Cycle[]>({
    queryKey: ['org-group-cycles', groupUuid],
    queryFn: () => api.get(`/thrift/${groupUuid}/cycles/`).then(r => r.data),
    enabled: !!groupUuid,
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ['org-group-members', groupUuid],
    queryFn: () => api.get(`/thrift/${groupUuid}/members/`).then(r => r.data),
    enabled: !!groupUuid,
  });

  // Real-time: the moment a payer confirms or disputes (or the collector marks
  // a new payment, or a circle ends), refresh so the admin sees it without
  // reloading the page.
  useThriftGroupSocket(groupUuid, (e) => {
    setIsLive(true);
    if (e.event === 'cycle_end_blocked') {
      setEarlyEndAlert(`${e.collector_name} tried to end Cycle #${e.cycle_number} early — it runs until ${e.scheduled_end_date}.`);
    }
    if (e.event === 'cycle_ended' || e.event === 'cycle_end_blocked') {
      qc.invalidateQueries({ queryKey: ['org-group', groupUuid] });
      qc.invalidateQueries({ queryKey: ['org-group-cycles', groupUuid] });
    } else {
      qc.invalidateQueries({ queryKey: ['org-group-payments', groupUuid] });
    }
  });

  const sortedCycles = useMemo(
    () => [...cycles].sort((a, b) => b.cycle_number - a.cycle_number),
    [cycles],
  );

  const filteredPayments = useMemo(() => {
    let rows: Payment[];
    if (viewMode === 'day') {
      rows = payments.filter(p => p.period_date === anchorDate);
    } else if (viewMode === 'week') {
      const [start, end] = weekRange(anchorDate);
      rows = payments.filter(p => p.period_date >= start && p.period_date <= end);
    } else if (viewMode === 'circle') {
      rows = selectedCycleId == null ? [] : payments.filter(p => p.cycle_id === selectedCycleId);
    } else {
      rows = payments;
    }
    return [...rows].sort((a, b) => b.period_date.localeCompare(a.period_date));
  }, [payments, viewMode, anchorDate, selectedCycleId]);

  const totals = useMemo(() => {
    let expected = 0, actual = 0, disputedAmount = 0;
    let confirmedCount = 0, pendingCount = 0, disputedCount = 0;
    for (const p of filteredPayments) {
      const amt = Number(p.amount);
      if (p.status === 'confirmed') { actual += amt; expected += amt; confirmedCount++; }
      else if (p.status === 'disputed') { disputedAmount += amt; expected += amt; disputedCount++; }
      else pendingCount++;
    }
    return { expected, actual, disputedAmount, confirmedCount, pendingCount, disputedCount };
  }, [filteredPayments]);

  const lifetimeCollected = useMemo(
    () => payments.filter(p => p.status === 'confirmed').reduce((sum, p) => sum + Number(p.amount), 0),
    [payments],
  );

  const perPayer = useMemo(() => {
    const rows = new Map<number, { name: string; expected: number; confirmed: number; disputed: number }>();
    for (const m of members) {
      rows.set(m.id, { name: `${m.user.first_name} ${m.user.last_name}`, expected: 0, confirmed: 0, disputed: 0 });
    }
    for (const p of filteredPayments) {
      const entry = rows.get(p.member) ?? { name: p.member_name, expected: 0, confirmed: 0, disputed: 0 };
      const amt = Number(p.amount);
      if (p.status === 'confirmed') { entry.confirmed += amt; entry.expected += amt; }
      else if (p.status === 'disputed') { entry.disputed += amt; entry.expected += amt; }
      rows.set(p.member, entry);
    }
    return Array.from(rows.values()).sort((a, b) => b.expected - a.expected);
  }, [members, filteredPayments]);

  if (groupError) {
    return (
      <div className="space-y-4">
        <Link to={`/org/${orgUuid}`} className="inline-flex items-center gap-1.5 text-sm text-(--text-secondary) hover:text-teal-600">
          <ArrowLeftIcon className="h-4 w-4" /> Back to dashboard
        </Link>
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Group not found or you do not have access.
        </div>
      </div>
    );
  }

  const periodLabel =
    viewMode === 'day' ? fmt(anchorDate)
    : viewMode === 'week' ? (() => { const [s, e] = weekRange(anchorDate); return `${fmt(s)} – ${fmt(e)}`; })()
    : viewMode === 'circle' ? (sortedCycles.find(c => c.id === selectedCycleId)
        ? `Circle #${sortedCycles.find(c => c.id === selectedCycleId)!.cycle_number}` : 'Select a circle')
    : 'All circles';

  return (
    <div className="space-y-6">
      <Link to={`/org/${orgUuid}`} className="inline-flex items-center gap-1.5 text-sm text-(--text-secondary) hover:text-teal-600">
        <ArrowLeftIcon className="h-4 w-4" /> Back to dashboard
      </Link>

      {earlyEndAlert && (
        <div role="alert" className="flex items-start justify-between gap-3 rounded-lg bg-yellow-50 border border-yellow-200 px-4 py-3 text-sm text-yellow-800">
          <span>⚠️ {earlyEndAlert}</span>
          <button type="button" onClick={() => setEarlyEndAlert(null)} className="text-yellow-800 hover:underline font-semibold shrink-0">
            Dismiss
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6">
        {groupLoading ? (
          <Skeleton className="h-7 w-48" />
        ) : (
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-lg font-bold text-(--text-primary)">{group?.name}</h1>
              <p className="text-sm text-(--text-secondary) mt-0.5 capitalize">
                {group?.frequency} circle · {group?.member_count} member{group?.member_count === 1 ? '' : 's'}
                {group?.collector && <> · Collector: {group.collector.first_name} {group.collector.last_name}</>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-(--text-secondary) uppercase tracking-wider font-semibold">Lifetime Collected</p>
              <p className="text-lg font-bold text-(--text-primary) mt-0.5">{formatCurrency(lifetimeCollected)}</p>
              {isLive && (
                <p className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold mt-1">
                  <SignalIcon className="h-3.5 w-3.5" /> Live
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* View mode selector */}
      <div className="flex items-center gap-2 flex-wrap">
        {(['day', 'week', 'circle', 'all'] as const).map(mode => (
          <button
            key={mode}
            type="button"
            onClick={() => setViewMode(mode)}
            className={clsx(
              'text-xs font-semibold rounded-lg px-3 py-1.5 border transition-colors capitalize',
              viewMode === mode ? 'bg-teal-600 text-white border-teal-600' : 'border-(--border) text-(--text-secondary) hover:bg-(--primary-tint)/30',
            )}
          >
            {mode === 'all' ? 'All Circles' : mode}
          </button>
        ))}

        {(viewMode === 'day' || viewMode === 'week') && (
          <input
            type="date"
            value={anchorDate}
            onChange={e => setAnchorDate(e.target.value)}
            className="text-xs font-semibold rounded-lg px-3 py-1.5 border border-(--border) text-(--text-secondary) focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        )}

        {viewMode === 'circle' && (
          <select
            value={selectedCycleId ?? ''}
            onChange={e => setSelectedCycleId(e.target.value ? Number(e.target.value) : null)}
            className="text-xs font-semibold rounded-lg px-3 py-1.5 border border-(--border) text-(--text-secondary) focus:outline-none focus:ring-2 focus:ring-teal-500"
          >
            <option value="">Select a circle…</option>
            {sortedCycles.map(c => (
              <option key={c.id} value={c.id}>
                Circle #{c.cycle_number} ({fmt(c.start_date)} – {c.end_date ? fmt(c.end_date) : 'ongoing'}){c.status === 'active' ? ' · active' : ''}
              </option>
            ))}
          </select>
        )}

        <span className="text-xs text-(--text-muted)">Showing: {periodLabel}</span>
      </div>

      {/* Expected vs Actual */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-4">
          <p className="text-xs text-(--text-secondary) uppercase tracking-wider font-semibold">Total Expected</p>
          <p className="text-lg font-bold text-(--text-primary) mt-0.5">{formatCurrency(totals.expected)}</p>
          <p className="text-xs text-(--text-muted) mt-0.5">Confirmed + disputed</p>
        </div>
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-4">
          <p className="text-xs text-green-600 uppercase tracking-wider font-semibold">Actual Collected</p>
          <p className="text-lg font-bold text-(--text-primary) mt-0.5">{formatCurrency(totals.actual)}</p>
          <p className="text-xs text-(--text-muted) mt-0.5">{totals.confirmedCount} confirmed</p>
        </div>
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-4">
          <p className="text-xs text-red-600 uppercase tracking-wider font-semibold">Disputed</p>
          <p className="text-lg font-bold text-(--text-primary) mt-0.5">{formatCurrency(totals.disputedAmount)}</p>
          <p className="text-xs text-(--text-muted) mt-0.5">{totals.disputedCount} payment{totals.disputedCount === 1 ? '' : 's'} — must match expected once resolved</p>
        </div>
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-4">
          <p className="text-xs text-yellow-600 uppercase tracking-wider font-semibold">Pending</p>
          <p className="text-lg font-bold text-(--text-primary) mt-0.5">{totals.pendingCount}</p>
          <p className="text-xs text-(--text-muted) mt-0.5">Awaiting payer response</p>
        </div>
      </div>

      {/* Per-payer breakdown */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-(--text-primary)">Per-Payer Breakdown — {periodLabel}</h2>
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-(--border)">
              <thead className="bg-(--bg)">
                <tr>
                  {['Payer', 'Expected', 'Confirmed', 'Disputed'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {perPayer.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-sm text-(--text-muted)">No payers yet.</td></tr>
                ) : (
                  perPayer.map(p => (
                    <tr key={p.name} className="hover:bg-(--primary-tint)/30 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-(--text-primary)">{p.name}</td>
                      <td className="px-6 py-3 text-sm text-(--text-primary)">{formatCurrency(p.expected)}</td>
                      <td className="px-6 py-3 text-sm text-green-700">{formatCurrency(p.confirmed)}</td>
                      <td className="px-6 py-3 text-sm">{p.disputed > 0 ? <span className="text-red-700 font-semibold">{formatCurrency(p.disputed)}</span> : <span className="text-(--text-muted)">—</span>}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Payments table */}
      <div className="space-y-3">
        <h2 className="text-base font-bold text-(--text-primary)">Payment Records — {periodLabel}</h2>
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-(--border)">
              <thead className="bg-(--bg)">
                <tr>
                  {['Date', 'Member', 'Amount', 'Status'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {paymentsLoading ? (
                  <SkeletonTable rows={5} cols={4} />
                ) : filteredPayments.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                      No collections recorded for this period yet.
                    </td>
                  </tr>
                ) : (
                  filteredPayments.map(p => (
                    <tr
                      key={p.id}
                      onClick={() => p.status === 'disputed' && setViewDispute(p)}
                      className={clsx(
                        'transition-colors',
                        p.status === 'disputed' ? 'cursor-pointer hover:bg-red-50' : 'hover:bg-(--primary-tint)/30',
                      )}
                    >
                      <td className="px-6 py-4 text-sm text-(--text-secondary)">{fmt(p.period_date)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">{p.member_name}</td>
                      <td className="px-6 py-4 text-sm text-(--text-primary)">{formatCurrency(p.amount)}</td>
                      <td className="px-6 py-4"><PaymentStatusBadge status={p.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {viewDispute && <DisputeDetailModal payment={viewDispute} onClose={() => setViewDispute(null)} />}
    </div>
  );
}
