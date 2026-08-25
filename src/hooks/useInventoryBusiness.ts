import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';

export interface InventoryBusiness {
  id: number;
  name: string;
  mode: string;
  my_role: string;
  parent_business: number | null;
  is_on_trial: boolean;
  is_subscription_active: boolean;
  branch_count: number;
  trial_end?: string | null;
}

const STORAGE_KEY = 'inv_selected_biz_id';

export function useInventoryBusiness() {
  const { data: businesses = [], isLoading } = useQuery<InventoryBusiness[]>({
    queryKey: ['inventory-businesses'],
    queryFn: () => api.get('/inventory/businesses/').then(r => r.data),
    staleTime: 60_000,
  });

  const [selectedId, setSelectedIdRaw] = useState<number | null>(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      return s ? Number(s) : null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (businesses.length === 0) return;
    const valid = businesses.find(b => b.id === selectedId);
    if (!valid) {
      const first = businesses[0];
      setSelectedIdRaw(first.id);
      try { localStorage.setItem(STORAGE_KEY, String(first.id)); } catch {}
    }
  }, [businesses, selectedId]);

  function setSelectedId(id: number) {
    setSelectedIdRaw(id);
    try { localStorage.setItem(STORAGE_KEY, String(id)); } catch {}
  }

  const selectedBiz = businesses.find(b => b.id === selectedId) ?? businesses[0] ?? null;

  return { businesses, selectedBiz, selectedId: selectedBiz?.id ?? null, setSelectedId, isLoading };
}
