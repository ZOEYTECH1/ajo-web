import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Skeleton } from '../../components/ui/Skeleton';
import api from '../../services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

interface InvoiceLineItem {
  group_name: string;
  member_count: number;
  rate_percent: string;
  fee: string;
}

interface Invoice {
  id: number;
  month: string;
  month_label: string;
  status: 'pending' | 'paid' | 'overdue';
  total_fee: string;
  tx_ref: string;
  paid_at: string | null;
  line_items: InvoiceLineItem[];
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(v));
}

function StatusBadge({ status }: { status: Invoice['status'] }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize',
      status === 'paid' ? 'bg-green-100 text-green-700'
      : status === 'overdue' ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700',
    )}>
      {status}
    </span>
  );
}

// ── Invoice Card ──────────────────────────────────────────────────────────────

function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const qc = useQueryClient();
  const [verifyTxId, setVerifyTxId] = useState(invoice.tx_ref ?? '');
  const [showVerify, setShowVerify] = useState(false);
  const [payError, setPayError] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState(false);

  const payMutation = useMutation({
    mutationFn: () => api.post(`/thrift/billing/invoices/${invoice.id}/pay/`),
    onSuccess: (r) => {
      const link = r.data?.payment_link;
      if (link) {
        window.open(link, '_blank');
        setShowVerify(true);
      }
    },
    onError: (e: any) => {
      setPayError(e.response?.data?.detail ?? 'Something went wrong.');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: () =>
      api.post(`/thrift/billing/invoices/${invoice.id}/verify/`, { transaction_id: verifyTxId.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-billing-invoices'] });
      setVerifySuccess(true);
      setShowVerify(false);
    },
    onError: (e: any) => {
      setVerifyError(e.response?.data?.detail ?? 'Something went wrong.');
    },
  });

  const canPay = invoice.status === 'pending' || invoice.status === 'overdue';

  return (
    <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 p-5 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-(--text-primary)">{invoice.month_label}</p>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-2xl font-bold text-(--text-primary) mt-1">{formatCurrency(invoice.total_fee)}</p>
          {invoice.paid_at && (
            <p className="text-xs text-(--text-muted) mt-0.5">
              Paid {new Date(invoice.paid_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
            </p>
          )}
        </div>

        <div className="flex flex-col items-end gap-2">
          {canPay && !verifySuccess && (
            <button
              type="button"
              disabled={payMutation.isPending}
              onClick={() => { setPayError(''); payMutation.mutate(); }}
              className="inline-flex items-center rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {payMutation.isPending ? 'Loading…' : 'Pay Now'}
            </button>
          )}
          {verifySuccess && (
            <span className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-1.5">
              Verified!
            </span>
          )}
        </div>
      </div>

      {/* Pay error */}
      {payError && (
        <div className="px-5 pb-3">
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{payError}</p>
        </div>
      )}

      {/* Verify section */}
      {showVerify && !verifySuccess && (
        <div className="px-5 pb-4 space-y-2">
          <p className="text-xs text-(--text-secondary)">
            Complete payment in the new tab, then verify your transaction below.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={verifyTxId}
              onChange={(e) => { setVerifyTxId(e.target.value); setVerifyError(''); }}
              placeholder="Transaction ID"
              className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <button
              type="button"
              disabled={!verifyTxId.trim() || verifyMutation.isPending}
              onClick={() => verifyMutation.mutate()}
              className="rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
            >
              {verifyMutation.isPending ? 'Verifying…' : 'Verify'}
            </button>
          </div>
          {verifyError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{verifyError}</p>
          )}
        </div>
      )}

      {/* Line items */}
      {invoice.line_items.length > 0 && (
        <div className="border-t border-(--border)">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--bg)">
              <tr>
                {['Group', 'Members', 'Rate', 'Fee'].map(h => (
                  <th key={h} className="px-5 py-2.5 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {invoice.line_items.map((item, idx) => (
                <tr key={idx} className="hover:bg-(--primary-tint)/20 transition-colors">
                  <td className="px-5 py-3 text-sm text-(--text-primary) font-medium">{item.group_name}</td>
                  <td className="px-5 py-3 text-sm text-(--text-secondary)">{item.member_count}</td>
                  <td className="px-5 py-3 text-sm text-(--text-secondary)">{item.rate_percent}</td>
                  <td className="px-5 py-3 text-sm font-semibold text-(--text-primary)">{formatCurrency(item.fee)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function SkeletonInvoices() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map(i => (
        <div key={i} className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-5 space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-7 w-28" />
            </div>
            <Skeleton className="h-9 w-24" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      ))}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ThriftBillingPage() {
  const qc = useQueryClient();
  const [generateError, setGenerateError] = useState('');

  const { data: invoices, isLoading, error } = useQuery<Invoice[]>({
    queryKey: ['thrift-billing-invoices'],
    queryFn: () => api.get('/thrift/billing/invoices/').then(r => r.data),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.post('/thrift/billing/invoices/generate/'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-billing-invoices'] });
      setGenerateError('');
    },
    onError: (e: any) => {
      setGenerateError(e.response?.data?.detail ?? 'Something went wrong.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Billing & Invoices</h1>
          <p className="text-sm text-(--text-secondary)">Platform fees for your thrift groups</p>
        </div>
        <button
          type="button"
          disabled={generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
          className="inline-flex items-center rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors"
        >
          {generateMutation.isPending ? 'Generating…' : 'Generate This Month\'s Invoice'}
        </button>
      </div>

      {/* Generate error */}
      {generateError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          {generateError}
        </div>
      )}

      {/* Load error */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load invoices. Please refresh.
        </div>
      )}

      {/* Invoice list */}
      {isLoading ? (
        <SkeletonInvoices />
      ) : !invoices || invoices.length === 0 ? (
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm px-6 py-16 text-center">
          <p className="text-sm text-(--text-muted)">No invoices yet. Generate your first invoice.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map(invoice => (
            <InvoiceCard key={invoice.id} invoice={invoice} />
          ))}
        </div>
      )}
    </div>
  );
}
