import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Which of the 3 modules (Ajo / Thrift / Inventory) a user actually uses,
 * derived from real data rather than a stored preference ("if you have real
 * groups/business data in a module, it counts as active"). A brand-new user
 * with no usage anywhere gets everything shown once that's confirmed, so
 * there's always a way to start using any module.
 *
 * Every flag starts false and only flips to true once its own query
 * resolves -- a module the user doesn't use must never render even
 * momentarily while the others are still loading. Consumers (Sidebar,
 * DashboardPage) should treat `isLoading` as "nothing to show yet" rather
 * than falling back to rendering all three.
 *
 * Reuses the exact query keys/fetchers already used by AjoGroupsPage,
 * ThriftPage and useInventoryBusiness, so this never causes an extra
 * network request beyond what those pages already trigger.
 */
export function useModuleAccess() {
  const { data: ajoGroups, isLoading: ajoLoading } = useQuery({
    queryKey: ['ajo-groups'],
    queryFn: () => api.get('/groups/').then((r) => r.data),
    staleTime: 60_000,
  });
  const { data: thriftGroups, isLoading: thriftLoading } = useQuery({
    queryKey: ['thrift-groups'],
    queryFn: () => api.get('/thrift/').then((r) => r.data),
    staleTime: 60_000,
  });
  const { data: businesses, isLoading: inventoryLoading } = useQuery({
    queryKey: ['inventory-businesses'],
    queryFn: () => api.get('/inventory/businesses/').then((r) => r.data),
    staleTime: 60_000,
  });

  const isLoading = ajoLoading || thriftLoading || inventoryLoading;
  const usesAjo = Array.isArray(ajoGroups) && ajoGroups.length > 0;
  const usesThrift = Array.isArray(thriftGroups) && thriftGroups.length > 0;
  const usesInventory = Array.isArray(businesses) && businesses.length > 0;
  const usesAny = usesAjo || usesThrift || usesInventory;

  // For a user with zero usage anywhere, default to "everything active" so
  // there's always a way to start using any module. This must only apply
  // once loading has actually finished -- applying it *while* still loading
  // (the old behaviour) showed every module for a user who only uses one or
  // two, then yanked the others away the instant data arrived. Nothing
  // should ever render for a module the user doesn't use, not even
  // momentarily, so each flag stays false until its own answer is known.
  const showEverything = !isLoading && !usesAny;

  return {
    isLoading,
    usesAjo: showEverything ? true : !isLoading && usesAjo,
    usesThrift: showEverything ? true : !isLoading && usesThrift,
    usesInventory: showEverything ? true : !isLoading && usesInventory,
  };
}
