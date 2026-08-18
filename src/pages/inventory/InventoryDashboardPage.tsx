import { useState } from 'react';
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
import {
  CurrencyDollarIcon,
  ArrowTrendingUpIcon,
  CubeIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { StatCard } from '../../components/ui/StatCard';
import { Table, type Column } from '../../components/ui/Table';
import api from '../../services/api';

interface DashboardData {
  total_revenue: number;
  total_expenses: number;
  profit: number;
  total_products: number;
  low_stock_count: number;
  out_of_stock_count: number;
  revenue_by_period: { period: string; revenue: number; expenses: number }[];
  low_stock_products: LowStockProduct[];
  businesses: Business[];
}

interface LowStockProduct {
  id: number;
  name: string;
  quantity: number;
  reorder_level: number;
  category: string;
}

interface Business {
  id: number;
  name: string;
}

const lowStockColumns: Column<Record<string, unknown>>[] = [
  { key: 'name', header: 'Product' },
  { key: 'category', header: 'Category' },
  { key: 'quantity', header: 'In Stock' },
  {
    key: 'reorder_level',
    header: 'Reorder Level',
    render: (value) => (
      <span className="text-orange-600 font-medium">{String(value)}</span>
    ),
  },
  {
    key: 'quantity',
    header: 'Status',
    render: (value) => {
      const qty = Number(value);
      if (qty === 0) {
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
            Out of stock
          </span>
        );
      }
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
          Low stock
        </span>
      );
    },
  },
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

export default function InventoryDashboardPage() {
  const [selectedBusinessId, setSelectedBusinessId] = useState<string>('');

  const { data, isLoading, error } = useQuery<DashboardData>({
    queryKey: ['inventory-dashboard', selectedBusinessId],
    queryFn: async () => {
      const params = selectedBusinessId ? { business_id: selectedBusinessId } : {};
      const response = await api.get('/inventory/dashboard/', { params });
      return response.data;
    },
  });

  const chartData = data?.revenue_by_period ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory Dashboard</h1>
          <p className="text-sm text-gray-500">Track your business performance</p>
        </div>

        {/* Business selector */}
        {data?.businesses && data.businesses.length > 0 && (
          <select
            value={selectedBusinessId}
            onChange={(e) => setSelectedBusinessId(e.target.value)}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          >
            <option value="">All Businesses</option>
            {data.businesses.map((b) => (
              <option key={b.id} value={String(b.id)}>
                {b.name}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load dashboard data. Please refresh.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          title="Total Revenue"
          value={isLoading ? '...' : formatCurrency(data?.total_revenue ?? 0)}
          icon={<CurrencyDollarIcon className="h-6 w-6 text-orange-600" />}
          color="bg-orange-50"
        />
        <StatCard
          title="Total Expenses"
          value={isLoading ? '...' : formatCurrency(data?.total_expenses ?? 0)}
          icon={<CurrencyDollarIcon className="h-6 w-6 text-blue-600" />}
          color="bg-blue-50"
        />
        <StatCard
          title="Profit"
          value={isLoading ? '...' : formatCurrency(data?.profit ?? 0)}
          subtitle="Revenue minus expenses"
          icon={<ArrowTrendingUpIcon className="h-6 w-6 text-green-600" />}
          color="bg-green-50"
        />
        <StatCard
          title="Total Products"
          value={isLoading ? '...' : String(data?.total_products ?? 0)}
          icon={<CubeIcon className="h-6 w-6 text-purple-600" />}
          color="bg-purple-50"
        />
        <StatCard
          title="Low Stock"
          value={isLoading ? '...' : String(data?.low_stock_count ?? 0)}
          subtitle="Products below reorder level"
          icon={<ExclamationTriangleIcon className="h-6 w-6 text-yellow-600" />}
          color="bg-yellow-50"
        />
        <StatCard
          title="Out of Stock"
          value={isLoading ? '...' : String(data?.out_of_stock_count ?? 0)}
          subtitle="Products with zero quantity"
          icon={<ExclamationTriangleIcon className="h-6 w-6 text-red-600" />}
          color="bg-red-50"
        />
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Revenue vs Expenses</h2>
        {isLoading ? (
          <div className="h-64 bg-gray-100 rounded animate-pulse" />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v: number) => `₦${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" name="Revenue" fill="#E65100" radius={[4, 4, 0, 0]} />
              <Bar dataKey="expenses" name="Expenses" fill="#93c5fd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Low Stock Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Low Stock Alert</h2>
        <Table
          columns={lowStockColumns}
          data={(data?.low_stock_products ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No low-stock products. Great job!"
        />
      </div>
    </div>
  );
}
