import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Skeleton } from '../../components/ui/Skeleton';
import { Table, type Column } from '../../components/ui/Table';
import api from '../../services/api';
import { useFlutterwaveRedirect, currentPageRedirectUrl } from '../../hooks/useFlutterwaveRedirect';

type TFn = (key: string, options?: any) => string;

// Multiple invoices share this one page, so there's no single invoice id
// already in the URL to know which card a Flutterwave redirect is
// returning for -- stashed here right before opening the payment link,
// read back once the browser returns.
const PENDING_INVOICE_KEY = 'flw_pending_thrift_invoice_id';

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
  const { t } = useTranslation();
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize',
      status === 'paid' ? 'bg-green-100 text-green-700'
      : status === 'overdue' ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700',
    )}>
      {t(`thriftPage.statusValues.${status}`, { defaultValue: status })}
    </span>
  );
}

function getLineItemCols(t: TFn): Column<Record<string, unknown>>[] {
  return [
    { key: 'group_name', header: t('thriftPage.billing.headers.group') },
    { key: 'member_count', header: t('thriftPage.billing.headers.members') },
    { key: 'rate_percent', header: t('thriftPage.billing.headers.rate') },
    { key: 'fee', header: t('thriftPage.billing.headers.fee'), render: (v) => formatCurrency(v as string) },
  ];
}

// ── Invoice Card ──────────────────────────────────────────────────────────────

function InvoiceCard({
  invoice, incomingTransactionId,
}: {
  invoice: Invoice;
  incomingTransactionId?: string | null;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  // Was previously pre-filled with invoice.tx_ref -- that's our own
  // internal reference, not Flutterwave's real transaction id the verify
  // endpoint actually needs, so a user who didn't overwrite it before
  // clicking Verify would always get a confusing failure.
  const [verifyTxId, setVerifyTxId] = useState('');
  const [showVerify, setShowVerify] = useState(false);
  const [payError, setPayError] = useState('');
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState(false);
  const autoVerified = useRef(false);

  const payMutation = useMutation({
    mutationFn: () => api.post(`/thrift/billing/invoices/${invoice.id}/pay/`, {
      redirect_url: currentPageRedirectUrl(),
    }),
    onSuccess: (r) => {
      const link = r.data?.payment_link;
      if (link) {
        sessionStorage.setItem(PENDING_INVOICE_KEY, String(invoice.id));
        window.open(link, '_blank');
        setShowVerify(true);
      }
    },
    onError: (e: any) => {
      setPayError(e.response?.data?.detail ?? t('thriftPage.billing.somethingWrong'));
    },
  });

  const verifyMutation = useMutation({
    mutationFn: (txId: string) =>
      api.post(`/thrift/billing/invoices/${invoice.id}/verify/`, { transaction_id: txId.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-billing-invoices'] });
      setVerifySuccess(true);
      setShowVerify(false);
    },
    onError: (e: any) => {
      setVerifyError(e.response?.data?.detail ?? t('thriftPage.billing.somethingWrong'));
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
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-(--text-primary)">{invoice.month_label}</p>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-2xl font-bold text-(--text-primary) mt-1">{formatCurrency(invoice.total_fee)}</p>
          {invoice.paid_at && (
            <p className="text-xs text-(--text-muted) mt-0.5">
              {t('thriftPage.billing.paidOn', { date: new Date(invoice.paid_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) })}
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
              {payMutation.isPending ? t('thriftPage.billing.loading') : t('thriftPage.billing.payNow')}
            </button>
          )}
          {verifySuccess && (
            <span className="text-xs font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg px-3 py-1.5">
              {t('thriftPage.billing.verified')}
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
            {t('thriftPage.billing.completePaymentHint')}
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={verifyTxId}
              onChange={(e) => { setVerifyTxId(e.target.value); setVerifyError(''); }}
              placeholder={t('thriftPage.billing.transactionIdPlaceholder')}
              aria-label={t('thriftPage.billing.transactionIdAriaLabel')}
              className="flex-1 rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)"
            />
            <button
              type="button"
              disabled={!verifyTxId.trim() || verifyMutation.isPending}
              onClick={() => verifyMutation.mutate(verifyTxId)}
              className="rounded-lg bg-(--accent) text-white px-4 py-2 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm disabled:opacity-50 transition-all duration-150 active:scale-[0.97] disabled:active:scale-100"
            >
              {verifyMutation.isPending ? t('thriftPage.billing.verifying') : t('thriftPage.billing.verify')}
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
            columns={getLineItemCols(t as unknown as TFn)}
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

export default function ThriftBillingPage() {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [generateError, setGenerateError] = useState('');

  const [incoming, setIncoming] = useState<{ invoiceId: number; txId: string } | null>(null);
  useFlutterwaveRedirect((transactionId) => {
    const invoiceId = Number(sessionStorage.getItem(PENDING_INVOICE_KEY));
    sessionStorage.removeItem(PENDING_INVOICE_KEY);
    if (invoiceId) setIncoming({ invoiceId, txId: transactionId });
  });

  const { data: invoices, isLoading, error } = useQuery<Invoice[]>({
    queryKey: ['thrift-billing-invoices'],
    queryFn: () => api.get('/thrift/billing/invoices/').then(r => r.data),
  });

  const { data: billingStatus } = useQuery<{ can_generate_invoice: boolean }>({
    queryKey: ['thrift-billing-status'],
    queryFn: () => api.get('/thrift/billing/status/').then(r => r.data),
  });
  const canGenerate = billingStatus?.can_generate_invoice ?? false;

  const generateMutation = useMutation({
    mutationFn: () => api.post('/thrift/billing/invoices/generate/'),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-billing-invoices'] });
      qc.invalidateQueries({ queryKey: ['thrift-billing-status'] });
      setGenerateError('');
    },
    onError: (e: any) => {
      setGenerateError(e.response?.data?.detail ?? t('thriftPage.billing.somethingWrong'));
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">{t('thriftPage.billing.title')}</h1>
          <p className="text-sm text-(--text-secondary)">{t('thriftPage.billing.subtitle')}</p>
        </div>
        <button
          type="button"
          disabled={generateMutation.isPending || !canGenerate}
          onClick={() => generateMutation.mutate()}
          title={canGenerate ? undefined : t('thriftPage.billing.generateDisabledTitle')}
          className="inline-flex items-center rounded-lg bg-(--accent) text-white px-4 py-2 text-sm font-semibold hover:bg-(--accent-dark) hover:shadow-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.97] disabled:active:scale-100"
        >
          {generateMutation.isPending ? t('thriftPage.billing.generating') : t('thriftPage.billing.generateInvoice')}
        </button>
      </div>
      {!canGenerate && !generateMutation.isPending && (
        <p className="text-xs text-(--text-muted)">
          {t('thriftPage.billing.generateHint')}
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
          {t('thriftPage.billing.failedToLoad')}
        </div>
      )}

      {/* Invoice list */}
      {isLoading ? (
        <SkeletonInvoices />
      ) : !invoices || invoices.length === 0 ? (
        <div className="surface-soft px-6 py-16 text-center">
          <p className="text-sm text-(--text-muted)">{t('thriftPage.billing.noInvoicesYet')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {invoices.map(invoice => (
            <InvoiceCard
              key={invoice.id}
              invoice={invoice}
              incomingTransactionId={incoming?.invoiceId === invoice.id ? incoming.txId : null}
            />
          ))}
        </div>
      )}
    </div>
  );
}
