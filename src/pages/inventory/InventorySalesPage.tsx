import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Table, type Column } from '../../components/ui/Table';
import api from '../../services/api';

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price: number;
}

interface Sale {
  id: number;
  date: string;
  items: SaleItem[];
  total: number;
  customer_name: string;
  customer_phone?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

const columns: Column<Record<string, unknown>>[] = [
  {
    key: 'date',
    header: 'Date',
    render: (value) => {
      try {
        return format(new Date(String(value)), 'dd MMM yyyy, h:mm a');
      } catch {
        return String(value);
      }
    },
  },
  {
    key: 'items',
    header: 'Items',
    render: (value) => {
      const items = value as SaleItem[];
      if (!Array.isArray(items) || items.length === 0) return '—';
      const summary = items
        .slice(0, 2)
        .map((i) => `${i.product_name} x${i.quantity}`)
        .join(', ');
      return items.length > 2 ? `${summary} +${items.length - 2} more` : summary;
    },
  },
  {
    key: 'total',
    header: 'Total',
    render: (value) => (
      <span className="font-semibold text-gray-900">{formatCurrency(Number(value))}</span>
    ),
  },
  {
    key: 'customer_name',
    header: 'Customer',
    render: (value) => String(value) || '—',
  },
  {
    key: 'customer_phone',
    header: 'Phone',
    render: (value) => String(value ?? '—'),
  },
];

export default function InventorySalesPage() {
  const { data, isLoading, error } = useQuery<Sale[]>({
    queryKey: ['inventory-sales'],
    queryFn: async () => {
      const response = await api.get('/inventory/sales/');
      return response.data;
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Sales</h1>
        <p className="text-sm text-gray-500">All recorded sales transactions</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load sales data. Please refresh.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <Table
          columns={columns}
          data={(data ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No sales recorded yet."
        />
      </div>
    </div>
  );
}
