import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';

interface SaleItem {
  product_name: string;
  quantity: number;
  unit_price: string;
}

interface Sale {
  id: number;
  sold_at: string;
  items: SaleItem[];
  total: string;
  customer_name: string | null;
  notes: string;
}

function formatCurrency(value: string | number): string {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(value));
}

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
        <h1 className="text-2xl font-bold text-(--text-primary)">Sales</h1>
        <p className="text-sm text-(--text-secondary)">All recorded sales transactions</p>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          Failed to load sales. Please refresh.
        </div>
      )}

      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-(--border)">
            <thead className="bg-(--bg)">
              <tr>
                {['Date', 'Items', 'Customer', 'Total'].map((h) => (
                  <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-(--border)">
              {isLoading ? (
                <SkeletonTable rows={6} cols={4} />
              ) : data && data.length > 0 ? (
                data.map((sale) => (
                  <tr key={sale.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                    <td className="px-6 py-4 text-sm text-(--text-secondary) whitespace-nowrap">
                      {format(new Date(sale.sold_at), 'dd MMM yyyy, h:mm a')}
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-primary)">
                      {sale.items.length === 0
                        ? '—'
                        : (() => {
                            const summary = sale.items
                              .slice(0, 2)
                              .map((i) => `${i.product_name} ×${i.quantity}`)
                              .join(', ');
                            return sale.items.length > 2
                              ? `${summary} +${sale.items.length - 2} more`
                              : summary;
                          })()}
                    </td>
                    <td className="px-6 py-4 text-sm text-(--text-secondary)">
                      {sale.customer_name || '—'}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-(--text-primary) whitespace-nowrap">
                      {formatCurrency(sale.total)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                    No sales recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
