import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import clsx from 'clsx';
import { Table, type Column } from '../../components/ui/Table';
import api from '../../services/api';

interface Product {
  id: number;
  name: string;
  price: number;
  cost_price: number;
  quantity: number;
  reorder_level: number;
  description?: string;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: 'NGN',
    maximumFractionDigits: 0,
  }).format(value);
}

function StockBadge({ quantity, reorderLevel }: { quantity: number; reorderLevel: number }) {
  if (quantity === 0) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
        Out of stock
      </span>
    );
  }
  if (quantity <= reorderLevel) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
        Low stock
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      In stock
    </span>
  );
}

export default function InventoryProductsPage() {
  const { catId } = useParams<{ catId: string }>();

  const { data, isLoading, error } = useQuery<Product[]>({
    queryKey: ['inventory-products', catId],
    queryFn: async () => {
      const response = await api.get(`/inventory/categories/${catId}/products/`);
      return response.data;
    },
    enabled: !!catId,
  });

  const columns: Column<Record<string, unknown>>[] = [
    { key: 'name', header: 'Product Name' },
    {
      key: 'price',
      header: 'Selling Price',
      render: (value) => formatCurrency(Number(value)),
    },
    {
      key: 'cost_price',
      header: 'Cost Price',
      render: (value) => (
        <span className="text-gray-500">{formatCurrency(Number(value))}</span>
      ),
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (value) => (
        <span
          className={clsx(
            'font-medium',
            Number(value) === 0 ? 'text-red-600' : 'text-gray-900',
          )}
        >
          {String(value)}
        </span>
      ),
    },
    {
      key: 'quantity',
      header: 'Status',
      render: (value, row) => (
        <StockBadge
          quantity={Number(value)}
          reorderLevel={Number(row.reorder_level ?? 0)}
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Products</h1>
        <p className="text-sm text-gray-500">All products in this category</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
          Failed to load products. Please refresh.
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <Table
          columns={columns}
          data={(data ?? []) as unknown as Record<string, unknown>[]}
          loading={isLoading}
          emptyMessage="No products found in this category."
        />
      </div>
    </div>
  );
}
