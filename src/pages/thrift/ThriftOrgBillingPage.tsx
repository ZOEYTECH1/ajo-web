import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, type Column } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import { getOrgInvoices, getOrgBillingStatus, generateOrgInvoice, payOrgInvoice, verifyOrgInvoice, type ThriftInvoice, type PaginatedInvoices } from '../../services/billingService';
import { useFlutterwaveRedirect, currentPageRedirectUrl } from '../../hooks/useFlutterwaveRedirect';

// Multiple invoices share this one page, so there's no single invoice id
// already in the URL to know which card a Flutterwave redirect is
// returning for -- stashed here right before opening the payment link,
// read back once the browser returns.
const PENDING_INVOICE_KEY = 'flw_pending_thrift_org_invoice_id';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(v));
}

function StatusBadge({ status }: { status: ThriftInvoice['status'] }) {
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

const LINE_ITEM_COLS: Column<Record<string, unknown>>[] = [
  { key: 'group_name', header: 'Group' },
  { key: 'member_count', header: 'Members' },
  { key: 'rate_percent', header: 'Rate' },
  { key: 'fee', header: 'Fee', render: (v) => formatCurrency(v as string) },
];

// ── Invoice Card ──────────────────────────────────────────────────────────────

function InvoiceCard({
  invoice, orgUuid, incomingTransactionId,
}: {
  invoice: ThriftInvoice;
  orgUuid: string;
  incomingTransactionId?: string | null;
}) {
  const qc = useQueryClient();
  // Was previously pre-filled with invoice.tx_ref -- that's our own
  // internal reference, not Flutterwave's real transaction id the verify
  // endpoint actually needs.
  const [verifyTxId, setVerifyTxId] = useState('');
  const [showVerify, setShowVerify] = useState(false);
  const [payError, setPayError] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState(false);
  const autoVerified = useRef(false);

  const payMutation = useMutation({
    mutationFn: () => payOrgInvoice(orgUuid, invoice.id, currentPageRedirectUrl()),
    onSuccess: (r) => {
      const link = r.payment_link;
      if (link) {
        sessionStorage.setItem(PENDING_INVOICE_KEY, String(invoice.id));
        window.open(link, '_blank');
        setShowVerify(true);
      }
    },
    onError: (e: any) => {
      setPayError(e.response?.data?.detail ?? 'Something went wrong.');
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (txId: string) => verifyOrgInvoice(orgUuid, invoice.id, txId.trim()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-org-billing-invoices', orgUuid] });
      setVerifySuccess(true);
      setShowVerify(false);
    },
    onError: (e: any) => {
      setVerifyError(e.response?.data?.detail ?? 'Verification failed. Check the transaction ID and try again.');
    },
  });

  useEffect(() => {
    if (!incomingTransactionId || autoVerified.current) return;
    autoVerified.current = true;
    setShowVerify(true);
    verifyMutation.mutate(incomingTransactionId);
  }, [incomingTransactionId, verifyMutation]);

  const canPay = invoice.status === 'pending' || invoice.status === 'overdue';

  return (
    <div className="surface-soft overflow-hidden">
      {/* Card header */}
      <div className="flex items-start justify-between gap-4 p-5 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-base font-semibold text-(--text-primary)">{invoice.month_label}</p>
            <StatusBadge status={invoice.status} />
            {invoice.is_bank && (
              <span className="text-xs font-semibold text-(--primary-dark) bg-(--primary-tint) border border-(--primary)/30 rounded-full px-2.5 py-0.5">
                Bank rate
              </span>
            )}
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
              className="inline-flex items-center rounded-lg bg-(--accent) text-white px-4 py-2 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100"
            >
              {payMutation.isPending ? 'Loading…' : 'Pay Now'}
            </button>
          )}
          {verifySuccess && (
            <span className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-1.5">
              Verified!
            </span>
          )}
        </div>
      </div>

      {/* Pay error */}
      {payError && (
        <div className="px-5 pb-3">
          <p role="alert" className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{payError}</p>
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
              aria-label="Transaction ID for verification"
              className="flex-1 rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)"
            />
            <button
              type="button"
              disabled={!verifyTxId.trim() || verifyMutation.isPending}
              onClick={() => verifyMutation.mutate(verifyTxId)}
              className="rounded-lg bg-(--accent) text-white px-4 py-2 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100"
            >
              {verifyMutation.isPending ? 'Verifying…' : 'Verify'}
            </button>
          </div>
          {verifyError && (
            <p role="alert" className="text-xs text-red-600 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">{verifyError}</p>
          )}
        </div>
      )}

      {/* Line items */}
      {invoice.line_items.length > 0 && (
        <div className="border-t border-(--border) p-5 pt-4">
          <Table
            columns={LINE_ITEM_COLS}
            data={invoice.line_items as unknown as Record<string, unknown>[]}
          />
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
        <div key={i} className="surface-soft p-5 space-y-3">
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

export default function ThriftOrgBillingPage() {
  const { uuid: orgUuid = '' } = useParams<{ uuid: string }>();

  const qc = useQueryClient();
  const [generateError, setGenerateError] = useState('');
  const [page, setPage] = useState(1);

  const [incoming, setIncoming] = useState<{ invoiceId: number; txId: string } | null>(null);
  useFlutterwaveRedirect((transactionId) => {
    const invoiceId = Number(sessionStorage.getItem(PENDING_INVOICE_KEY));
    sessionStorage.removeItem(PENDING_INVOICE_KEY);
    if (invoiceId) setIncoming({ invoiceId, txId: transactionId });
  });

  const { data: invoicesData, isLoading, error } = useQuery<PaginatedInvoices>({
    queryKey: ['thrift-org-billing-invoices', orgUuid, page],
    queryFn: () => getOrgInvoices(orgUuid, page),
    enabled: !!orgUuid,
  });
  const invoices = invoicesData?.results ?? [];
  const totalCount = invoicesData?.count ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / 20));

  const { data: billingStatus } = useQuery<{ can_generate_invoice: boolean }>({
    queryKey: ['thrift-org-billing-status', orgUuid],
    queryFn: () => getOrgBillingStatus(orgUuid),
    enabled: !!orgUuid,
  });
  const canGenerate = billingStatus?.can_generate_invoice ?? false;

  const generateMutation = useMutation({
    mutationFn: () => generateOrgInvoice(orgUuid),
    onSuccess: () => {
      setPage(1);
      qc.invalidateQueries({ queryKey: ['thrift-org-billing-invoices', orgUuid] });
      qc.invalidateQueries({ queryKey: ['thrift-org-billing-status', orgUuid] });
      setGenerateError('');
    },
    onError: (e: any) => {
      setGenerateError(e.response?.data?.detail ?? 'Something went wrong.');
    },
  });

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to={`/org/${orgUuid}`} className="text-sm text-(--text-secondary) hover:text-(--primary)">
        ← Organisation
      </Link>

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Organisation Billing</h1>
          <p className="text-sm text-(--text-secondary)">Consolidated invoices at bank rate (standard −0.25%)</p>
        </div>
        <button
          type="button"
          disabled={generateMutation.isPending || !canGenerate}
          onClick={() => generateMutation.mutate()}
          title={canGenerate ? undefined : 'No completed circles are ready to bill yet.'}
          className="inline-flex items-center rounded-lg bg-(--accent) text-white px-4 py-2 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.97] disabled:active:scale-100"
        >
          {generateMutation.isPending ? 'Generating…' : 'Generate Invoice'}
        </button>
      </div>

      {/* Info banner */}
      <div className="rounded-lg bg-(--primary-tint) border border-(--primary)/30 px-4 py-3 text-sm text-(--primary-dark)">
        Organisation members receive a 0.25% discount on the standard rate. All groups across your collectors are consolidated whenever a circle completes.
      </div>
      {!canGenerate && !generateMutation.isPending && (
        <p className="text-xs text-(--text-muted)">
          Generate becomes available once one of your collectors' circles completes — it also happens automatically at that point.
        </p>
      )}

      {/* Generate error */}
      {generateError && (
        <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {generateError}
        </div>
      )}

      {/* Load error */}
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load invoices. Please refresh.
        </div>
      )}

      {/* Invoice list */}
      {isLoading ? (
        <SkeletonInvoices />
      ) : invoices.length === 0 ? (
        <div className="surface-soft px-6 py-16 text-center">
          <p className="text-sm text-(--text-muted)">No invoices yet. Generate your first invoice.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map(invoice => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              orgUuid={orgUuid}
              incomingTransactionId={incoming?.invoiceId === invoice.id ? incoming.txId : null}
            />
          ))}
        </div>
      )}

      <Pagination page={page} totalPages={totalPages} totalCount={totalCount} pageSize={20} onChange={setPage} />
    </div>
  );
}
