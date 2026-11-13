import { useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { BuildingStorefrontIcon, CubeIcon, BuildingOfficeIcon, ChevronDownIcon, EllipsisHorizontalIcon } from '@heroicons/react/24/outline';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';

// Split into an always-visible primary row and a "More" dropdown (GitHub's
// own repo-tabs pattern) instead of either wrapping onto a second row or
// forcing a horizontal scrollbar at 14 tabs wide -- neither reads as
// "modern" once there are this many destinations. The primary set is the
// handful used in day-to-day operation; the rest are lower-frequency
// (setup, reporting, admin) and are just as reachable one click deeper.
const primaryLinks = [
  { to: '/inventory',           label: 'Dashboard', end: true },
  { to: '/inventory/sales',     label: 'Sales',      end: false },
  { to: '/inventory/categories', label: 'Categories', end: false },
  { to: '/inventory/expenses',  label: 'Expenses',   end: false },
  { to: '/inventory/customers', label: 'Customers',  end: false },
  { to: '/inventory/analytics', label: 'Analytics',  end: false },
];

const moreLinks = [
  { to: '/inventory/transfers',           label: 'Transfers' },
  { to: '/inventory/warehouse/receive',   label: 'Receive Stock' },
  { to: '/inventory/warehouse/dispatch',  label: 'Dispatch Stock' },
  { to: '/inventory/product-requests',    label: 'Product Requests' },
  { to: '/inventory/business',            label: 'Business Setup' },
  { to: '/inventory/history',             label: 'Business History' },
  { to: '/inventory/subscription',        label: 'Subscription' },
  { to: '/inventory/best-sellers',        label: 'Best Sellers' },
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
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const isMoreActive = moreLinks.some((l) => pathname.startsWith(l.to));

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
    qc.invalidateQueries({ queryKey: ['inventory-past-periods'] });
    qc.invalidateQueries({ queryKey: ['inventory-lifetime-totals'] });
    qc.invalidateQueries({ queryKey: ['inventory-lifetime-trend'] });
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
            className="flex items-center gap-2 rounded-lg surface-soft-sm surface-soft-interactive px-3 py-2 text-sm font-semibold text-(--text-primary) hover:border-orange-400"
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
              <div className="absolute left-0 top-full z-20 mt-1 w-64 surface-soft overflow-hidden">
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

      {/* Nav links -- a primary row plus a "More" dropdown (GitHub's own
          repo-tabs pattern), instead of either wrapping onto a second row
          or forcing a horizontal scrollbar once there are this many
          destinations. Primary links still wrap on genuinely narrow
          screens (phones) rather than scrolling -- six short labels wrap
          cleanly onto at most two rows there, which is still better than
          a scrollbar. Active state is a pill background, not a
          border-bottom accent, so there's no border-alignment class of
          bug here to begin with. */}
      <div className="flex items-center gap-1 flex-wrap border-b border-(--border) pb-2">
        {primaryLinks.map(({ to, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) =>
              clsx(
                'shrink-0 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200',
                isActive
                  ? 'bg-orange-50 text-orange-600 shadow-(--shadow-soft-sm) dark:bg-orange-950/40'
                  : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--primary-tint)/30',
              )
            }
          >
            {label}
          </NavLink>
        ))}

        <div className="relative">
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className={clsx(
              'flex items-center gap-1 shrink-0 px-3 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200',
              isMoreActive
                ? 'bg-orange-50 text-orange-600 shadow-(--shadow-soft-sm) dark:bg-orange-950/40'
                : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--primary-tint)/30',
            )}
          >
            <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
            More
            <ChevronDownIcon className={clsx('h-3.5 w-3.5 text-(--text-muted) transition-transform', moreOpen && 'rotate-180')} />
          </button>

          {moreOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden="true" onClick={() => setMoreOpen(false)} />
              <div className="absolute left-0 top-full z-20 mt-1 w-56 surface-soft overflow-hidden py-1">
                {moreLinks.map(({ to, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) =>
                      clsx(
                        'block px-4 py-2.5 text-sm font-medium transition-colors',
                        isActive
                          ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40'
                          : 'text-(--text-primary) hover:bg-(--primary-tint)/30',
                      )
                    }
                  >
                    {label}
                  </NavLink>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
