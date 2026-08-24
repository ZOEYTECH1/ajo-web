import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import api from '../../services/api';

interface BestSeller {
  product_name: string;
  total_qty: number;
  total_revenue: string;
}

const PERIODS = [
  { days: 7,  label: 'Last 7 Days' },
  { days: 30, label: 'Last 30 Days' },
  { days: 90, label: 'Last 90 Days' },
];

const MEDALS = ['🥇', '🥈', '🥉'];

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(v));
}

export default function InventoryBestSellersPage() {
  const [days, setDays] = useState(30);

  const { data, isLoading, error } = useQuery<BestSeller[]>({
    queryKey: ['inventory-best-sellers', days],
    queryFn: () => api.get(`/inventory/best-sellers/?days=${days}&limit=20`).then(r => r.data),
  });

  const maxQty = data && data.length > 0 ? Math.max(...data.map(b => b.total_qty)) : 1;
  const totalRevenue = data?.reduce((s, b) => s + Number(b.total_revenue), 0) ?? 0;

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">Best Sellers</h1>
        <p className="text-sm text-(--text-secondary)">Top-selling products by quantity</p>
      </div>

      {/* Period tabs */}
      <div className="flex gap-2 flex-wrap">
        {PERIODS.map(({ days: d, label }) => (
          <button
            key={d}
            type="button"
            onClick={() => setDays(d)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium transition-colors',
              days === d
                ? 'bg-orange-600 text-white'
                : 'bg-(--surface) border border-(--border) text-(--text-secondary) hover:text-(--text-primary)',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load best sellers. Please refresh.
        </div>
      )}

      {/* Summary banner */}
      {data && data.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-orange-50 border border-orange-200 rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Products Ranked</p>
            <p className="text-2xl font-bold text-orange-700 mt-1">{data.length}</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4">
            <p className="text-xs font-semibold text-green-600 uppercase tracking-wide">Total Revenue</p>
            <p className="text-2xl font-bold text-green-700 mt-1">{formatCurrency(totalRevenue)}</p>
          </div>
        </div>
      )}

      {/* Rankings */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-6 space-y-4 animate-pulse">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="space-y-2">
                <div className="h-4 bg-(--border) rounded w-1/2" />
                <div className="h-3 bg-(--border) rounded" />
              </div>
            ))}
          </div>
        ) : data && data.length > 0 ? (
          <div className="divide-y divide-(--border)">
            {data.map((item, idx) => {
              const barPct = Math.round((item.total_qty / maxQty) * 100);
              return (
                <div key={item.product_name} className="px-6 py-5">
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xl shrink-0">{MEDALS[idx] ?? `#${idx + 1}`}</span>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-(--text-primary) truncate">{item.product_name}</p>
                        <p className="text-xs text-(--text-secondary) mt-0.5">{formatCurrency(item.total_revenue)} revenue</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-lg font-bold text-(--text-primary)">{item.total_qty.toLocaleString()}</p>
                      <p className="text-xs text-(--text-secondary)">units sold</p>
                    </div>
                  </div>
                  {/* Bar chart */}
                  <div className="h-2.5 bg-(--bg) rounded-full overflow-hidden border border-(--border)">
                    <div
                      className={clsx(
                        'h-2.5 rounded-full transition-all duration-500',
                        idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-slate-400' : idx === 2 ? 'bg-amber-600' : 'bg-orange-500',
                      )}
                      style={{ width: `${barPct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="px-6 py-16 text-center">
            <p className="text-4xl mb-3">📦</p>
            <p className="text-sm font-semibold text-(--text-primary) mb-1">No sales data yet</p>
            <p className="text-sm text-(--text-muted)">Start recording sales to see your best sellers appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
}
