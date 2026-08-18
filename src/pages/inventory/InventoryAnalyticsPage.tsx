import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { CurrencyDollarIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { StatCard } from '../../components/ui/StatCard';
import { Table, type Column } from '../../components/ui/Table';
import api from '../../services/api';

interface AnalyticsData {
  stock_value: number;
  avg_profit_margin: number;
  revenue_by_period: { period: string; revenue: number; expenses: number }[];
  stock_movement: { period: string; received: number; dispatched: number }[];
  best_sellers: BestSeller[];
}

interface BestSeller {
  product: string;
  units_sold: number;
  revenue: number;
  margin: number;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

const bestSellerColumns: Column<Record<string, unknown>>[] = [
  { key: 'product', header: 'Product' },
  { key: 'units_sold', header: 'Units Sold' },
  {
    key: 'revenue',
    header: 'Revenue',
    render: (value) => formatCurrency(Number(value)),
  },
  {
    key: 'margin',
    header: 'Margin',
    render: (value) => {
      const pct = Number(value);
      return (
        <span
          className={
            pct >= 30
              ? 'text-green-600 font-medium'
              : pct >= 15
              ? 'text-yellow-600 font-medium'
              : 'text-red-600 font-medium'
          }
        >
          {pct.toFixed(1)}%
        </span>
      );
    },
  },
];

export default function InventoryAnalyticsPage() {
  const { data, isLoading, error } = useQuery<AnalyticsData>({
    queryKey: ['inventory-analytics'],
    queryFn: async () => {
      const response = await api.get('/inventory/analytics/');
      return response.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Inventory Analytics</h1>
        <p className="text-sm text-gray-500">Deep dive into your inventory performance</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load analytics data. Please refresh.
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <StatCard
          title="Total Stock Value"
          value={isLoading ? '...' : formatCurrency(data?.stock_value ?? 0)}
          subtitle="Current value of all inventory"
          icon={<CurrencyDollarIcon className="h-6 w-6 text-orange-600" />}
          color="bg-orange-50"
        />
        <StatCard
          title="Avg. Profit Margin"
          value={isLoading ? '...' : `${(data?.avg_profit_margin ?? 0).toFixed(1)}%`}
          subtitle="Across all products"
          icon={<ChartBarIcon className="h-6 w-6 text-green-600" />}
          color="bg-green-50"
        />
      </div>

      {/* Revenue vs Expenses chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue vs Expenses</h2>
        {isLoading ? (
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data?.revenue_by_period ?? []}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis
                tick={{ fontSize: 12 }}
                tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#E65100" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#93c5fd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Stock movement chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Stock Movement</h2>
        {isLoading ? (
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={data?.stock_movement ?? []}
              margin={{ top: 4, right: 16, left: 0, bottom: 4 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="received" name="Received" fill="#34d399" radius={[4, 4, 0, 0]} />
              <Bar dataKey="dispatched" name="Dispatched" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Best sellers */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Best Sellers</h2>
        <Table
          columns={bestSellerColumns}
          data={(data?.best_sellers ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No sales data available yet."
        />
      </div>
    </div>
  );
}
