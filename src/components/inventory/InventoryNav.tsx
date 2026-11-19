import { useEffect, useRef, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { useQueryClient } from '@tanstack/react-query';
import { Menu, MenuButton, MenuItems, MenuItem } from '@headlessui/react';
import {
  BuildingStorefrontIcon, CubeIcon, BuildingOfficeIcon, ChevronDownIcon, EllipsisHorizontalIcon,
  ArrowDownTrayIcon, ArrowUpTrayIcon, InboxStackIcon,
  Cog6ToothIcon, ClockIcon, CreditCardIcon, TrophyIcon,
  UserGroupIcon, ArrowsRightLeftIcon,
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
  { to: '/inventory/transfer-requests',   label: 'Stock Requests',  icon: ArrowsRightLeftIcon },
  { to: '/inventory/partners',            label: 'Business Partners', icon: UserGroupIcon },
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

  // This nav remounts fresh on every page (each page renders its own
  // <InventoryNav />), so its scrollable primary-link row always starts
  // scrolled to the far left -- hiding the active tab if it's further
  // right than the strip's visible width, which read as "navigating
  // always jumps the nav back to Dashboard." Scroll whichever
  // link/trigger is actually active into view once this instance mounts.
  const activeLinkRef = useRef<HTMLAnchorElement | HTMLButtonElement | null>(null);
  useEffect(() => {
    activeLinkRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [pathname]);

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
    qc.invalidateQueries({ queryKey: ['inventory-partners'] });
    qc.invalidateQueries({ queryKey: ['inventory-transfer-requests'] });
    qc.invalidateQueries({ queryKey: ['inventory-best-sellers'] });
    qc.invalidateQueries({ queryKey: ['inventory-past-periods'] });
    qc.invalidateQueries({ queryKey: ['inventory-lifetime-totals'] });
    qc.invalidateQueries({ queryKey: ['inventory-lifetime-trend'] });
  }

  const Icon = MODE_ICON[selectedBiz?.mode ?? 'retail'] ?? BuildingStorefrontIcon;

  return (
    // Sticky so the business switcher and tabs stay reachable on long
    // pages (Analytics, Products) without scrolling all the way back up.
    // <main> (Layout.tsx) has its own "px-3 py-4 sm:p-6" padding, and sticky
    // offsets are measured from the *padding* edge of the scroll
    // container, not its border edge -- so covering that padding strip
    // takes three matched pieces, not just one:
    //   - margin: pulls this element's own box up/out into that padding
    //     strip so its background actually paints over it;
    //   - padding: pushes the inner content back down/in by the same
    //     amount, so it still lines up visually where it did before;
    //   - top (negative, same amount): without this the sticky threshold
    //     is still computed against the *un-bled* box, so the pulled-up
    //     margin and the "stuck" position disagree and the element can
    //     end up stuck in the wrong place entirely instead of just
    //     leaving a gap. All three have to match main's own padding.
    <div className="sticky -top-4 sm:-top-6 z-10 -mx-3 sm:-mx-6 -mt-4 sm:-mt-6 px-3 sm:px-6 pt-4 sm:pt-6 bg-(--bg) pb-2 space-y-2">
      {/* Business switcher — only shown when multiple locations exist */}
      {businesses.length > 1 && (
        <div className="relative" ref={dropRef}>
          <button
            type="button"
            onClick={() => setOpen(v => !v)}
            className="flex items-center gap-2 max-w-full rounded-lg surface-soft-sm surface-soft-interactive px-3 py-2 text-sm font-semibold text-(--text-primary) hover:border-(--primary-light)"
          >
            <Icon className="h-4 w-4 text-(--primary) shrink-0" />
            <span className="max-w-35 sm:max-w-45 truncate">{selectedBiz?.name ?? 'Select location'}</span>
            {/* The mode icon already encodes this -- the "(mode)" label is
                a nice-to-have that can drop on the narrowest phones rather
                than risk pushing the button wider than the viewport. */}
            <span className="hidden sm:inline text-xs font-normal text-(--text-muted) capitalize shrink-0">
              ({selectedBiz?.mode ?? ''})
            </span>
            <ChevronDownIcon className={clsx('h-3.5 w-3.5 text-(--text-muted) transition-transform shrink-0 ml-auto', open && 'rotate-180')} />
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
                          ? 'bg-(--accent) text-white font-semibold'
                          : 'text-(--text-primary) hover:bg-(--primary-tint)/30',
                      )}
                    >
                      <BizIcon className={clsx('h-4 w-4 shrink-0', isSelected ? 'text-white' : 'text-(--text-muted)')} />
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
          repo-tabs pattern). The primary row now scrolls horizontally on
          narrow screens rather than wrapping -- with 7 primary links plus
          the "More" trigger, wrapping produced a ragged 2-3 row block
          whose height varied with viewport width, pushing page content
          down unpredictably and reading as cramped. Scrolling keeps the
          nav a single, predictable row at every width -- the same
          treatment already used for the Ajo/Thrift group detail tab bars.
          No visual change at all once everything already fits on one row
          (tablet/desktop). Active state is a pill background, not a
          border-bottom accent, so there's no border-alignment class of
          bug here to begin with. */}
      <div className="flex items-center gap-1 overflow-x-auto border-b border-(--border) pb-2">
        {primaryLinks.map(({ to, label, end }) => {
          const isActive = end ? pathname === to : pathname.startsWith(to);
          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              ref={isActive ? (activeLinkRef as React.RefObject<HTMLAnchorElement>) : undefined}
              className={clsx(
                'shrink-0 px-4 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200',
                isActive
                  ? 'bg-(--accent) text-white shadow-(--shadow-soft-sm)'
                  : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-(--primary-tint)/30',
              )}
            >
              {label}
            </NavLink>
          );
        })}

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
          {/* No surface-soft-interactive here deliberately -- its
              hover:translateY lift moves the button's own box, and because
              MenuItems is anchored (floating-ui) to that box, the open
              dropdown visibly tracked and jittered along with the lift
              while hovering the trigger. A trigger for an anchored panel
              must only change shadow/colour on hover, never position. */}
          <MenuButton
            ref={isMoreActive ? (activeLinkRef as React.RefObject<HTMLButtonElement>) : undefined}
            className={clsx(
              'group flex items-center gap-1.5 shrink-0 pl-2.5 pr-2 py-2 rounded-lg text-sm font-semibold whitespace-nowrap transition-all duration-200 active:scale-[0.97]',
              isMoreActive
                ? 'bg-(--accent) text-white shadow-(--shadow-soft-sm)'
                : 'surface-soft-sm hover:shadow-(--shadow-soft-lg) hover:border-(--primary) text-(--text-secondary) hover:text-(--text-primary)',
            )}
          >
            <EllipsisHorizontalIcon className="h-5 w-5" aria-hidden="true" />
            More
            <ChevronDownIcon
              className={clsx(
                'h-3.5 w-3.5 transition-transform group-data-open:rotate-180',
                isMoreActive ? 'text-white' : 'text-(--text-muted)',
              )}
              aria-hidden="true"
            />
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
                        ? 'bg-(--accent) text-white'
                        : 'text-(--text-primary) data-focus:bg-(--primary-tint)/30',
                    )}
                  >
                    <ItemIcon className={clsx('h-4 w-4 shrink-0', isActive ? 'text-white' : 'text-(--text-muted)')} aria-hidden="true" />
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
