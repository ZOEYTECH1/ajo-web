import { NavLink } from 'react-router-dom';
import clsx from 'clsx';

const links = [
  { to: '/inventory',            label: 'Dashboard',  end: true },
  { to: '/inventory/categories', label: 'Categories', end: false },
  { to: '/inventory/sales',      label: 'Sales',      end: false },
  { to: '/inventory/expenses',   label: 'Expenses',   end: false },
  { to: '/inventory/customers',  label: 'Customers',  end: false },
  { to: '/inventory/analytics',  label: 'Analytics',  end: false },
  { to: '/inventory/transfers',  label: 'Transfers',  end: false },
  { to: '/inventory/business',   label: 'Business',   end: false },
];

export function InventoryNav() {
  return (
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
  );
}
