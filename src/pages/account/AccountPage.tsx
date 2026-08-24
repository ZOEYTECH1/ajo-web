import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CameraIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import useAuthStore from '../../store/useAuthStore';
import { getMe, logout } from '../../services/authService';
import api from '../../services/api';
import type { User } from '../../services/authService';

interface ProfileUpdatePayload {
  first_name: string;
  last_name: string;
  phone_number: string;
}

export default function AccountPage() {
  const navigate = useNavigate();
  const { setUser, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoErr, setPhotoErr] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [pwForm, setPwForm] = useState({ current: '', next: '', confirm: '' });
  const [pwErr, setPwErr] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);

  const { data: user } = useQuery<User>({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const [form, setForm] = useState<ProfileUpdatePayload>({
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
      });
    }
  }, [user]);

  // ── Profile update ────────────────────────────────────────────────────────────

  const updateMutation = useMutation({
    mutationFn: async (payload: ProfileUpdatePayload) => {
      const response = await api.patch<User>('/auth/me/', payload);
      return response.data;
    },
    onSuccess: (updated) => {
      setUser(updated);
      queryClient.setQueryData(['me'], updated);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(form);
  };

  // ── Photo upload ──────────────────────────────────────────────────────────────

  const photoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await api.post<{ profile_photo: string }>('/auth/profile-photo/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['me'] });
      setPhotoErr('');
    },
    onError: (e: any) => {
      setPhotoErr(e.response?.data?.detail ?? e.response?.data?.photo?.[0] ?? 'Failed to upload photo.');
    },
  });

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    photoMutation.mutate(file);
  }

  // ── Change password ───────────────────────────────────────────────────────────

  const changePwMutation = useMutation({
    mutationFn: (payload: { current_password: string; new_password: string }) =>
      api.post('/auth/change-password/', payload),
    onSuccess: () => {
      setPwForm({ current: '', next: '', confirm: '' });
      setPwErr('');
      setPwSuccess(true);
      setTimeout(() => setPwSuccess(false), 3000);
    },
    onError: (e: any) => {
      setPwErr(e.response?.data?.detail ?? 'Failed to change password.');
    },
  });

  function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwErr('');
    if (pwForm.next !== pwForm.confirm) {
      setPwErr('New passwords do not match.');
      return;
    }
    if (pwForm.next.length < 8) {
      setPwErr('New password must be at least 8 characters.');
      return;
    }
    changePwMutation.mutate({ current_password: pwForm.current, new_password: pwForm.next });
  }

  // ── Delete account ────────────────────────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: () => api.delete('/auth/me/'),
    onSuccess: async () => {
      try { await logout(); } catch { /* ignore */ }
      clearAuth();
      navigate('/login', { replace: true });
    },
  });

  // ── Display helpers ───────────────────────────────────────────────────────────

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : '';

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-(--text-primary)">Account</h1>
        <p className="text-sm text-(--text-secondary)">Manage your profile information</p>
      </div>

      {/* Avatar + photo upload */}
      <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-6">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            {user?.profile_photo_url ? (
              <img
                src={user.profile_photo_url}
                alt={displayName}
                className="h-20 w-20 rounded-full object-cover border-2 border-(--border)"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-2xl font-bold border-2 border-(--border)">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoMutation.isPending}
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-orange-600 text-white flex items-center justify-center shadow hover:bg-orange-700 disabled:opacity-50 transition-colors"
              title="Upload photo"
            >
              {photoMutation.isPending ? (
                <span className="block h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <CameraIcon className="h-3.5 w-3.5" />
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
          </div>
          <div>
            <p className="font-semibold text-(--text-primary) text-lg">{displayName}</p>
            <p className="text-sm text-(--text-secondary)">{user?.email}</p>
            <p className="text-xs text-(--text-muted) mt-0.5 capitalize">
              {user?.role ?? 'Member'} ·{' '}
              {user?.is_email_verified ? (
                <span className="text-green-600">Email verified</span>
              ) : (
                <span className="text-yellow-600">Email not verified</span>
              )}
            </p>
            {!user?.profile_photo_url && (
              <p className="text-xs text-orange-600 mt-1">
                Add a profile photo — required to join groups.
              </p>
            )}
          </div>
        </div>
        {photoErr && (
          <p className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{photoErr}</p>
        )}
      </div>

      {/* Edit form */}
      <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-6">
        <h2 className="text-base font-semibold text-(--text-primary) mb-4">Personal Information</h2>

        {saveSuccess && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Profile updated successfully.
          </div>
        )}

        {updateMutation.isError && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            Failed to update profile. Please try again.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First name"
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
            />
            <Input
              label="Last name"
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
            />
          </div>

          <Input
            label="Email address"
            name="email"
            type="email"
            value={user?.email ?? ''}
            onChange={() => {}}
            disabled
          />

          <Input
            label="Phone number"
            name="phone_number"
            type="tel"
            value={form.phone_number}
            onChange={handleChange}
          />

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={updateMutation.isPending}>
              Save changes
            </Button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-6">
        <h2 className="text-base font-semibold text-(--text-primary) mb-4">Change Password</h2>

        {pwSuccess && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Password changed successfully.
          </div>
        )}
        {pwErr && (
          <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {pwErr}
          </div>
        )}

        <form onSubmit={handlePwSubmit} className="space-y-4">
          <Input
            label="Current password"
            name="current"
            type="password"
            value={pwForm.current}
            onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
            autoComplete="current-password"
          />
          <Input
            label="New password"
            name="next"
            type="password"
            value={pwForm.next}
            onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
            autoComplete="new-password"
          />
          <Input
            label="Confirm new password"
            name="confirm"
            type="password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
            autoComplete="new-password"
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={changePwMutation.isPending}>
              Change password
            </Button>
          </div>
        </form>
      </div>

      {/* Active modules */}
      {user?.selectedModules && user.selectedModules.length > 0 && (
        <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-6">
          <h2 className="text-base font-semibold text-(--text-primary) mb-3">Active Modules</h2>
          <div className="flex flex-wrap gap-2">
            {user.selectedModules.map((mod) => (
              <span
                key={mod}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-50 text-orange-700 capitalize"
              >
                {mod}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Privacy & Terms */}
      <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-6">
        <h2 className="text-base font-semibold text-(--text-primary) mb-3">Legal</h2>
        <Link
          to="/account/privacy"
          className="text-sm text-(--primary) hover:underline font-medium"
        >
          Privacy Policy &amp; Terms of Service →
        </Link>
      </div>

      {/* Danger zone */}
      <div className="bg-(--surface) rounded-xl border border-red-200 dark:border-red-900 p-6">
        <h2 className="text-base font-semibold text-red-700 dark:text-red-400 mb-1">Danger Zone</h2>
        <p className="text-sm text-(--text-secondary) mb-4">
          Permanently delete your account. This cannot be undone — all your data will be removed.
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          Delete my account
        </button>
      </div>

      {/* Delete confirm modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-(--surface) rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-(--text-primary)">Delete Account</h3>
              <button type="button" onClick={() => setShowDeleteConfirm(false)} className="text-(--text-muted) hover:text-(--text-primary)">
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>
            <p className="text-sm text-(--text-secondary)">
              Are you sure you want to delete your account? This action is{' '}
              <span className="font-semibold text-red-600">permanent and cannot be reversed</span>.
            </p>
            {deleteMutation.isError && (
              <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
                Failed to delete account. Please try again.
              </p>
            )}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate()}
                className="flex-1 rounded-lg bg-red-600 text-white py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {deleteMutation.isPending ? 'Deleting…' : 'Yes, delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
