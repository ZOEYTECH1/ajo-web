import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

/**
 * Which of the 3 modules (Ajo / Thrift / Inventory) a user actually uses,
 * derived from real data rather than a stored preference — mirrors the
 * mobile app's own fallback rule ("if you have real groups/business data in
 * a module, it counts as active"). A brand-new user with no usage anywhere
 * gets everything shown, so there's always a way to start using any module.
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

  return {
    isLoading,
    // While still loading, or for a user with zero usage anywhere, default
    // to "everything active" rather than narrowing based on incomplete data.
    usesAjo: isLoading || !usesAny ? true : usesAjo,
    usesThrift: isLoading || !usesAny ? true : usesThrift,
    usesInventory: isLoading || !usesAny ? true : usesInventory,
  };
}
