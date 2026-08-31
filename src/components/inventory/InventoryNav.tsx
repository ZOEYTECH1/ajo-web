import { useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { BuildingStorefrontIcon, CubeIcon, BuildingOfficeIcon, ChevronDownIcon } from '@heroicons/react/24/outline';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';

const links = [
  { to: '/inventory',                      label: 'Dashboard',    end: true },
  { to: '/inventory/categories',           label: 'Categories',   end: false },
  { to: '/inventory/sales',                label: 'Sales',        end: false },
  { to: '/inventory/expenses',             label: 'Expenses',     end: false },
  { to: '/inventory/customers',            label: 'Customers',    end: false },
  { to: '/inventory/analytics',            label: 'Analytics',    end: false },
  { to: '/inventory/transfers',            label: 'Transfers',    end: false },
  { to: '/inventory/warehouse/receive',    label: 'Receive',      end: false },
  { to: '/inventory/warehouse/dispatch',   label: 'Dispatch',     end: false },
  { to: '/inventory/product-requests',     label: 'Requests',     end: false },
  { to: '/inventory/business',             label: 'Business',     end: false },
  { to: '/inventory/subscription',         label: 'Subscription', end: false },
  { to: '/inventory/best-sellers',         label: 'Best Sellers', end: false },
];

const MODE_ICON: Record<string, React.ElementType> = {
  retail:    BuildingStorefrontIcon,
  warehouse: CubeIcon,
  branch:    BuildingOfficeIcon,
};

export function InventoryNav() {
  const qc = useQueryClient();
  const { businesses, selectedBiz, setSelectedId } = useInventoryBusiness();
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);

  function select(id: number) {
    setSelectedId(id);
    setOpen(false);
    qc.invalidateQueries({ queryKey: ['inventory-dashboard'] });
    qc.invalidateQueries({ queryKey: ['inventory-categories'] });
    qc.invalidateQueries({ queryKey: ['inventory-sales'] });
    qc.invalidateQueries({ queryKey: ['inventory-expenses'] });
    qc.invalidateQueries({ queryKey: ['inventory-customers'] });
    qc.invalidateQueries({ queryKey: ['inventory-analytics'] });
    qc.invalidateQueries({ queryKey: ['inventory-transfers'] });
    qc.invalidateQueries({ queryKey: ['inventory-best-sellers'] });
  }

  const Icon = MODE_ICON[selectedBiz?.mode ?? 'retail'] ?? BuildingStorefrontIcon;

  return (
    <div className="space-y-2">
      {/* Business switcher — only shown when multiple locations exist */}
      {businesses.length > 1 && (
        <div className="relative" ref={dropRef}>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 rounded-lg border border-(--border) bg-(--surface) px-3 py-2 text-sm font-semibold text-(--text-primary) hover:border-orange-400 transition-colors"
          >
            <Icon className="h-4 w-4 text-orange-600 shrink-0" />
            <span className="max-w-[180px] truncate">{selectedBiz?.name ?? 'Select location'}</span>
            <span className="text-xs font-normal text-(--text-muted) capitalize ml-0.5">
              ({selectedBiz?.mode ?? ''})
            </span>
            <ChevronDownIcon className={clsx('h-3.5 w-3.5 text-(--text-muted) transition-transform ml-auto', open && 'rotate-180')} />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setOpen(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 w-64 rounded-xl border border-(--border) bg-(--surface) shadow-lg overflow-hidden">
                {businesses.map(biz => {
                  const BizIcon = MODE_ICON[biz.mode] ?? BuildingStorefrontIcon;
                  const isSelected = biz.id === selectedBiz?.id;
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => select(biz.id)}
                      className={clsx(
                        'flex w-full items-center gap-3 px-4 py-3 text-left text-sm transition-colors',
                        biz.parent_business && 'pl-8',
                        isSelected
                          ? 'bg-orange-50 text-orange-700 font-semibold'
                          : 'text-(--text-primary) hover:bg-(--primary-tint)/30',
                      )}
                    >
                      <BizIcon className={clsx('h-4 w-4 shrink-0', isSelected ? 'text-orange-600' : 'text-(--text-muted)')} />
                      <span className="flex-1 truncate">{biz.name}</span>
                      <span className="text-xs text-(--text-muted) capitalize">{biz.mode}</span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Nav links */}
      <div className="flex gap-1 flex-wrap border-b border-(--border) pb-0">
        {links.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                isActive
                  ? 'border-orange-600 text-orange-600'
                  : 'border-transparent text-(--text-secondary) hover:text-(--text-primary)',
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  );
}
