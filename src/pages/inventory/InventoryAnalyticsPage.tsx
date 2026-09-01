import { useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, LineChart, Line,
} from 'recharts';
import {
  CurrencyDollarIcon, ChartBarIcon, CubeIcon,
  ExclamationTriangleIcon, ShoppingCartIcon, ArrowDownTrayIcon,
  ArrowUpTrayIcon, BanknotesIcon,
} from '@heroicons/react/24/outline';
import { SkeletonCard } from '../../components/ui/Skeleton';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import api from '../../services/api';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';

/* ── Types ──────────────────────────────────────────────────────────────── */
interface ChartPoint {
  label: string;
  revenue: number;
  cogs: number;
  gross_profit: number;
  expense: number;
  net_profit: number;
  units_received: number;
  units_sold: number;
}

interface BestSeller {
  product_name: string;
  total_qty: number;
  total_revenue: number;
  cogs: number | null;
  profit_margin: number | null;
}

interface StockAlert {
  id: number;
  name: string;
  quantity?: number;
  threshold?: number;
}

interface ExpenseCat {
  category: string;
  label: string;
  amount: number;
}

interface AnalyticsData {
  summary: {
    stock_value: number;
    stock_value_at_cost: number;
    avg_profit_margin: number | null;
    total_products: number;
    total_units_in_stock: number;
    low_stock_count: number;
    out_of_stock_count: number;
    total_sales_count: number;
    total_units_sold: number;
    total_units_received: number;
  };
  chart: ChartPoint[];
  best_sellers: BestSeller[];
  low_stock_products: StockAlert[];
  out_of_stock_products: StockAlert[];
  top_expense_categories: ExpenseCat[];
}

type Period = 'daily' | 'weekly' | 'monthly';

const MONTH_START = format(startOfMonth(new Date()), 'yyyy-MM-dd');

const PERIODS: { value: Period; label: string; days: number; startDate?: string; rangeLabel: string }[] = [
  { value: 'daily',   label: 'This Month', days: 31,  startDate: MONTH_START, rangeLabel: 'This Month' },
  { value: 'weekly',  label: '12 Weeks',   days: 84,  rangeLabel: 'Last 12 Weeks' },
  { value: 'monthly', label: '12 Months',  days: 365, rangeLabel: 'Last 12 Months' },
];

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function fmt(value: number | string | null | undefined): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(value ?? 0));
}

function pct(n: number | null | undefined): string {
  return n != null ? `${n.toFixed(1)}%` : '—';
}

function KpiCard({
  icon: Icon,
  iconBg,
  iconColor,
  label,
  value,
  sub,
  highlight,
}: {
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  label: string;
  value: string;
  sub?: string;
  highlight?: 'warn' | 'danger' | 'ok';
}) {
  const ring =
    highlight === 'danger' ? 'border-red-400 bg-red-50 dark:bg-red-950/30' :
    highlight === 'warn'   ? 'border-amber-400 bg-amber-50 dark:bg-amber-950/30' :
    'border-(--border) bg-(--surface)';
  return (
    <div className={`rounded-xl border p-4 flex items-start gap-3 shadow-sm ${ring}`}>
      <div className={`shrink-0 h-10 w-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon className={`h-5 w-5 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-(--text-secondary) font-medium">{label}</p>
        <p className="text-lg font-bold text-(--text-primary) leading-tight">{value}</p>
        {sub && <p className="text-xs text-(--text-muted) mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Tooltip formatter ───────────────────────────────────────────────────── */
function nairaFmt(value: number) {
  return fmt(value);
}

export default function InventoryAnalyticsPage() {
  const [period, setPeriod] = useState<Period>('daily');
  const sel = PERIODS.find((p) => p.value === period) ?? PERIODS[0];
  const { selectedId } = useInventoryBusiness();

  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['inventory-analytics', period, sel.startDate ?? sel.days, selectedId],
    queryFn: async () => {
      const params: Record<string, unknown> = { period, days: sel.days, business_id: selectedId };
      if (sel.startDate) params.start_date = sel.startDate;
      const res = await api.get('/inventory/analytics/', { params });
      return res.data;
    },
    enabled: selectedId !== null,
    staleTime: 60_000,
  });

  /* ── Derived period totals ──────────────────────────────────────────────── */
  const chart = data?.chart ?? [];
  const totRevenue  = chart.reduce((s, p) => s + p.revenue, 0);
  const totCogs     = chart.reduce((s, p) => s + p.cogs, 0);
  const totExpense  = chart.reduce((s, p) => s + p.expense, 0);
  const grossProfit = totRevenue - totCogs;
  const netProfit   = totRevenue - totExpense;
  const hasCogs     = totCogs > 0;

  const s = data?.summary;

  return (
    <div className="space-y-8">
      <InventoryNav />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-(--text-primary)">Analytics</h1>
          <p className="text-sm text-(--text-secondary)">Complete financial and inventory overview</p>
        </div>
        <div className="flex rounded-lg border border-(--border) bg-(--surface) p-1 gap-1">
          {PERIODS.map((p) => (
            <button
              key={p.value}
              type="button"
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
        <div role="alert" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load analytics. Please refresh.
        </div>
      )}

      {/* ── Section 1: Inventory Health (all-time snapshot) ────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-(--text-secondary) uppercase tracking-wide mb-3">
          Inventory Health — Current Snapshot
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {isLoading ? (
            Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <KpiCard
                icon={CurrencyDollarIcon}
                iconBg="bg-blue-50 dark:bg-blue-950/40"
                iconColor="text-blue-600"
                label="Stock Value"
                value={fmt(s?.stock_value)}
                sub="At selling price"
              />
              <KpiCard
                icon={BanknotesIcon}
                iconBg="bg-indigo-50 dark:bg-indigo-950/40"
                iconColor="text-indigo-600"
                label="Stock Cost"
                value={fmt(s?.stock_value_at_cost)}
                sub="At purchase price"
              />
              <KpiCard
                icon={CubeIcon}
                iconBg="bg-slate-50 dark:bg-slate-800"
                iconColor="text-slate-600"
                label="Total Products"
                value={`${s?.total_products ?? 0}`}
                sub={`${s?.total_units_in_stock ?? 0} units in stock`}
              />
              <KpiCard
                icon={ChartBarIcon}
                iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                iconColor="text-emerald-600"
                label="Avg Margin"
                value={pct(s?.avg_profit_margin)}
                sub="Weighted by qty on hand"
              />
              <KpiCard
                icon={ExclamationTriangleIcon}
                iconBg="bg-amber-50 dark:bg-amber-950/40"
                iconColor="text-amber-600"
                label="Low Stock"
                value={`${s?.low_stock_count ?? 0} products`}
                sub="At or below threshold"
                highlight={(s?.low_stock_count ?? 0) > 0 ? 'warn' : undefined}
              />
              <KpiCard
                icon={ExclamationTriangleIcon}
                iconBg="bg-red-50 dark:bg-red-950/40"
                iconColor="text-red-600"
                label="Out of Stock"
                value={`${s?.out_of_stock_count ?? 0} products`}
                sub="Zero units remaining"
                highlight={(s?.out_of_stock_count ?? 0) > 0 ? 'danger' : undefined}
              />
            </>
          )}
        </div>
      </section>

      {/* ── Section 2: Period Performance ──────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-(--text-secondary) uppercase tracking-wide mb-3">
          Period Performance — {sel.rangeLabel}
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {isLoading ? (
            Array.from({ length: 6 }, (_, i) => <SkeletonCard key={i} />)
          ) : (
            <>
              <KpiCard
                icon={CurrencyDollarIcon}
                iconBg="bg-emerald-50 dark:bg-emerald-950/40"
                iconColor="text-emerald-600"
                label="Revenue"
                value={fmt(totRevenue)}
                sub="Total sales collected"
              />
              <KpiCard
                icon={ArrowDownTrayIcon}
                iconBg="bg-violet-50 dark:bg-violet-950/40"
                iconColor="text-violet-600"
                label="Cost of Goods"
                value={hasCogs ? fmt(totCogs) : '—'}
                sub={hasCogs ? 'Purchase cost of items sold' : 'Set cost prices to track'}
              />
              <KpiCard
                icon={ChartBarIcon}
                iconBg={grossProfit >= 0 ? 'bg-teal-50 dark:bg-teal-950/40' : 'bg-red-50 dark:bg-red-950/40'}
                iconColor={grossProfit >= 0 ? 'text-teal-600' : 'text-red-600'}
                label="Gross Profit"
                value={hasCogs ? fmt(grossProfit) : '—'}
                sub="Revenue − Cost of Goods"
                highlight={hasCogs && grossProfit < 0 ? 'danger' : undefined}
              />
              <KpiCard
                icon={BanknotesIcon}
                iconBg="bg-orange-50 dark:bg-orange-950/40"
                iconColor="text-orange-600"
                label="Expenses"
                value={fmt(totExpense)}
                sub="Rent, salary, etc."
              />
              <KpiCard
                icon={CurrencyDollarIcon}
                iconBg={netProfit >= 0 ? 'bg-blue-50 dark:bg-blue-950/40' : 'bg-red-50 dark:bg-red-950/40'}
                iconColor={netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}
                label="Net Profit"
                value={fmt(netProfit)}
                sub="Revenue − Expenses"
                highlight={netProfit < 0 ? 'danger' : undefined}
              />
              <KpiCard
                icon={ShoppingCartIcon}
                iconBg="bg-sky-50 dark:bg-sky-950/40"
                iconColor="text-sky-600"
                label="Transactions"
                value={`${s?.total_sales_count ?? 0}`}
                sub={`${s?.total_units_sold ?? 0} units sold`}
              />
            </>
          )}
        </div>
      </section>

      {/* ── Section 3: Revenue, COGS & Expenses Chart ──────────────────────── */}
      <section className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-(--text-primary)">Revenue, Cost of Goods & Expenses</h2>
          <p className="text-xs text-(--text-muted) mt-0.5">
            Green = Revenue collected &nbsp;·&nbsp; Purple = Cost of goods sold &nbsp;·&nbsp; Orange = Operational expenses
          </p>
        </div>
        {isLoading ? (
          <div className="h-64 rounded-lg bg-(--bg) skeleton" />
        ) : chart.length === 0 ? (
          <p className="text-center text-sm text-(--text-muted) py-16">No sales data for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chart} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => nairaFmt(value)} />
              <Legend />
              <Bar dataKey="revenue"  name="Revenue"           fill="#10B981" radius={[4, 4, 0, 0]} />
              {hasCogs && (
                <Bar dataKey="cogs"   name="Cost of Goods"     fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              )}
              <Bar dataKey="expense"  name="Expenses"          fill="#F97316" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Section 4: Net Profit Trend ────────────────────────────────────── */}
      {!isLoading && chart.length > 1 && (
        <section className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-(--text-primary)">Net Profit Trend</h2>
            <p className="text-xs text-(--text-muted) mt-0.5">Revenue minus operational expenses per period</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chart} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => nairaFmt(value)} />
              <Line
                type="monotone"
                dataKey="net_profit"
                name="Net Profit"
                stroke="#3B82F6"
                strokeWidth={2}
                dot={{ r: 3 }}
                activeDot={{ r: 5 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* ── Section 5: Stock Movement Chart ────────────────────────────────── */}
      <section className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6">
        <div className="mb-4">
          <h2 className="text-base font-semibold text-(--text-primary)">Stock Movement</h2>
          <p className="text-xs text-(--text-muted) mt-0.5">
            Blue = Units received into stock &nbsp;·&nbsp; Amber = Units dispatched / sold
            &nbsp;·&nbsp; {s ? `${s.total_units_received} received, ${s.total_units_sold} sold this period` : ''}
          </p>
        </div>
        {isLoading ? (
          <div className="h-64 rounded-lg bg-(--bg) skeleton" />
        ) : chart.length === 0 ? (
          <p className="text-center text-sm text-(--text-muted) py-16">No stock movements for this period.</p>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chart} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="units_received" name="Received" fill="#0035F0" radius={[4, 4, 0, 0]} />
              <Bar dataKey="units_sold"     name="Dispatched / Sold" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </section>

      {/* ── Section 6: Period Breakdown Table ──────────────────────────────── */}
      {!isLoading && chart.length > 0 && (
        <section className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-(--border)">
            <h2 className="text-base font-semibold text-(--text-primary)">Period Breakdown</h2>
            <p className="text-xs text-(--text-muted) mt-0.5">Net Profit = Revenue − Expenses &nbsp;|&nbsp; Gross Profit = Revenue − Cost of Goods</p>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-(--border)">
              <thead className="bg-(--bg)">
                <tr>
                  {(['Period', 'Revenue', hasCogs ? 'Cost of Goods' : null, hasCogs ? 'Gross Profit' : null, 'Expenses', 'Net Profit', 'Units Sold'] as (string | null)[]).filter(Boolean).map((h) => (
                    <th key={h!} className="px-4 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {[...chart].reverse().map((row, i) => {
                  const gp = row.revenue - row.cogs;
                  const np = row.revenue - row.expense;
                  return (
                    <tr key={i} className="hover:bg-(--primary-tint)/20 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-(--text-primary) whitespace-nowrap">{row.label}</td>
                      <td className="px-4 py-3 text-sm text-emerald-600 font-semibold whitespace-nowrap">{fmt(row.revenue)}</td>
                      {hasCogs && <td className="px-4 py-3 text-sm text-violet-600 font-semibold whitespace-nowrap">{row.cogs > 0 ? fmt(row.cogs) : '—'}</td>}
                      {hasCogs && <td className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${gp >= 0 ? 'text-teal-600' : 'text-red-600'}`}>{row.cogs > 0 ? fmt(gp) : '—'}</td>}
                      <td className="px-4 py-3 text-sm text-orange-500 font-semibold whitespace-nowrap">{fmt(row.expense)}</td>
                      <td className={`px-4 py-3 text-sm font-semibold whitespace-nowrap ${np >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(np)}</td>
                      <td className="px-4 py-3 text-sm text-(--text-secondary) whitespace-nowrap">{row.units_sold}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-(--bg) border-t-2 border-(--border)">
                <tr>
                  <td className="px-4 py-3 text-sm font-bold text-(--text-primary)">TOTAL</td>
                  <td className="px-4 py-3 text-sm font-bold text-emerald-600">{fmt(totRevenue)}</td>
                  {hasCogs && <td className="px-4 py-3 text-sm font-bold text-violet-600">{fmt(totCogs)}</td>}
                  {hasCogs && <td className={`px-4 py-3 text-sm font-bold ${grossProfit >= 0 ? 'text-teal-600' : 'text-red-600'}`}>{fmt(grossProfit)}</td>}
                  <td className="px-4 py-3 text-sm font-bold text-orange-500">{fmt(totExpense)}</td>
                  <td className={`px-4 py-3 text-sm font-bold ${netProfit >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{fmt(netProfit)}</td>
                  <td className="px-4 py-3 text-sm font-bold text-(--text-secondary)">{s?.total_units_sold ?? 0}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* ── Section 7: Top Expense Categories ──────────────────────────────── */}
      {!isLoading && (data?.top_expense_categories ?? []).length > 0 && (
        <section className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6">
          <h2 className="text-base font-semibold text-(--text-primary) mb-4">Expense Breakdown by Category</h2>
          <div className="space-y-3">
            {data!.top_expense_categories.map(({ label, amount }) => {
              const pctVal = totExpense > 0 ? Math.round((amount / totExpense) * 100) : 0;
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-(--text-primary)">{label}</span>
                    <span className="text-(--text-secondary)">{fmt(amount)} <span className="text-(--text-muted)">({pctVal}%)</span></span>
                  </div>
                  <div className="h-2 bg-(--border) rounded-full overflow-hidden">
                    <div className="h-2 bg-orange-500 rounded-full transition-all" style={{ width: `${pctVal}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* ── Section 8: Best Sellers ─────────────────────────────────────────── */}
      <section className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-(--border)">
          <h2 className="text-base font-semibold text-(--text-primary)">Best Sellers — {sel.rangeLabel}</h2>
          <p className="text-xs text-(--text-muted) mt-0.5">Ranked by units sold. Revenue and margin use actual sale prices.</p>
        </div>
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-10 rounded-lg bg-(--bg) skeleton" />)}
          </div>
        ) : (data?.best_sellers ?? []).length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-(--border)">
              <thead className="bg-(--bg)">
                <tr>
                  {['#', 'Product', 'Units Sold', 'Revenue', 'Cost of Goods', 'Gross Profit', 'Margin'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border)">
                {data!.best_sellers.map((item, i) => {
                  const gp = item.cogs != null ? item.total_revenue - item.cogs : null;
                  return (
                    <tr key={i} className="hover:bg-(--primary-tint)/20 transition-colors">
                      <td className="px-4 py-3 text-sm text-(--text-muted)">{i + 1}</td>
                      <td className="px-4 py-3 text-sm font-medium text-(--text-primary)">{item.product_name}</td>
                      <td className="px-4 py-3 text-sm text-(--text-secondary)">{item.total_qty}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-emerald-600">{fmt(item.total_revenue)}</td>
                      <td className="px-4 py-3 text-sm text-violet-600">{item.cogs != null ? fmt(item.cogs) : <span className="text-(--text-muted)">—</span>}</td>
                      <td className={`px-4 py-3 text-sm font-semibold ${gp == null ? '' : gp >= 0 ? 'text-teal-600' : 'text-red-600'}`}>
                        {gp != null ? fmt(gp) : <span className="text-(--text-muted)">—</span>}
                      </td>
                      <td className={`px-4 py-3 text-sm font-semibold ${item.profit_margin == null ? '' : item.profit_margin >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                        {pct(item.profit_margin)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="px-6 py-10 text-center text-sm text-(--text-muted)">No sales recorded for this period.</p>
        )}
      </section>

      {/* ── Section 9: Inventory Alerts ─────────────────────────────────────── */}
      {!isLoading && ((data?.low_stock_products ?? []).length > 0 || (data?.out_of_stock_products ?? []).length > 0) && (
        <section className="grid sm:grid-cols-2 gap-4">
          {(data?.out_of_stock_products ?? []).length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-red-700 dark:text-red-400 mb-3">
                Out of Stock ({data!.out_of_stock_products.length})
              </h3>
              <ul className="space-y-1.5">
                {data!.out_of_stock_products.map((p) => (
                  <li key={p.id} className="text-sm text-red-700 dark:text-red-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    {p.name}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {(data?.low_stock_products ?? []).length > 0 && (
            <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-5">
              <h3 className="text-sm font-bold text-amber-700 dark:text-amber-400 mb-3">
                Low Stock ({data!.low_stock_products.length})
              </h3>
              <ul className="space-y-1.5">
                {data!.low_stock_products.map((p) => (
                  <li key={p.id} className="text-sm text-amber-700 dark:text-amber-300 flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    {p.name}
                    <span className="text-amber-500 text-xs">({p.quantity} left, threshold: {p.threshold})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
