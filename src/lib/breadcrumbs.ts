/**
 * Route → breadcrumb label lookup for the desktop top bar. Falls back to
 * humanizing unknown path segments (e.g. dynamic ids) so new routes never
 * render a blank crumb while this table catches up.
 */
const ROUTE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  notifications: 'Notifications',
  account: 'Account',
  privacy: 'Privacy',
  help: 'Help',
  'pick-modules': 'Choose Sections',
  'complete-profile': 'Complete Profile',

  ajo: 'Ajo Groups',
  thrift: 'Thrift',
  inventory: 'Inventory',

  history: 'History',
  queue: 'Queue',
  billing: 'Billing',
  subscription: 'Subscription',
  org: 'Organization',
  create: 'Create',

  analytics: 'Analytics',
  sales: 'Sales',
  categories: 'Categories',
  products: 'Products',
  expenses: 'Expenses',
  customers: 'Customers',
  business: 'Business',
  transfers: 'Transfers',
  warehouse: 'Warehouse',
  receive: 'Receive',
  dispatch: 'Dispatch',
  'product-requests': 'Requests',
  'best-sellers': 'Best Sellers',
};

function humanize(segment: string): string {
  if (ROUTE_LABELS[segment]) return ROUTE_LABELS[segment];
  // Dynamic segments (numeric ids, uuids) read as noise in a breadcrumb --
  // the page itself already shows which specific record is open.
  const looksLikeId = /^\d+$/.test(segment) || /^[0-9a-f-]{8,}$/i.test(segment);
  if (looksLikeId) return 'Details';
  return segment
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export interface Crumb {
  label: string;
  /** Cumulative path up to and including this segment -- clicking any
   * crumb navigates straight there, not just the last one. */
  path: string;
}

export function getBreadcrumb(pathname: string): Crumb[] {
  const segments = pathname.split('/').filter(Boolean);
  if (segments.length === 0) return [{ label: 'Dashboard', path: '/dashboard' }];
  let path = '';
  return segments.map((segment) => {
    path += `/${segment}`;
    return { label: humanize(segment), path };
  });
}
