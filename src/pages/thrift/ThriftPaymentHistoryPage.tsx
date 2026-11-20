import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import clsx from 'clsx';
import { Table, type Column } from '../../components/ui/Table';
import { Pagination } from '../../components/ui/Pagination';
import api from '../../services/api';

type TFn = (key: string, options?: any) => string;

interface ThriftPaymentHistoryItem {
  id: number;
  member_id: number;
  member_name: string;
  group_uuid: string;
  group_name: string;
  amount: string;
  period_date: string;
  notes: string;
  marked_at: string;
  status: 'pending' | 'confirmed' | 'disputed';
  payer_confirmed: boolean;
  dispute_reason: string;
  disputed_at: string | null;
  resolved_at: string | null;
}

interface ThriftPaginatedResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: ThriftPaymentHistoryItem[];
}

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(v));
}

function fmt(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      status === 'confirmed' ? 'bg-green-100 text-green-700'
      : status === 'disputed' ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700',
    )}>
      {t(`thriftPage.statusValues.${status}`, { defaultValue: status })}
    </span>
  );
}

function buildColumns(t: TFn, showMember: boolean): Column<Record<string, unknown>>[] {
  return [
    {
      key: 'group_name',
      header: t('thriftPage.paymentHistory.headers.group'),
      render: (v, row) => (
        <Link to={`/thrift/${row.group_uuid as string}`} className="text-(--primary) hover:underline font-medium">
          {v as string}
        </Link>
      ),
    },
    ...(showMember
      ? [{ key: 'member_name', header: t('thriftPage.paymentHistory.headers.member') } as Column<Record<string, unknown>>]
      : []),
    { key: 'period_date', header: t('thriftPage.paymentHistory.headers.periodDate'), render: (v) => fmt(v as string) },
    { key: 'amount', header: t('thriftPage.paymentHistory.headers.amount'), render: (v) => formatCurrency(v as string) },
    { key: 'marked_at', header: t('thriftPage.paymentHistory.headers.markedAt'), render: (v) => fmt(v as string) },
    { key: 'status', header: t('thriftPage.paymentHistory.headers.status'), render: (v) => <StatusBadge status={v as string} /> },
  ];
}

type ViewTab = 'payer' | 'collector';

export default function ThriftPaymentHistoryPage() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<ViewTab>('payer');
  const [payerPage, setPayerPage] = useState(1);
  const [collectorPage, setCollectorPage] = useState(1);

  const { data: payerData, isLoading: payerLoading } = useQuery<ThriftPaginatedResponse>({
    queryKey: ['thrift-ph-payer', payerPage],
    queryFn: () => api.get(`/thrift/my-payment-history/?type=payer&page=${payerPage}`).then(r => r.data),
  });

  const { data: collectorData, isLoading: collectorLoading } = useQuery<ThriftPaginatedResponse>({
    queryKey: ['thrift-ph-collector', collectorPage],
    queryFn: () => api.get(`/thrift/my-payment-history/?type=collector&page=${collectorPage}`).then(r => r.data),
  });

  const payerCount = payerData?.count ?? 0;
  const collectorCount = collectorData?.count ?? 0;

  const activePayments = activeTab === 'payer' ? (payerData?.results ?? []) : (collectorData?.results ?? []);
  const activeLoading = activeTab === 'payer' ? payerLoading : collectorLoading;
  const activePage = activeTab === 'payer' ? payerPage : collectorPage;
  const activeTotalCount = activeTab === 'payer' ? payerCount : collectorCount;
  const activeTotalPages = Math.max(1, Math.ceil(activeTotalCount / 20));
  const activeSetPage = activeTab === 'payer' ? setPayerPage : setCollectorPage;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <Link to="/thrift" className="text-sm text-(--text-secondary) hover:text-(--primary)">{t('thriftPage.paymentHistory.backToThriftGroups')}</Link>
          <h1 className="text-2xl font-bold text-(--text-primary) mt-1">{t('thriftPage.paymentHistory.title')}</h1>
          <p className="text-sm text-(--text-secondary)">{t('thriftPage.paymentHistory.subtitle')}</p>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setActiveTab('payer')}
          className={clsx(
            'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
            activeTab === 'payer' ? 'bg-(--accent) text-white' : 'bg-(--bg) text-(--text-secondary) hover:text-(--text-primary) border border-(--border)',
          )}
        >
          {t('thriftPage.paymentHistory.myPayments', { count: payerCount })}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('collector')}
          className={clsx(
            'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
            activeTab === 'collector' ? 'bg-(--accent) text-white' : 'bg-(--bg) text-(--text-secondary) hover:text-(--text-primary) border border-(--border)',
          )}
        >
          {t('thriftPage.paymentHistory.markedByMe', { count: collectorCount })}
        </button>
      </div>

      <Table
        columns={buildColumns(t as unknown as TFn, activeTab === 'collector')}
        data={activePayments as unknown as Record<string, unknown>[]}
        loading={activeLoading}
        emptyMessage={t('thriftPage.paymentHistory.noPaymentsFound')}
      />

      <Pagination
        page={activePage}
        totalPages={activeTotalPages}
        totalCount={activeTotalCount}
        pageSize={20}
        onChange={activeSetPage}
      />
    </div>
  );
}
