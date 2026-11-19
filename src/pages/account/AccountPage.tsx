import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CameraIcon } from '@heroicons/react/24/outline';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import useAuthStore from '../../store/useAuthStore';
import { getMe, logout } from '../../services/authService';
import api from '../../services/api';
import type { User } from '../../services/authService';
import { cloudinaryUrl } from '../../lib/cloudinary';

interface ProfileUpdatePayload {
  first_name: string;
  last_name: string;
  phone_number: string;
}

export default function AccountPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { setUser, clearAuth } = useAuthStore();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [photoErr, setPhotoErr] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveErr, setSaveErr] = useState('');

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
        phone_number: user.phone_number ?? '',
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
      setSaveErr('');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    },
    onError: (e: any) => {
      const d = e.response?.data;
      const first = Object.values(d ?? {})[0];
      setSaveErr(d?.detail ?? (Array.isArray(first) ? (first as string[])[0] : String(first ?? t('account.failedUpdateProfile'))));
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaveErr('');
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
      setPhotoErr(e.response?.data?.detail ?? e.response?.data?.photo?.[0] ?? t('account.failedUpdateProfile'));
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
      setPwErr(e.response?.data?.detail ?? t('account.failedChangePassword'));
    },
  });

  function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPwErr('');
    if (pwForm.next !== pwForm.confirm) {
      setPwErr(t('account.passwordMismatch'));
      return;
    }
    if (pwForm.next.length < 8) {
      setPwErr(t('account.passwordTooShort'));
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
        <h1 className="text-2xl font-bold text-(--text-primary)">{t('account.title')}</h1>
        <p className="text-sm text-(--text-secondary)">{t('account.subtitle')}</p>
      </div>

      {/* Avatar + photo upload */}
      <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-6">
        <div className="flex items-center gap-5">
          <div className="relative shrink-0">
            {user?.profile_photo ? (
              <img
                src={cloudinaryUrl(user.profile_photo!, 240, 240)}
                alt={displayName}
                className="h-20 w-20 rounded-full object-cover border-2 border-(--border)"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-(--primary-light)/30 text-(--primary) flex items-center justify-center text-2xl font-bold border-2 border-(--border)">
                {initials}
              </div>
            )}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={photoMutation.isPending}
              className="absolute -bottom-1 -right-1 h-7 w-7 rounded-full bg-(--accent) text-white flex items-center justify-center shadow hover:bg-(--accent-dark) disabled:opacity-50 transition-colors"
              title={t('account.uploadPhoto')}
              aria-label={t('account.uploadProfilePhotoA11y')}
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
              {user?.role ?? t('account.defaultRole')} ·{' '}
              {user?.is_email_verified ? (
                <span className="text-green-600">{t('account.emailVerified')}</span>
              ) : (
                <span className="text-yellow-600">{t('account.emailNotVerified')}</span>
              )}
            </p>
            {!user?.profile_photo && (
              <p className="text-xs text-(--primary) mt-1">
                {t('account.addPhotoHint')}
              </p>
            )}
          </div>
        </div>
        {photoErr && (
          <p role="alert" className="mt-3 text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{photoErr}</p>
        )}
      </div>

      {/* Edit form */}
      <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-6">
        <h2 className="text-base font-semibold text-(--text-primary) mb-4">{t('account.personalInfo')}</h2>

        {saveSuccess && (
          <div role="status" className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {t('account.profileUpdated')}
          </div>
        )}

        {saveErr && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {saveErr}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input
              label={t('account.firstNameLabel')}
              name="first_name"
              value={form.first_name}
              onChange={handleChange}
            />
            <Input
              label={t('account.lastNameLabel')}
              name="last_name"
              value={form.last_name}
              onChange={handleChange}
            />
          </div>

          <Input
            label={t('account.emailLabel')}
            name="email"
            type="email"
            value={user?.email ?? ''}
            onChange={() => {}}
            disabled
          />

          <Input
            label={t('account.phoneLabel')}
            name="phone_number"
            type="tel"
            value={form.phone_number}
            onChange={handleChange}
          />

          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={updateMutation.isPending}>
              {t('account.saveChanges')}
            </Button>
          </div>
        </form>
      </div>

      {/* Change password */}
      <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-6">
        <h2 className="text-base font-semibold text-(--text-primary) mb-4">{t('account.changePasswordTitle')}</h2>

        {pwSuccess && (
          <div role="status" className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            {t('account.passwordChanged')}
          </div>
        )}
        {pwErr && (
          <div role="alert" className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {pwErr}
          </div>
        )}

        <form onSubmit={handlePwSubmit} className="space-y-4">
          <Input
            label={t('account.currentPasswordLabel')}
            name="current"
            type="password"
            value={pwForm.current}
            onChange={(e) => setPwForm((f) => ({ ...f, current: e.target.value }))}
            autoComplete="current-password"
          />
          <Input
            label={t('account.newPasswordLabel')}
            name="next"
            type="password"
            value={pwForm.next}
            onChange={(e) => setPwForm((f) => ({ ...f, next: e.target.value }))}
            autoComplete="new-password"
          />
          <Input
            label={t('account.confirmPasswordLabel')}
            name="confirm"
            type="password"
            value={pwForm.confirm}
            onChange={(e) => setPwForm((f) => ({ ...f, confirm: e.target.value }))}
            autoComplete="new-password"
          />
          <div className="flex justify-end">
            <Button type="submit" variant="primary" loading={changePwMutation.isPending}>
              {t('account.changePasswordBtn')}
            </Button>
          </div>
        </form>
      </div>

      {/* Active modules */}
      {user?.selected_modules && user.selected_modules.length > 0 && (
        <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-6">
          <h2 className="text-base font-semibold text-(--text-primary) mb-3">{t('account.activeModules')}</h2>
          <div className="flex flex-wrap gap-2">
            {user.selected_modules.map((mod) => (
              <span
                key={mod}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-(--primary-tint) text-(--primary-dark) capitalize"
              >
                {mod}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Help & Support */}
      <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-6">
        <h2 className="text-base font-semibold text-(--text-primary) mb-3">{t('account.support')}</h2>
        <Link
          to="/account/help"
          className="text-sm text-(--primary) hover:underline font-medium"
        >
          {t('account.helpLink')}
        </Link>
      </div>

      {/* Privacy & Terms */}
      <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-6">
        <h2 className="text-base font-semibold text-(--text-primary) mb-3">{t('account.legal')}</h2>
        <Link
          to="/account/privacy"
          className="text-sm text-(--primary) hover:underline font-medium"
        >
          {t('account.privacyLink')}
        </Link>
      </div>

      {/* Danger zone */}
      <div className="bg-(--surface) rounded-xl border border-red-200 dark:border-red-900 p-6">
        <h2 className="text-base font-semibold text-red-700 dark:text-red-400 mb-1">{t('account.dangerZone')}</h2>
        <p className="text-sm text-(--text-secondary) mb-4">
          {t('account.dangerZoneHint')}
        </p>
        <button
          type="button"
          onClick={() => setShowDeleteConfirm(true)}
          className="rounded-lg border border-red-300 text-red-600 px-4 py-2 text-sm font-semibold hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
        >
          {t('account.deleteMyAccount')}
        </button>
      </div>

      {/* Delete confirm modal */}
      <Modal open={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title={t('account.deleteModalTitle')} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-(--text-secondary)">
            {t('account.deleteConfirmText')}{' '}
            <span className="font-semibold text-red-600">{t('account.deleteConfirmBold')}</span>.
          </p>
          {deleteMutation.isError && (
            <p role="alert" className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">
              {t('account.failedDelete')}
            </p>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 rounded-lg border border-(--border) text-(--text-secondary) py-2.5 text-sm font-semibold hover:bg-(--primary-tint)/30 transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="button"
              disabled={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate()}
              className="flex-1 rounded-lg bg-red-600 text-white py-2.5 text-sm font-semibold hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {deleteMutation.isPending ? t('account.deleting') : t('account.deleteConfirmBtn')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
