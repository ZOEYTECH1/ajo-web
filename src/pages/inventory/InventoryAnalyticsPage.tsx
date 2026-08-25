import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import api from '../../services/api';

/* ── Types matching actual backend ────────────────────────────────────── */
interface ChartPoint {
  label: string;
  revenue: number;
  expense: number;
  units_received: number;
  units_sold: number;
}

interface BestSeller {
  product_name: string;
  total_qty: number;
  total_revenue: string;
}

interface AnalyticsData {
  summary: {
    stock_value: number;
    avg_profit_margin: number | null;
  };
  chart: ChartPoint[];
  best_sellers: BestSeller[];
}

type Period = 'daily' | 'weekly' | 'monthly';

const PERIODS: { value: Period; label: string; days: number }[] = [
  { value: 'daily',   label: '14 Days',   days: 14 },
  { value: 'weekly',  label: '12 Weeks',  days: 84 },
  { value: 'monthly', label: '12 Months', days: 365 },
];

function formatCurrency(value: number | string): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(value));
}

export default function InventoryAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('daily');
  const days = PERIODS.find((p) => p.value === period)?.days ?? 14;

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['inventory-analytics', period, days],
    queryFn: async () => {
      const response = await api.get('/inventory/analytics/', { params: { period, days } });
      return response.data;
    },
  });

  return (
    <div className="space-y-6">
      <InventoryNav />
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Analytics</h1>
          <p className="text-sm text-(--text-secondary)">Revenue, expenses, and stock movement</p>
        </div>

        {/* Period tabs */}
        <div className="flex rounded-lg border border-(--border) bg-(--surface) p-1 gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                period === p.value
                  ? 'bg-(--primary) text-white shadow-sm'
                  : 'text-(--text-secondary) hover:text-(--text-primary)'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load analytics. Please refresh.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <div className="bg-(--surface) rounded-xl border border-(--border) p-5 flex items-start gap-4 shadow-sm">
              <div className="shrink-0 h-11 w-11 rounded-xl flex items-center justify-center bg-blue-50 dark:bg-blue-950/40">
                <CurrencyDollarIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-(--text-secondary) font-medium">Stock Value</p>
                <p className="mt-1 text-xl font-bold text-(--text-primary)">
                  {formatCurrency(data?.summary.stock_value ?? 0)}
                </p>
                <p className="text-xs text-(--text-muted)">Current inventory value</p>
              </div>
            </div>
            <div className="bg-(--surface) rounded-xl border border-(--border) p-5 flex items-start gap-4 shadow-sm">
              <div className="shrink-0 h-11 w-11 rounded-xl flex items-center justify-center bg-green-50 dark:bg-green-950/40">
                <ChartBarIcon className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-(--text-secondary) font-medium">Avg. Profit Margin</p>
                <p className="mt-1 text-xl font-bold text-(--text-primary)">
                  {data?.summary.avg_profit_margin != null
                    ? `${data.summary.avg_profit_margin.toFixed(1)}%`
                    : '—'}
                </p>
                <p className="text-xs text-(--text-muted)">Across all products</p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Revenue vs Expenses chart */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6">
        <h2 className="text-base font-semibold text-(--text-primary) mb-4">Revenue vs Expenses</h2>
        {isLoading ? (
          <div className="h-64 rounded-lg bg-(--bg) skeleton" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.chart ?? []} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatCurrency(Number(value ?? 0))} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#22C55E" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expense" name="Expenses" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stock Movement chart */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6">
        <h2 className="text-base font-semibold text-(--text-primary) mb-4">Stock Movement</h2>
        {isLoading ? (
          <div className="h-64 rounded-lg bg-(--bg) skeleton" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data?.chart ?? []} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="units_received" name="Received" fill="#0035F0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="units_sold"     name="Sold"     fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Period totals */}
      {!isLoading && data && data.chart.length > 0 && (() => {
        const totRev  = data.chart.reduce((s, p) => s + p.revenue, 0);
        const totExp  = data.chart.reduce((s, p) => s + p.expense, 0);
        const totProfit = totRev - totExp;
        return (
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Total Revenue', value: totRev, color: 'text-green-600' },
              { label: 'Total Expenses', value: totExp, color: 'text-red-500' },
              { label: 'Net Profit', value: totProfit, color: totProfit >= 0 ? 'text-blue-600' : 'text-red-600' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-(--surface) rounded-xl border border-(--border) p-4 text-center shadow-sm">
                <p className="text-xs text-(--text-secondary) font-medium mb-1">{label}</p>
                <p className={`text-lg font-bold ${color}`}>{formatCurrency(value)}</p>
              </div>
            ))}
          </div>
        );
      })()}

      {/* Period breakdown table */}
      {!isLoading && data && data.chart.length > 0 && (
        <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-(--border)">
            <h2 className="text-base font-semibold text-(--text-primary)">Period Breakdown</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-(--border)">
              <thead className="bg-(--bg)">
                <tr>
                  {['Period', 'Revenue', 'Expenses', 'Profit'].map(h => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {[...data.chart].reverse().map((row, i) => {
                  const profit = row.revenue - row.expense;
                  return (
                    <tr key={i} className="hover:bg-(--primary-tint)/30 transition-colors">
                      <td className="px-6 py-3 text-sm font-medium text-(--text-primary)">{row.label}</td>
                      <td className="px-6 py-3 text-sm text-green-600 font-semibold">{formatCurrency(row.revenue)}</td>
                      <td className="px-6 py-3 text-sm text-red-500 font-semibold">{formatCurrency(row.expense)}</td>
                      <td className={`px-6 py-3 text-sm font-semibold ${profit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{formatCurrency(profit)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Best sellers */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border)">
          <h2 className="text-base font-semibold text-(--text-primary)">Best Sellers</h2>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 rounded-lg bg-(--bg) skeleton" />
            ))}
          </div>
        ) : data?.best_sellers.length ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-(--border)">
              <thead className="bg-(--bg)">
                <tr>
                  {['Product', 'Units Sold', 'Revenue'].map((h) => (
                    <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {data.best_sellers.map((item, i) => (
                  <tr key={i} className="hover:bg-(--primary-tint)/30 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">{item.product_name}</td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">{item.total_qty}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-(--text-primary)">{formatCurrency(item.total_revenue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-(--text-muted)">No sales data yet.</p>
        )}
      </div>
    </div>
  );
}
