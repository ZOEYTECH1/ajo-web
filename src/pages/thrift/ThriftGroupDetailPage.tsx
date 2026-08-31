import { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import clsx from 'clsx';
import {
  ClipboardDocumentIcon,
  ArrowPathIcon,
  Cog6ToothIcon,
  XCircleIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';
import { SkeletonTable } from '../../components/ui/Skeleton';
import api from '../../services/api';
import useAuthStore from '../../store/useAuthStore';

// ── Types ─────────────────────────────────────────────────────────────────────

interface UserSnap {
  id: number;
  full_name: string;
  email: string;
}

interface ThriftCycle {
  id: number;
  cycle_number: number;
  start_date: string | null;
  end_date: string | null;
  status: 'active' | 'completed';
  ended_at: string | null;
  created_at: string;
}

interface ThriftGroup {
  id: number;
  name: string;
  description: string;
  frequency: string;
  cycle_type: string;
  collector: UserSnap;
  organization: { id: number; name: string } | null;
  invite_code: string;
  member_count: number;
  is_on_trial: boolean;
  is_subscription_active: boolean;
  is_org_admin: boolean;
  active_cycle: ThriftCycle | null;
  created_at: string;
}

interface ThriftMember {
  id: number;
  user: UserSnap & { is_kyc_verified: boolean };
  personal_amount: string;
  status: 'pending' | 'approved' | 'rejected' | 'amount_pending';
  flag_reason: string;
  joined_at: string | null;
  total_saved: string;
  created_at: string;
}

interface ThriftPayment {
  id: number;
  member: number;
  member_name: string;
  cycle_id: number | null;
  amount: string;
  period_date: string;
  notes: string;
  marked_at: string;
  status: 'pending' | 'confirmed' | 'disputed';
  payer_confirmed: boolean;
  dispute_reason: string;
  dispute_audio: string | null;
  disputed_at: string | null;
  resolved_at: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatCurrency(v: string | number) {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency', currency: 'NGN', maximumFractionDigits: 0,
  }).format(Number(v));
}

function fmt(d: string | null | undefined) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

const inputCls = 'w-full rounded-lg border border-(--border) px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500';
const submitBtn = 'flex-1 rounded-lg bg-teal-600 text-white py-2.5 text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 transition-colors';
const cancelBtn = 'flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-(--text-secondary) mb-1">{label}</label>
      {children}
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      status === 'confirmed' ? 'bg-green-100 text-green-700'
      : status === 'disputed' ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700',
    )}>
      {status}
    </span>
  );
}

function MemberStatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize',
      status === 'approved' ? 'bg-green-100 text-green-700'
      : status === 'rejected' ? 'bg-red-100 text-red-700'
      : 'bg-yellow-100 text-yellow-700',
    )}>
      {status === 'amount_pending' ? 'Amount Flagged' : status}
    </span>
  );
}

// ── Settings Modal (collector only) ──────────────────────────────────────────

function SettingsModal({ groupId, group, onClose }: { groupId: number; group: ThriftGroup; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ name: group.name, description: group.description ?? '' });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.patch(`/thrift/${groupId}/`, { name: form.name.trim(), description: form.description.trim() }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['thrift-group', groupId] }); onClose(); },
    onError: (e: any) => { setErr(e.response?.data?.detail ?? 'Update failed.'); },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border) sticky top-0 bg-(--surface)">
          <h2 className="text-lg font-bold text-(--text-primary)">Group Settings</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>
        <div className="p-6 space-y-4">
          <Field label="Group Name">
            <input type="text" value={form.name} onChange={(e) => { setForm(f => ({ ...f, name: e.target.value })); setErr(''); }} className={inputCls} />
          </Field>
          <Field label="Description">
            <textarea rows={2} value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className={inputCls} />
          </Field>
          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()} className={submitBtn}>
              {mutation.isPending ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Mark Payment Modal (collector only) ──────────────────────────────────────

function MarkPaymentModal({
  groupId, members, onClose,
}: { groupId: number; members: ThriftMember[]; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ member_id: '', period_date: '', amount: '', notes: '' });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/thrift/${groupId}/payments/`, {
      member_id: Number(form.member_id),
      period_date: form.period_date,
      amount: form.amount,
      notes: form.notes.trim(),
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['thrift-payments', groupId] }); onClose(); },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setErr(d?.detail ?? (Array.isArray(first) ? first[0] : String(first ?? 'Something went wrong.')));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.member_id) { setErr('Select a member.'); return; }
    if (!form.period_date) { setErr('Enter the payment date.'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setErr('Enter a valid amount.'); return; }
    mutation.mutate();
  }

  const approved = members.filter(m => m.status === 'approved');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Mark Payment</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <Field label="Member *">
            <select value={form.member_id} onChange={(e) => { setForm(f => ({ ...f, member_id: e.target.value })); setErr(''); }} className={inputCls}>
              <option value="">Select member…</option>
              {approved.map(m => (
                <option key={m.id} value={m.id}>{m.user.full_name} — {formatCurrency(m.personal_amount)}</option>
              ))}
            </select>
          </Field>
          <Field label="Period Date *">
            <input type="date" value={form.period_date} onChange={(e) => setForm(f => ({ ...f, period_date: e.target.value }))} className={inputCls} />
          </Field>
          <Field label="Amount (NGN) *">
            <input type="number" min="1" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="e.g. 5000" className={inputCls} />
          </Field>
          <Field label="Notes (optional)">
            <input type="text" value={form.notes} onChange={(e) => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Optional notes" className={inputCls} />
          </Field>
          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button type="submit" disabled={mutation.isPending} className={submitBtn}>
              {mutation.isPending ? 'Marking…' : 'Mark Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Dispute Modal (payer only) ────────────────────────────────────────────────

function DisputeModal({
  groupId, paymentId, onClose,
}: { groupId: number; paymentId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');

  // Audio recording state
  const MAX_SECONDS = 60;
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [micError, setMicError] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(MAX_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  // Tick countdown while recording
  useEffect(() => {
    if (!recording) return;
    setSecondsLeft(MAX_SECONDS);
    timerRef.current = setInterval(() => {
      setSecondsLeft(s => {
        if (s <= 1) {
          clearInterval(timerRef.current!);
          recorderRef.current?.stop();
          setRecording(false);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [recording]);

  const startRecording = async () => {
    setMicError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: BlobPart[] = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        stream.getTracks().forEach(t => t.stop());
      };
      recorder.start();
      recorderRef.current = recorder;
      setMediaRecorder(recorder);
      setRecording(true);
    } catch {
      setMicError('Microphone access denied. Please allow microphone access or type your reason instead.');
    }
  };

  const stopRecording = () => {
    clearInterval(timerRef.current!);
    mediaRecorder?.stop();
    setRecording(false);
  };

  const clearAudio = () => {
    if (audioUrl) URL.revokeObjectURL(audioUrl);
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const canSubmit = (reason.trim().length > 0 || audioBlob != null);

  const mutation = useMutation<any, Error, void>({
    mutationFn: () => {
      if (audioBlob) {
        const fd = new FormData();
        if (reason.trim()) fd.append('reason', reason.trim());
        fd.append('dispute_audio', audioBlob, 'dispute.webm');
        return api.post(`/thrift/${groupId}/payments/${paymentId}/dispute/`, fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
      return api.post(`/thrift/${groupId}/payments/${paymentId}/dispute/`, { reason });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-payments', groupId] });
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      onClose();
    },
    onError: (e: any) => setErr(e.response?.data?.reason?.[0] ?? e.response?.data?.detail ?? 'Dispute failed.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Dispute Payment</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-(--text-secondary)">Describe why this payment record is incorrect. You can type a reason, record a voice note, or both.</p>

          <Field label="Reason (optional if you record audio)">
            <textarea rows={3} value={reason} onChange={(e) => { setReason(e.target.value); setErr(''); }} placeholder="e.g. I did not make this payment on this date" className={inputCls} />
          </Field>

          {/* Voice note section */}
          <div className="space-y-2">
            <p className="text-sm font-semibold text-(--text-secondary)">Voice note (optional)</p>

            {micError && (
              <p className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2">{micError}</p>
            )}

            {!audioUrl ? (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={recording ? stopRecording : startRecording}
                  className={clsx(
                    'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors',
                    recording
                      ? 'bg-red-600 text-white hover:bg-red-700 animate-pulse'
                      : 'bg-(--bg) border border-(--border) text-(--text-secondary) hover:text-teal-600 hover:border-teal-300',
                  )}
                >
                  <span className={clsx('inline-block w-2.5 h-2.5 rounded-full', recording ? 'bg-white' : 'bg-red-500')} />
                  {recording ? `Stop recording (${secondsLeft}s left)` : 'Record voice note'}
                </button>
                {recording && secondsLeft <= 10 && (
                  <p className="text-xs text-red-600 font-semibold">Recording stops automatically in {secondsLeft}s</p>
                )}
                {!recording && (
                  <p className="text-xs text-(--text-muted)">Max 60 seconds</p>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <audio src={audioUrl} controls className="w-full h-10 rounded-lg" />
                <button
                  type="button"
                  onClick={clearAudio}
                  className="text-xs text-red-600 hover:text-red-700 font-semibold"
                >
                  Remove audio
                </button>
              </div>
            )}
          </div>

          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button
              type="button"
              disabled={!canSubmit || mutation.isPending}
              onClick={() => mutation.mutate()}
              className="flex-1 rounded-lg bg-red-600 text-white py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {mutation.isPending ? 'Submitting…' : 'Submit Dispute'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Dispute Detail Modal (read-only viewer for collector / org admin) ─────────

function DisputeDetailModal({
  payment, onClose,
}: { payment: ThriftPayment; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Dispute Details</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)">
            <XCircleIcon className="h-6 w-6" aria-hidden="true" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          {/* Payment info */}
          <div className="rounded-xl bg-(--bg) border border-(--border) px-4 py-3 grid grid-cols-2 gap-2 text-sm">
            <div>
              <p className="text-(--text-muted) text-xs font-medium">Member</p>
              <p className="font-semibold text-(--text-primary) mt-0.5">{payment.member_name}</p>
            </div>
            <div>
              <p className="text-(--text-muted) text-xs font-medium">Amount</p>
              <p className="font-semibold text-(--text-primary) mt-0.5">{formatCurrency(payment.amount)}</p>
            </div>
            <div>
              <p className="text-(--text-muted) text-xs font-medium">Period</p>
              <p className="font-semibold text-(--text-primary) mt-0.5">{payment.period_date}</p>
            </div>
            {payment.disputed_at && (
              <div>
                <p className="text-(--text-muted) text-xs font-medium">Disputed at</p>
                <p className="font-semibold text-(--text-primary) mt-0.5">
                  {new Date(payment.disputed_at).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            )}
          </div>

          {/* Reason */}
          <div>
            <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-1">Dispute Reason</p>
            <p className="text-sm text-(--text-primary) bg-red-50 border border-red-100 rounded-lg px-4 py-3 leading-relaxed">
              {payment.dispute_reason || <span className="italic text-(--text-muted)">No reason provided.</span>}
            </p>
          </div>

          {/* Voice note */}
          {payment.dispute_audio ? (
            <div>
              <p className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wide mb-2">Voice Note</p>
              <audio
                controls
                src={payment.dispute_audio}
                className="w-full rounded-lg"
                style={{ accentColor: '#dc2626' }}
              >
                Your browser does not support audio playback.
              </audio>
            </div>
          ) : (
            <p className="text-xs text-(--text-muted) italic">No voice note attached.</p>
          )}

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Report Collector Modal (payer only) ──────────────────────────────────────

function ReportCollectorModal({ groupId, onClose }: { groupId: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [reason, setReason] = useState('');
  const [err, setErr] = useState('');
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: () => api.post(`/thrift/${groupId}/report/`, { reason }),
    onSuccess: () => { setSuccess(true); qc.invalidateQueries({ queryKey: ['thrift-group', groupId] }); },
    onError: (e: any) => setErr(e.response?.data?.reason?.[0] ?? e.response?.data?.detail ?? 'Report failed.'),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Report Collector</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>
        <div className="p-6 space-y-4">
          {success ? (
            <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-200 px-4 py-4">
              <CheckCircleIcon className="h-6 w-6 text-green-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-green-800">Report submitted</p>
                <p className="text-sm text-green-700 mt-0.5">The organisation admin has been notified.</p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-(--text-secondary)">Describe the issue with this collector. This will be sent to the organisation admin for review.</p>
              <div>
                <label className="block text-sm font-semibold text-(--text-secondary) mb-1">Reason *</label>
                <textarea
                  rows={3}
                  value={reason}
                  onChange={e => { setReason(e.target.value); setErr(''); }}
                  placeholder="Describe what happened…"
                  className={inputCls}
                />
              </div>
              {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
              <div className="flex gap-3">
                <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
                <button
                  type="button"
                  disabled={!reason.trim() || mutation.isPending}
                  onClick={() => mutation.mutate()}
                  className="flex-1 rounded-lg bg-red-600 text-white py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
                >
                  {mutation.isPending ? 'Submitting…' : 'Submit Report'}
                </button>
              </div>
            </>
          )}
          {success && (
            <button type="button" onClick={onClose} className={cancelBtn}>Close</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Start Cycle Modal (collector only) ───────────────────────────────────────

function StartCycleModal({ groupId, cycleNumber, onClose }: { groupId: number; cycleNumber: number; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ start_date: '', end_date: '' });
  const [err, setErr] = useState('');

  const mutation = useMutation({
    mutationFn: () => api.post(`/thrift/${groupId}/cycles/restart/`, { start_date: form.start_date || undefined, end_date: form.end_date || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-cycles', groupId] });
      qc.invalidateQueries({ queryKey: ['thrift-group', groupId] });
      onClose();
    },
    onError: (e: any) => {
      const d = e.response?.data;
      setErr(d?.detail ?? d?.start_date?.[0] ?? d?.end_date?.[0] ?? 'Failed to start cycle.');
    },
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-(--border)">
          <h2 className="text-lg font-bold text-(--text-primary)">Start Cycle #{cycleNumber}</h2>
          <button type="button" onClick={onClose} aria-label="Close dialog" className="text-(--text-muted) hover:text-(--text-primary)"><XCircleIcon className="h-6 w-6" aria-hidden="true" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start Date">
              <input type="date" value={form.start_date} onChange={(e) => setForm(f => ({ ...f, start_date: e.target.value }))} className={inputCls} />
            </Field>
            <Field label="End Date (optional)">
              <input type="date" value={form.end_date} onChange={(e) => setForm(f => ({ ...f, end_date: e.target.value }))} className={inputCls} />
            </Field>
          </div>
          {err && <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className={cancelBtn}>Cancel</button>
            <button type="button" disabled={mutation.isPending} onClick={() => mutation.mutate()} className={submitBtn}>
              {mutation.isPending ? 'Starting…' : 'Start Cycle'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

type Tab = 'payments' | 'members' | 'cycles';

export default function ThriftGroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const groupId = Number(id);
  const qc = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);

  const [activeTab, setActiveTab] = useState<Tab>('payments');
  const [memberSubTab, setMemberSubTab] = useState<'approved' | 'pending'>('approved');
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle');
  const [showSettings, setShowSettings] = useState(false);
  const [showMarkPayment, setShowMarkPayment] = useState(false);
  const [disputePaymentId, setDisputePaymentId] = useState<number | null>(null);
  const [viewDisputePayment, setViewDisputePayment] = useState<ThriftPayment | null>(null);
  const [showStartCycle, setShowStartCycle] = useState(false);
  const [showReportCollector, setShowReportCollector] = useState(false);

  const [groupQ, membersQ, paymentsQ, cyclesQ] = useQueries({
    queries: [
      {
        queryKey: ['thrift-group', groupId],
        queryFn: () => api.get(`/thrift/${groupId}/`).then(r => r.data as ThriftGroup),
      },
      {
        queryKey: ['thrift-members', groupId],
        queryFn: () => api.get(`/thrift/${groupId}/members/`).then(r => r.data as ThriftMember[]),
      },
      {
        queryKey: ['thrift-payments', groupId],
        queryFn: () => api.get(`/thrift/${groupId}/payments/`).then(r => r.data as ThriftPayment[]),
      },
      {
        queryKey: ['thrift-cycles', groupId],
        queryFn: () => api.get(`/thrift/${groupId}/cycles/`).then(r => r.data as ThriftCycle[]),
      },
    ],
  });

  const group = groupQ.data;
  const members = membersQ.data ?? [];
  const payments = paymentsQ.data ?? [];
  const cycles = cyclesQ.data ?? [];

  const isCollector = currentUser?.id === group?.collector?.id;
  const isOrgAdmin = group?.is_org_admin ?? false;

  // Find current user's member record (payer perspective)
  const myMembership = members.find(m => m.user.id === currentUser?.id);

  async function copyInviteCode() {
    if (!group) return;
    await navigator.clipboard.writeText(group.invite_code);
    setCopyState('copied');
    setTimeout(() => setCopyState('idle'), 2000);
  }

  const regenMutation = useMutation({
    mutationFn: () => api.post(`/thrift/${groupId}/invite/regenerate/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thrift-group', groupId] }),
  });

  const endCycleMutation = useMutation({
    mutationFn: (cycleId: number) => api.post(`/thrift/${groupId}/cycles/end/`, { cycle_id: cycleId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['thrift-cycles', groupId] });
      qc.invalidateQueries({ queryKey: ['thrift-group', groupId] });
    },
  });

  const confirmPaymentMutation = useMutation({
    mutationFn: (paymentId: number) => api.post(`/thrift/${groupId}/payments/${paymentId}/confirm/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thrift-payments', groupId] }),
  });

  const memberActionMutation = useMutation({
    mutationFn: ({ memberId, action }: { memberId: number; action: string }) =>
      api.patch(`/thrift/${groupId}/members/${memberId}/`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thrift-members', groupId] }),
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (paymentId: number) => api.delete(`/thrift/${groupId}/payments/${paymentId}/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thrift-payments', groupId] }),
  });

  const kycToggleMutation = useMutation({
    mutationFn: (memberId: number) => api.patch(`/thrift/${groupId}/members/${memberId}/kyc/`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['thrift-members', groupId] }),
  });

  if (groupQ.isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-(--border) rounded skeleton w-48" />
        <div className="h-32 bg-(--border) rounded-xl skeleton" />
      </div>
    );
  }

  if (groupQ.error || !group) {
    return (
      <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
        Group not found or you do not have access.{' '}
        <Link to="/thrift" className="underline">Back to groups</Link>
      </div>
    );
  }

  const activeCycle = group.active_cycle;
  const pendingMembers = members.filter(m => m.status === 'pending' || m.status === 'amount_pending');
  const approvedMembers = members.filter(m => m.status === 'approved');

  const tabs: { key: Tab; label: string }[] = [
    { key: 'payments', label: 'Payments' },
    { key: 'members', label: isCollector ? `Members (${pendingMembers.length > 0 ? `${approvedMembers.length} + ${pendingMembers.length} pending` : approvedMembers.length})` : 'Members' },
    { key: 'cycles', label: 'Cycles' },
  ];

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link to="/thrift" className="text-sm text-(--text-secondary) hover:text-teal-600">← All Thrift Groups</Link>

      {/* Header card */}
      <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-6 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-(--text-primary)">{group.name}</h1>
              {group.is_on_trial && <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full">Trial</span>}
              {!group.is_on_trial && group.is_subscription_active && <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">Active</span>}
            </div>
            <p className="text-sm text-(--text-secondary) capitalize mt-0.5">
              {group.frequency} · {group.cycle_type === 'rolling' ? 'Rolling cycle' : 'Fixed cycle'}
              {group.organization && ` · ${group.organization.name}`}
            </p>
            {group.description && <p className="text-sm text-(--text-secondary) mt-1">{group.description}</p>}
          </div>

          <div className="flex items-center gap-2">
            {!isCollector && group.organization && (
              <button
                type="button"
                onClick={() => setShowReportCollector(true)}
                className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-1.5 hover:bg-red-100 transition-colors"
              >
                Report Collector
              </button>
            )}
            {isCollector && (
              <button type="button" onClick={() => setShowSettings(true)} className="p-2 rounded-lg border border-(--border) text-(--text-secondary) hover:text-teal-600 hover:border-teal-300 transition-colors" title="Settings">
                <Cog6ToothIcon className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>

        {/* Active cycle badge */}
        {activeCycle ? (
          <div className="flex items-center gap-2 text-sm">
            <span className="bg-teal-50 text-teal-700 px-2.5 py-1 rounded-full text-xs font-semibold">
              Cycle #{activeCycle.cycle_number} active
            </span>
            {activeCycle.start_date && <span className="text-(--text-secondary)">Started {fmt(activeCycle.start_date)}</span>}
            {activeCycle.end_date && <span className="text-(--text-secondary)">· Ends {fmt(activeCycle.end_date)}</span>}
          </div>
        ) : (
          <p className="text-sm text-amber-600 bg-amber-50 rounded-lg px-3 py-2 inline-block">No active cycle</p>
        )}

        {/* My membership info (payer) */}
        {!isCollector && myMembership && (
          <div className="bg-(--bg) rounded-lg border border-(--border) px-4 py-3 text-sm">
            <span className="text-(--text-secondary)">My contribution: </span>
            <span className="font-semibold text-(--text-primary)">{formatCurrency(myMembership.personal_amount)}</span>
            <span className="mx-2 text-(--text-secondary)">·</span>
            <span className="text-(--text-secondary)">Total saved: </span>
            <span className="font-semibold text-(--text-primary)">{formatCurrency(myMembership.total_saved)}</span>
            <span className="mx-2 text-(--text-secondary)">·</span>
            <MemberStatusBadge status={myMembership.status} />
            {myMembership.flag_reason && (
              <p className="mt-1 text-amber-700">{myMembership.flag_reason}</p>
            )}
          </div>
        )}

        {/* Invite code (collector only) */}
        {isCollector && (
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 bg-(--bg) border border-(--border) rounded-lg px-3 py-2">
              <span className="text-xs text-(--text-secondary) font-medium uppercase tracking-wide">Invite Code</span>
              <span className="font-mono font-bold text-(--text-primary) tracking-widest">{group.invite_code}</span>
              <button type="button" onClick={copyInviteCode} className="ml-1 text-teal-600 hover:text-teal-700" title="Copy">
                {copyState === 'copied' ? <span className="text-xs font-semibold">Copied!</span> : <ClipboardDocumentIcon className="h-4 w-4" />}
              </button>
            </div>
            <button
              type="button"
              onClick={() => regenMutation.mutate()}
              disabled={regenMutation.isPending}
              className="flex items-center gap-1 text-xs text-(--text-secondary) hover:text-teal-600 transition-colors"
            >
              <ArrowPathIcon className={clsx('h-4 w-4', regenMutation.isPending && 'animate-spin')} />
              Regenerate
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-(--border)">
        <nav className="flex gap-1">
          {tabs.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              className={clsx(
                'px-4 py-2 text-sm font-semibold border-b-2 transition-colors whitespace-nowrap',
                activeTab === t.key
                  ? 'border-teal-600 text-teal-600'
                  : 'border-transparent text-(--text-secondary) hover:text-(--text-primary)',
              )}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </div>

      {/* ── Payments Tab ── */}
      {activeTab === 'payments' && (
        <div className="space-y-4">
          {isCollector && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowMarkPayment(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-700 transition-colors"
              >
                + Mark Payment
              </button>
            </div>
          )}

          <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-(--border)">
                <thead className="bg-(--bg)">
                  <tr>
                    {['Member', 'Period Date', 'Amount', 'Status', 'Actions'].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border)">
                  {paymentsQ.isLoading ? (
                    <SkeletonTable rows={4} cols={5} />
                  ) : payments.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                        No payments recorded yet.
                        {isCollector && (
                          <> <button type="button" onClick={() => setShowMarkPayment(true)} className="text-teal-600 font-semibold hover:underline">Mark the first payment.</button></>
                        )}
                      </td>
                    </tr>
                  ) : (
                    payments.map(p => {
                      const isMyPayment = myMembership && p.member === myMembership.id;
                      return (
                        <tr key={p.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">{p.member_name}</td>
                          <td className="px-6 py-4 text-sm text-(--text-secondary)">{fmt(p.period_date)}</td>
                          <td className="px-6 py-4 text-sm text-(--text-secondary)">{formatCurrency(p.amount)}</td>
                          <td className="px-6 py-4"><PaymentStatusBadge status={p.status} /></td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              {/* Payer actions */}
                              {isMyPayment && p.status === 'pending' && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => confirmPaymentMutation.mutate(p.id)}
                                    disabled={confirmPaymentMutation.isPending}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 hover:bg-green-100 transition-colors"
                                  >
                                    <CheckCircleIcon className="h-3.5 w-3.5" /> Confirm
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDisputePaymentId(p.id)}
                                    className="inline-flex items-center gap-1 text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-100 transition-colors"
                                  >
                                    <ExclamationCircleIcon className="h-3.5 w-3.5" /> Dispute
                                  </button>
                                </>
                              )}
                              {p.status === 'disputed' && (
                                <button
                                  type="button"
                                  onClick={() => setViewDisputePayment(p)}
                                  className="text-xs text-red-600 italic hover:underline text-left truncate max-w-[12rem]"
                                  title="Click to view dispute details"
                                >
                                  {p.dispute_reason || 'Disputed'} — View details
                                </button>
                              )}
                              {/* Collector can delete */}
                              {isCollector && (
                                <button
                                  type="button"
                                  onClick={() => { if (confirm('Delete this payment record?')) deletePaymentMutation.mutate(p.id); }}
                                  disabled={deletePaymentMutation.isPending}
                                  className="text-xs text-(--text-muted) hover:text-red-600 transition-colors"
                                >
                                  Delete
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Members Tab ── */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {isCollector && (
            <div className="flex gap-2">
              {(['approved', 'pending'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setMemberSubTab(t)}
                  className={clsx(
                    'px-4 py-1.5 rounded-full text-sm font-semibold transition-colors',
                    memberSubTab === t ? 'bg-teal-600 text-white' : 'bg-(--bg) text-(--text-secondary) hover:text-(--text-primary) border border-(--border)',
                  )}
                >
                  {t === 'approved' ? `Approved (${approvedMembers.length})` : `Pending (${pendingMembers.length})`}
                </button>
              ))}
            </div>
          )}

          <div className="bg-(--surface) rounded-xl border border-(--border) shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-(--border)">
                <thead className="bg-(--bg)">
                  <tr>
                    {['Name', 'Amount / Period', 'Total Saved', 'Joined', 'Status',
                      ...(isCollector && memberSubTab === 'pending' ? ['Actions'] : []),
                      ...(isOrgAdmin ? ['KYC'] : []),
                    ].map(h => (
                      <th key={h} className="px-6 py-3 text-left text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border)">
                  {membersQ.isLoading ? (
                    <SkeletonTable rows={3} cols={(isCollector && memberSubTab === 'pending' ? 6 : 5) + (isOrgAdmin ? 1 : 0)} />
                  ) : (
                    (() => {
                      const list = isCollector
                        ? (memberSubTab === 'approved' ? approvedMembers : pendingMembers)
                        : members;
                      if (list.length === 0) {
                        return (
                          <tr>
                            <td colSpan={(isCollector && memberSubTab === 'pending' ? 6 : 5) + (isOrgAdmin ? 1 : 0)} className="px-6 py-12 text-center text-sm text-(--text-muted)">
                              {memberSubTab === 'pending' ? 'No pending member requests.' : 'No members yet.'}
                            </td>
                          </tr>
                        );
                      }
                      return list.map(m => (
                        <tr key={m.id} className="hover:bg-(--primary-tint)/30 transition-colors">
                          <td className="px-6 py-4 text-sm font-medium text-(--text-primary)">
                            {m.user.full_name}
                            {m.flag_reason && <p className="text-xs text-amber-600 mt-0.5">{m.flag_reason}</p>}
                          </td>
                          <td className="px-6 py-4 text-sm text-(--text-secondary)">{formatCurrency(m.personal_amount)}</td>
                          <td className="px-6 py-4 text-sm text-(--text-secondary)">{formatCurrency(m.total_saved)}</td>
                          <td className="px-6 py-4 text-sm text-(--text-secondary)">{fmt(m.joined_at)}</td>
                          <td className="px-6 py-4"><MemberStatusBadge status={m.status} /></td>
                          {isCollector && memberSubTab === 'pending' && (
                            <td className="px-6 py-4">
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  onClick={() => memberActionMutation.mutate({ memberId: m.id, action: 'approve' })}
                                  disabled={memberActionMutation.isPending}
                                  className="text-xs font-semibold text-green-700 bg-green-50 border border-green-200 rounded-lg px-2.5 py-1 hover:bg-green-100 transition-colors"
                                >
                                  Approve
                                </button>
                                <button
                                  type="button"
                                  onClick={() => memberActionMutation.mutate({ memberId: m.id, action: 'reject' })}
                                  disabled={memberActionMutation.isPending}
                                  className="text-xs font-semibold text-red-700 bg-red-50 border border-red-200 rounded-lg px-2.5 py-1 hover:bg-red-100 transition-colors"
                                >
                                  Reject
                                </button>
                              </div>
                            </td>
                          )}
                          {isOrgAdmin && (
                            <td className="px-6 py-4">
                              <button
                                type="button"
                                disabled={kycToggleMutation.isPending}
                                onClick={() => kycToggleMutation.mutate(m.id)}
                                className={clsx(
                                  'text-xs font-semibold rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50',
                                  m.user.is_kyc_verified
                                    ? 'text-green-700 bg-green-50 border border-green-200 hover:bg-green-100'
                                    : 'text-(--text-secondary) bg-(--bg) border border-(--border) hover:bg-(--primary-tint)/30',
                                )}
                              >
                                {m.user.is_kyc_verified ? 'KYC ✓' : 'Set KYC'}
                              </button>
                            </td>
                          )}
                        </tr>
                      ));
                    })()
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── Cycles Tab ── */}
      {activeTab === 'cycles' && (
        <div className="space-y-4">
          {isCollector && !activeCycle && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowStartCycle(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 text-white px-4 py-2 text-sm font-semibold hover:bg-teal-700 transition-colors"
              >
                + Start New Cycle
              </button>
            </div>
          )}

          {cyclesQ.isLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => <div key={i} className="h-20 bg-(--border) rounded-xl skeleton" />)}
            </div>
          ) : cycles.length === 0 ? (
            <p className="text-center text-sm text-(--text-muted) py-12">No cycles yet.</p>
          ) : (
            <div className="space-y-3">
              {[...cycles].reverse().map(c => (
                <div key={c.id} className="bg-(--surface) rounded-xl border border-(--border) shadow-sm p-4 flex items-center justify-between gap-4 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-(--text-primary)">Cycle #{c.cycle_number}</span>
                      <span className={clsx(
                        'text-xs font-semibold px-2 py-0.5 rounded-full',
                        c.status === 'active' ? 'bg-teal-100 text-teal-700' : 'bg-(--bg) text-(--text-secondary)',
                      )}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-sm text-(--text-secondary) mt-0.5">
                      {fmt(c.start_date)} {c.end_date ? `→ ${fmt(c.end_date)}` : '(open-ended)'}
                    </p>
                    {c.ended_at && <p className="text-xs text-(--text-secondary) mt-0.5">Ended {fmt(c.ended_at)}</p>}
                  </div>
                  {isCollector && c.status === 'active' && (
                    <button
                      type="button"
                      onClick={() => { if (confirm(`End Cycle #${c.cycle_number}?`)) endCycleMutation.mutate(c.id); }}
                      disabled={endCycleMutation.isPending}
                      className="text-sm font-semibold text-(--text-secondary) border border-(--border) rounded-lg px-4 py-2 hover:bg-(--primary-tint)/30 transition-colors disabled:opacity-50"
                    >
                      End Cycle
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {showSettings && group && <SettingsModal groupId={groupId} group={group} onClose={() => setShowSettings(false)} />}
      {showMarkPayment && <MarkPaymentModal groupId={groupId} members={members} onClose={() => setShowMarkPayment(false)} />}
      {disputePaymentId != null && (
        <DisputeModal groupId={groupId} paymentId={disputePaymentId} onClose={() => setDisputePaymentId(null)} />
      )}
      {showStartCycle && (
        <StartCycleModal
          groupId={groupId}
          cycleNumber={(cycles[cycles.length - 1]?.cycle_number ?? 0) + 1}
          onClose={() => setShowStartCycle(false)}
        />
      )}
      {showReportCollector && (
        <ReportCollectorModal groupId={groupId} onClose={() => setShowReportCollector(false)} />
      )}
      {viewDisputePayment && (
        <DisputeDetailModal payment={viewDisputePayment} onClose={() => setViewDisputePayment(null)} />
      )}
    </div>
  );
}
