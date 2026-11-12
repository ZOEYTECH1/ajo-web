import { useEffect, useRef } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../services/api';
import useAuthStore from '../store/useAuthStore';

export type ModuleKey = 'ajo' | 'thrift' | 'inventory';

/**
 * Which of the 3 modules (Ajo / Thrift / Inventory) a user uses. The
 * account's own `selected_modules` (set via the pick-modules screen, or
 * added to later) is the source of truth -- shared with mobile, so a choice
 * made on one platform shows up on the other.
 *
 * Still watches real usage data in the background and automatically adds a
 * module the moment the user has real data in one they haven't explicitly
 * picked (e.g. accepting a group invite) -- mirrors mobile's own "grow from
 * server data, never remove" rule. This also covers the migration case: an
 * existing user whose account predates this field has selected_modules: []
 * but real data everywhere, so detection fills it in silently without ever
 * showing them a picker meant for brand-new accounts.
 *
 * `isNewUser` is only true once detection has actually finished confirming
 * there is no real data anywhere -- that's the one signal ProtectedLayout
 * should redirect to /pick-modules on, never selected_modules.length === 0
 * alone (which is also briefly true for an existing user before detection
 * has had a chance to run).
 */
export function useModuleAccess() {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  const selected = user?.selected_modules ?? [];
  const needsDetection = !!user && selected.length === 0;

  // Reuses the exact query keys/fetchers AjoGroupsPage, ThriftPage and
  // useInventoryBusiness already use, so this never causes an extra network
  // request beyond what those pages trigger themselves.
  const { data: ajoGroups, isLoading: ajoLoading } = useQuery({
    queryKey: ['ajo-groups'],
    queryFn: () => api.get('/groups/').then((r) => r.data),
    staleTime: 60_000,
    enabled: !!user,
  });
  const { data: thriftGroups, isLoading: thriftLoading } = useQuery({
    queryKey: ['thrift-groups'],
    queryFn: () => api.get('/thrift/').then((r) => r.data),
    staleTime: 60_000,
    enabled: !!user,
  });
  const { data: businesses, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-businesses'],
    queryFn: () => api.get('/inventory/businesses/').then((r) => r.data),
    staleTime: 60_000,
    enabled: !!user,
  });

  const detectionLoading = ajoLoading || thriftLoading || inventoryLoading;

  const updateMutation = useMutation({
    mutationFn: (modules: ModuleKey[]) => api.patch('/auth/me/', { selected_modules: modules }),
    onSuccess: (resp) => setUser(resp.data),
  });

  // Guards against re-firing the same add for every re-render/refetch while
  // the mutation is in flight -- the backend call itself is already a safe
  // union (never overwrites), this just avoids redundant requests.
  const attemptedRef = useRef<Set<ModuleKey>>(new Set());
  useEffect(() => {
    if (!user || detectionLoading) return;
    const toAdd: ModuleKey[] = [];
    if (Array.isArray(ajoGroups) && ajoGroups.length > 0 && !selected.includes('ajo') && !attemptedRef.current.has('ajo')) toAdd.push('ajo');
    if (Array.isArray(thriftGroups) && thriftGroups.length > 0 && !selected.includes('thrift') && !attemptedRef.current.has('thrift')) toAdd.push('thrift');
    if (Array.isArray(businesses) && businesses.length > 0 && !selected.includes('inventory') && !attemptedRef.current.has('inventory')) toAdd.push('inventory');
    if (toAdd.length > 0) {
      toAdd.forEach((m) => attemptedRef.current.add(m));
      updateMutation.mutate(toAdd);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, detectionLoading, ajoGroups, thriftGroups, businesses]);

  const hasRealDataAnywhere =
    (Array.isArray(ajoGroups) && ajoGroups.length > 0) ||
    (Array.isArray(thriftGroups) && thriftGroups.length > 0) ||
    (Array.isArray(businesses) && businesses.length > 0);

  return {
    // True only while we don't yet know whether this is a genuinely new
    // user or an existing one whose selection just hasn't synced yet.
    isLoading: needsDetection && detectionLoading,
    // True once detection has finished and found nothing anywhere *and*
    // nothing was explicitly picked -- the one correct signal to show the
    // module picker on.
    isNewUser: needsDetection && !detectionLoading && !hasRealDataAnywhere,
    usesAjo: selected.includes('ajo'),
    usesThrift: selected.includes('thrift'),
    usesInventory: selected.includes('inventory'),
    addModule: (key: ModuleKey) => {
      if (!selected.includes(key)) updateMutation.mutate([key]);
    },
  };
}
