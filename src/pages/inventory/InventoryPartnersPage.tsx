import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { CheckIcon, XMarkIcon, ClipboardDocumentIcon, ClipboardDocumentCheckIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { InventoryNav } from '../../components/inventory/InventoryNav';
import api from '../../services/api';
import { useInventoryBusiness } from '../../hooks/useInventoryBusiness';

interface BusinessMini {
  id: number;
  name: string;
  mode: string;
  partner_code: string;
}

interface PartnerLink {
  id: number;
  requesting_business: BusinessMini;
  partner_business: BusinessMini;
  status: 'pending' | 'accepted' | 'rejected';
  invited_by_name: string | null;
  responded_by_name: string | null;
  created_at: string;
  responded_at: string | null;
}

const inputCls =
  'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-(--primary)';

function LinkCard({
  other,
  children,
}: {
  other: BusinessMini;
  children?: React.ReactNode;
}) {
  return (
    <div className="surface-soft p-4 flex items-center justify-between gap-4 flex-wrap">
      <div>
        <p className="font-semibold text-(--text-primary)">{other.name}</p>
        <p className="text-xs text-(--text-muted) capitalize">{other.mode}</p>
      </div>
      {children && <div className="flex items-center gap-2 shrink-0">{children}</div>}
    </div>
  );
}

export default function InventoryPartnersPage() {
  const qc = useQueryClient();
  const { selectedId, selectedBiz, isLoading: bizLoading } = useInventoryBusiness();
  const bizId = selectedId;
  const myRole = selectedBiz?.my_role ?? null;
  const canManage = myRole === 'owner' || myRole === 'manager';

  const [code, setCode] = useState('');
  const [err, setErr] = useState('');
  const [copied, setCopied] = useState(false);

  const { data: links = [], isLoading: linksLoading } = useQuery<PartnerLink[]>({
    queryKey: ['inventory-partners', bizId],
    queryFn: () => api.get(`/inventory/businesses/${bizId}/partners/`).then((r) => r.data),
    enabled: !!bizId,
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.post(`/inventory/businesses/${bizId}/partners/`, { partner_code: code.trim() }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['inventory-partners', bizId] });
      setCode('');
      setErr('');
    },
    onError: (e: any) => {
      const d = e.response?.data;
      setErr(d?.partner_code ?? d?.detail ?? 'Something went wrong.');
    },
  });

  const respondMutation = useMutation({
    mutationFn: ({ linkId, status }: { linkId: number; status: 'accepted' | 'rejected' }) =>
      api.patch(`/inventory/partners/${linkId}/`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['inventory-partners', bizId] }),
  });

  function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    if (!code.trim()) { setErr('Enter a partner code.'); return; }
    inviteMutation.mutate();
  }

  function copyCode() {
    if (!selectedBiz?.partner_code) return;
    navigator.clipboard.writeText(selectedBiz.partner_code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const sentPending = links.filter((l) => l.status === 'pending' && l.requesting_business.id === bizId);
  const receivedPending = links.filter((l) => l.status === 'pending' && l.partner_business.id === bizId);
  const accepted = links.filter((l) => l.status === 'accepted');

  const isLoading = bizLoading || linksLoading;

  return (
    <div className="space-y-6">
      <InventoryNav />

      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">Business Partners</h1>
        <p className="text-sm text-(--text-secondary)">
          Connect with another business to request stock from each other
        </p>
      </div>

      {/* My own code, to share */}
      <div className="surface-soft p-5 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-sm font-semibold text-(--text-secondary)">Your partner code</p>
          <p className="text-xs text-(--text-muted) mt-0.5">Share this with another business so they can invite {selectedBiz?.name ?? 'your business'}</p>
        </div>
        <button
          type="button"
          onClick={copyCode}
          className="inline-flex items-center gap-2 rounded-lg surface-soft-sm surface-soft-interactive px-4 py-2 font-mono text-sm font-bold tracking-widest text-(--primary)"
        >
          {selectedBiz?.partner_code ?? '········'}
          {copied ? <ClipboardDocumentCheckIcon className="h-4 w-4 text-green-600" /> : <ClipboardDocumentIcon className="h-4 w-4 text-(--text-muted)" />}
        </button>
      </div>

      {/* Invite form */}
      {canManage && (
        <form onSubmit={handleInvite} className="surface-soft p-5 space-y-3">
          <p className="text-sm font-semibold text-(--text-secondary)">Invite a business by their partner code</p>
          <div className="flex gap-3 flex-wrap">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. 7K2PX9QM"
              className={clsx(inputCls, 'flex-1 min-w-[180px] font-mono uppercase tracking-widest')}
              maxLength={8}
            />
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="rounded-lg bg-(--accent) text-white px-5 py-2 text-sm font-semibold hover:bg-(--accent-dark) disabled:opacity-50 transition-colors"
            >
              {inviteMutation.isPending ? 'Sending…' : 'Send Invite'}
            </button>
          </div>
          {err && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{err}</p>}
        </form>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 rounded-xl bg-(--surface) border border-(--border) animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {receivedPending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-(--text-secondary) uppercase tracking-wide">Invites received</h2>
              {receivedPending.map((l) => (
                <LinkCard key={l.id} other={l.requesting_business}>
                  {canManage ? (
                    <>
                      <button
                        type="button"
                        disabled={respondMutation.isPending}
                        onClick={() => respondMutation.mutate({ linkId: l.id, status: 'accepted' })}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 text-white px-3 py-1.5 text-sm font-semibold hover:bg-green-700 disabled:opacity-50 transition-colors"
                      >
                        <CheckIcon className="h-4 w-4" />
                        Accept
                      </button>
                      <button
                        type="button"
                        disabled={respondMutation.isPending}
                        onClick={() => respondMutation.mutate({ linkId: l.id, status: 'rejected' })}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 text-red-600 px-3 py-1.5 text-sm font-semibold hover:bg-red-50 disabled:opacity-50 transition-colors"
                      >
                        <XMarkIcon className="h-4 w-4" />
                        Decline
                      </button>
                    </>
                  ) : (
                    <span className="text-xs text-(--text-muted)">Awaiting a manager's response</span>
                  )}
                </LinkCard>
              ))}
            </div>
          )}

          {sentPending.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-(--text-secondary) uppercase tracking-wide">Invites sent</h2>
              {sentPending.map((l) => (
                <LinkCard key={l.id} other={l.partner_business}>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-yellow-100 dark:bg-yellow-950/50 text-yellow-700 dark:text-yellow-400">
                    Pending
                  </span>
                </LinkCard>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h2 className="text-sm font-bold text-(--text-secondary) uppercase tracking-wide">Connected partners</h2>
            {accepted.length === 0 ? (
              <div className="rounded-xl bg-(--surface) border border-(--border) px-6 py-12 text-center">
                <p className="text-sm text-(--text-muted)">No connected partners yet. Share your code above or invite one.</p>
              </div>
            ) : (
              accepted.map((l) => {
                const other = l.requesting_business.id === bizId ? l.partner_business : l.requesting_business;
                return (
                  <LinkCard key={l.id} other={other}>
                    <span className="text-xs text-(--text-muted)">
                      Connected {l.responded_at ? format(new Date(l.responded_at), 'dd MMM yyyy') : ''}
                    </span>
                  </LinkCard>
                );
              })
            )}
          </div>
        </>
      )}
    </div>
  );
}
