import { useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import {
  BuildingStorefrontIcon, CubeIcon, BuildingOfficeIcon, ChevronDownIcon, EllipsisHorizontalIcon,
  ArrowDownTrayIcon, ArrowUpTrayIcon, InboxStackIcon,
  Cog6ToothIcon, ClockIcon, CreditCardIcon, TrophyIcon,
} from '@heroicons/react/24/outline';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';

// Split into an always-visible primary row and a "More" menu (GitHub's own
// repo-tabs overflow pattern) instead of either wrapping onto a second row
// or forcing a horizontal scrollbar at 14 tabs wide -- neither reads as
// "modern" once there are this many destinations. The primary 7 are the
// ones used in day-to-day operation; the rest are lower-frequency
// (warehouse-specific, setup, reporting, admin) and are just as reachable
// one click deeper.
const primaryLinks = [
  { to: '/inventory',            label: 'Dashboard',  end: true },
  { to: '/inventory/sales',      label: 'Sales',       end: false },
  { to: '/inventory/categories', label: 'Categories',  end: false },
  { to: '/inventory/expenses',   label: 'Expenses',    end: false },
  { to: '/inventory/customers',  label: 'Customers',   end: false },
  { to: '/inventory/analytics',  label: 'Analytics',   end: false },
  { to: '/inventory/transfers',  label: 'Transfers',   end: false },
];

const moreLinks = [
  { to: '/inventory/warehouse/receive',   label: 'Receive Stock',   icon: ArrowDownTrayIcon },
  { to: '/inventory/warehouse/dispatch',  label: 'Dispatch Stock',  icon: ArrowUpTrayIcon },
  { to: '/inventory/product-requests',    label: 'Product Requests', icon: InboxStackIcon },
  { to: '/inventory/business',            label: 'Business Setup',  icon: Cog6ToothIcon },
  { to: '/inventory/history',             label: 'Business History', icon: ClockIcon },
  { to: '/inventory/subscription',        label: 'Subscription',    icon: CreditCardIcon },
  { to: '/inventory/best-sellers',        label: 'Best Sellers',    icon: TrophyIcon },
];

const MODE_ICON: Record<string, React.ElementType> = {
  retail:    BuildingStorefrontIcon,
  warehouse: CubeIcon,
  branch:    BuildingOfficeIcon,
};

export function InventoryNav() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { businesses, selectedBiz, setSelectedId } = useInventoryBusiness();
  const [open, setOpen] = useState(false);
  const dropRef = useRef<HTMLDivElement>(null);
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

        {/* "More" overflow menu -- Headless UI's Menu rather than a
            hand-rolled dropdown, for the same reason real design systems
            (Linear, Vercel, GitHub's newer UI) build on it: proper keyboard
            nav (arrow keys, Home/End, type-ahead, Escape), focus trapped
            and returned to the trigger on close, correct ARIA roles out of
            the box, viewport-aware positioning (anchor), and a built-in
            enter/leave transition -- all things a custom click-outside div
            has to hand-roll and easily gets wrong. */}
        {/* The trigger is deliberately a distinct soft-UI chip, not another
            plain-text tab -- it isn't a page link like the ones beside it,
            it opens a menu, and it should look like a control rather than
            blend into the row (the same "looks clickable on its own
            terms" cue GitHub's own "..." button gives its repo tabs). */}
        <Menu as="div" className="relative ml-1">
          <MenuButton
            className={clsx(
              'group flex items-center gap-1.5 shrink-0 pl-2.5 pr-2 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.97]',
              isMoreActive
                ? 'bg-orange-50 text-orange-600 shadow-(--shadow-soft-sm) dark:bg-orange-950/40'
                : 'surface-soft-sm surface-soft-interactive text-(--text-secondary) hover:text-(--text-primary)',
            )}
          >
            <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
            More
            <ChevronDownIcon className="h-3.5 w-3.5 text-(--text-muted) transition-transform group-data-open:rotate-180" aria-hidden="true" />
          </MenuButton>

          <MenuItems
            transition
            anchor="bottom start"
            className="z-20 mt-1 w-56 origin-top surface-soft overflow-hidden py-1 transition duration-150 ease-out data-closed:opacity-0 data-closed:scale-95 [--anchor-gap:4px]"
          >
            {moreLinks.map(({ to, label, icon: ItemIcon }) => {
              const isActive = pathname.startsWith(to);
              return (
                <MenuItem key={to}>
                  <button
                    type="button"
                    onClick={() => navigate(to)}
                    className={clsx(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40'
                        : 'text-(--text-primary) data-focus:bg-(--primary-tint)/30',
                    )}
                  >
                    <ItemIcon className={clsx('h-4 w-4 shrink-0', isActive ? 'text-orange-600' : 'text-(--text-muted)')} aria-hidden="true" />
                    {label}
                  </button>
                </MenuItem>
              );
            })}
          </MenuItems>
        </Menu>
      </div>
    </div>
  );
}
