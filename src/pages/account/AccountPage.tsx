import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import useAuthStore from '../../store/useAuthStore';
import { getMe } from '../../services/authService';
import api from '../../services/api';
import type { User } from '../../services/authService';

interface ProfileUpdatePayload {
  first_name: string;
  last_name: string;
  phone_number: string;
}

export default function AccountPage() {
  const { setUser } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: user } = useQuery<User>({
    queryKey: ['me'],
    queryFn: getMe,
  });

  const [form, setForm] = useState<ProfileUpdatePayload>({
    first_name: '',
    last_name: '',
    phone_number: '',
  });

  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name,
        last_name: user.last_name,
        phone_number: user.phone_number,
      });
    }
  }, [user]);

  const mutation = useMutation({
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
    mutation.mutate(form);
  };

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : '';

  const initials = user
    ? `${user.first_name?.[0] ?? ''}${user.last_name?.[0] ?? ''}`.toUpperCase() || 'U'
    : 'U';

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account</h1>
        <p className="text-sm text-gray-500">Manage your profile information</p>
      </div>

      {/* Avatar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center gap-4">
          {user?.profile_photo_url ? (
            <img
              src={user.profile_photo_url}
              alt={displayName}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-orange-100 text-orange-600 flex items-center justify-center text-xl font-bold">
              {initials}
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900">{displayName}</p>
            <p className="text-sm text-gray-500">{user?.email}</p>
            <p className="text-xs text-gray-400 mt-0.5 capitalize">
              {user?.role ?? 'Member'} •{' '}
              {user?.is_email_verified ? (
                <span className="text-green-600">Email verified</span>
              ) : (
                <span className="text-yellow-600">Email not verified</span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Edit form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-4">Personal Information</h2>

        {saveSuccess && (
          <div className="mb-4 rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
            Profile updated successfully.
          </div>
        )}

        {mutation.isError && (
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
            <Button
              type="submit"
              variant="primary"
              loading={mutation.isPending}
            >
              Save changes
            </Button>
          </div>
        </form>
      </div>

      {/* Modules */}
      {user?.selectedModules && user.selectedModules.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-3">Active Modules</h2>
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
    </div>
  );
}
