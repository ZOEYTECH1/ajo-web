import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { format, addDays, subDays, isToday } from 'date-fns';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CubeIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ShoppingCartIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  ArrowsRightLeftIcon,
} from '@heroicons/react/24/outline';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import api from '../../services/api';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';

/* ── Types matching actual backend response ────────────────────────────── */
interface LowStockItem {
  id: number;
  name: string;
  quantity: number;
  low_stock_threshold: number;
}

interface ExpiringSoonItem {
  id: number;
  name: string;
  expiry_date: string;
  days_left: number;
  urgent: boolean;
}

interface DashboardData {
  date: string;
  revenue: string;
  expenses: string;
  profit: string;
  opening_stock: number;
  closing_stock: number;
  low_stock_items: LowStockItem[];
  expiring_soon_items: ExpiringSoonItem[];
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function ProfitValue({ value }: { value: string }) {
  const n = Number(value);
  const color = n >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400';
  return <span className={color}>{formatCurrency(value)}</span>;
}

/* ── Stat card with skeleton ─────────────────────────────────────────────── */
function StatCard({
  title,
  value,
  subtitle,
  icon,
  iconBg,
  loading,
}: {
  title: string;
  value?: React.ReactNode;
  subtitle?: string;
  icon: React.ReactNode;
  iconBg: string;
  loading?: boolean;
}) {
  if (loading) return <SkeletonCard />;
  return (
    <div className="bg-(--surface) rounded-xl border border-(--border) p-5 flex items-start gap-4 shadow-sm">
      <div className={`shrink-0 h-11 w-11 rounded-xl flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-(--text-secondary) font-medium">{title}</p>
        <p className="mt-1 text-xl font-bold text-(--text-primary) truncate">{value}</p>
        {subtitle && <p className="mt-0.5 text-xs text-(--text-muted)">{subtitle}</p>}
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function InventoryDashboardPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const dateStr = format(selectedDate, 'yyyy-MM-dd');
  const { selectedId } = useInventoryBusiness();

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['inventory-dashboard', dateStr, selectedId],
    queryFn: async () => {
      const response = await api.get('/inventory/dashboard/', { params: { date: dateStr, business_id: selectedId } });
      return response.data;
    },
    enabled: selectedId !== null,
  });

  const goToPrev = () => setSelectedDate((d) => subDays(d, 1));
  const goToNext = () => setSelectedDate((d) => addDays(d, 1));
  const goToToday = () => setSelectedDate(new Date());

  return (
    <div className="space-y-6">
      <InventoryNav />
      {/* Header + date navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Inventory Dashboard</h1>
          <p className="text-sm text-(--text-secondary)">Daily P&L summary</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToPrev}
            aria-label="Previous day"
            className="p-2 rounded-lg border border-(--border) bg-(--surface) text-(--text-secondary) hover:text-(--primary) hover:border-(--primary) transition-colors"
          >
            <ChevronLeftIcon className="h-4 w-4" aria-hidden="true" />
          </button>

          <div className="text-center min-w-32.5">
            <p className="text-sm font-semibold text-(--text-primary)">
              {format(selectedDate, 'dd MMM yyyy')}
            </p>
            {isToday(selectedDate) && (
              <p className="text-xs text-(--primary) font-medium">Today</p>
            )}
          </div>

          <button
            onClick={goToNext}
            disabled={isToday(selectedDate)}
            aria-label="Next day"
            className="p-2 rounded-lg border border-(--border) bg-(--surface) text-(--text-secondary) hover:text-(--primary) hover:border-(--primary) transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <ChevronRightIcon className="h-4 w-4" aria-hidden="true" />
          </button>

          {!isToday(selectedDate) && (
            <button
              onClick={goToToday}
              className="px-3 py-2 rounded-lg border border-(--primary) text-(--primary) text-xs font-medium hover:bg-(--primary-tint) transition-colors"
            >
              Today
            </button>
          )}
        </div>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load dashboard data. Please refresh.
        </div>
      )}

      {/* P&L Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Revenue"
          value={data ? formatCurrency(data.revenue) : '—'}
          subtitle="Sales for the day"
          icon={<CurrencyDollarIcon className="h-5 w-5 text-green-600" />}
          iconBg="bg-green-50 dark:bg-green-950/40"
          loading={isLoading}
        />
        <StatCard
          title="Expenses"
          value={data ? formatCurrency(data.expenses) : '—'}
          subtitle="Costs for the day"
          icon={<CurrencyDollarIcon className="h-5 w-5 text-red-500" />}
          iconBg="bg-red-50 dark:bg-red-950/40"
          loading={isLoading}
        />
        <StatCard
          title="Profit"
          value={data ? <ProfitValue value={data.profit} /> : '—'}
          subtitle="Revenue minus expenses"
          icon={<ArrowTrendingUpIcon className="h-5 w-5 text-blue-600" />}
          iconBg="bg-blue-50 dark:bg-blue-950/40"
          loading={isLoading}
        />
        <StatCard
          title="Opening Stock"
          value={data ? String(data.opening_stock) : '—'}
          subtitle="Units at start of day"
          icon={<CubeIcon className="h-5 w-5 text-purple-600" />}
          iconBg="bg-purple-50 dark:bg-purple-950/40"
          loading={isLoading}
        />
        <StatCard
          title="Closing Stock"
          value={data ? String(data.closing_stock) : '—'}
          subtitle="Units at end of day"
          icon={<CubeIcon className="h-5 w-5 text-(--primary)" />}
          iconBg="bg-(--primary-tint)"
          loading={isLoading}
        />
        <StatCard
          title="Low Stock Alerts"
          value={data ? String(data.low_stock_items.length) : '—'}
          subtitle="Products below threshold"
          icon={<ExclamationTriangleIcon className="h-5 w-5 text-yellow-600" />}
          iconBg="bg-yellow-50 dark:bg-yellow-950/40"
          loading={isLoading}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { to: '/inventory/sales',            icon: <ShoppingCartIcon className="h-6 w-6 text-orange-600" />,  label: 'New Sale',      bg: 'bg-orange-50 dark:bg-orange-950/40' },
          { to: '/inventory/expenses',          icon: <BanknotesIcon    className="h-6 w-6 text-red-500" />,    label: 'Add Expense',   bg: 'bg-red-50 dark:bg-red-950/40' },
          { to: '/inventory/warehouse/receive', icon: <ArrowDownTrayIcon className="h-6 w-6 text-blue-600" />,  label: 'Receive Stock', bg: 'bg-blue-50 dark:bg-blue-950/40' },
          { to: '/inventory/transfers',         icon: <ArrowsRightLeftIcon className="h-6 w-6 text-purple-600" />, label: 'Transfer Stock', bg: 'bg-purple-50 dark:bg-purple-950/40' },
        ].map(({ to, icon, label, bg }) => (
          <Link
            key={to}
            to={to}
            className="flex flex-col items-center gap-2 rounded-xl border border-(--border) bg-(--surface) p-4 text-center hover:border-orange-400 hover:bg-orange-50/50 dark:hover:bg-orange-950/20 transition-all shadow-sm"
          >
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${bg}`}>{icon}</div>
            <span className="text-xs font-semibold text-(--text-primary)">{label}</span>
          </Link>
        ))}
      </div>

      {/* Low Stock table */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border)">
          <h2 className="text-base font-semibold text-(--text-primary) flex items-center gap-2">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-500" />
            Low Stock
          </h2>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-(--bg) skeleton" />
            ))}
          </div>
        ) : data?.low_stock_items.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-(--border)">
              <thead className="bg-(--bg)">
                <tr>
                  {['Product', 'In Stock', 'Threshold', 'Status'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {data.low_stock_items.map((item) => (
                  <tr key={item.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{item.quantity}</td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{item.low_stock_threshold}</td>
                    <td className="px-6 py-4">
                      {item.quantity === 0 ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                          Out of stock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700 dark:bg-yellow-950/60 dark:text-yellow-400">
                          Low stock
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-(--text-muted)">No low-stock items. Great job!</p>
        )}
      </div>

      {/* Expiring Soon table */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border)">
          <h2 className="text-base font-semibold text-(--text-primary) flex items-center gap-2">
            <ClockIcon className="h-5 w-5 text-orange-500" />
            Expiring Soon
          </h2>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-(--bg) skeleton" />
            ))}
          </div>
        ) : data?.expiring_soon_items.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-(--border)">
              <thead className="bg-(--bg)">
                <tr>
                  {['Product', 'Expiry Date', 'Days Left', 'Urgency'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {data.expiring_soon_items.map((item) => (
                  <tr key={item.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">{item.name}</td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">
                      {format(new Date(item.expiry_date), 'dd MMM yyyy')}
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{item.days_left}d</td>
                    <td className="px-6 py-4">
                      {item.urgent ? (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400">
                          Urgent
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-950/60 dark:text-orange-400">
                          Soon
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-(--text-muted)">No items expiring within 30 days.</p>
        )}
      </div>
    </div>
  );
}
