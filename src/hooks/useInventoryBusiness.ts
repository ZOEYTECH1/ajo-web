import { useEffect } from 'react';
import { create } from 'zustand';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface InventoryBusiness {
  id: number;
  name: string;
  mode: string;
  my_role: string;
  parent_business: number | null;
  partner_code: string;
  is_on_trial: boolean;
  is_subscription_active: boolean;
  branch_count: number;
  trial_end?: string | null;
}

const STORAGE_KEY = 'inv_selected_biz_id';

function loadStoredId(): number | null {
  try {
    const s = localStorage.getItem(STORAGE_KEY);
    return s ? Number(s) : null;
  } catch {
    return null;
  }
}

// The selected business id has to live in a real shared store, not a plain
// useState inside this hook -- every page calls useInventoryBusiness()
// separately (Dashboard, Analytics, InventoryNav, ...), and a plain
// useState gives each call site its own independent copy. Switching
// locations in InventoryNav updated *its own* copy and localStorage, but
// every other already-mounted page's copy never found out, so their
// queries kept running with the stale business_id until a full reload
// re-read localStorage from scratch. Zustand (already the pattern used
// for auth, see store/useAuthStore.ts) makes every call site read and
// write the exact same state, so a switch anywhere re-renders everywhere
// immediately.
const useSelectedBusinessStore = create<{
  selectedId: number | null;
  setSelectedId: (id: number) => void;
}>((set) => ({
  selectedId: loadStoredId(),
  setSelectedId: (id) => {
    try { localStorage.setItem(STORAGE_KEY, String(id)); } catch {}
    set({ selectedId: id });
  },
}));

export function useInventoryBusiness() {
  const { data: businesses = [], isLoading } = useQuery<InventoryBusiness[]>({
    queryKey: ['inventory-businesses'],
    queryFn: () => api.get('/inventory/businesses/').then(r => r.data),
    staleTime: 60_000,
  });

  const selectedId = useSelectedBusinessStore((s) => s.selectedId);
  const setSelectedId = useSelectedBusinessStore((s) => s.setSelectedId);

  useEffect(() => {
    if (businesses.length === 0) return;
    const valid = businesses.find(b => b.id === selectedId);
    if (!valid) {
      setSelectedId(businesses[0].id);
    }
  }, [businesses, selectedId, setSelectedId]);

  const selectedBiz = businesses.find(b => b.id === selectedId) ?? businesses[0] ?? null;

  return { businesses, selectedBiz, selectedId: selectedBiz?.id ?? null, setSelectedId, isLoading };
}
