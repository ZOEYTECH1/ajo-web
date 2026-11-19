import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { GoogleAuthButton } from '../../components/ui/GoogleAuthButton';
import { Input } from '../../components/ui/Input';
import { PhoneNumberInput } from '../../components/ui/PhoneNumberInput';
import { AjoLoader, AjoLoaderOverlay } from '../../components/ui/AjoLoader';
import { register } from '../../services/authService';
import { useGoogleAuth } from '../../hooks/useGoogleAuth';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone_number: string;
}

interface FormErrors {
  first_name?: string;
  last_name?: string;
  email?: string;
  password?: string;
  phone_number?: string;
}

export default function RegisterPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [form, setForm] = useState<FormState>({
    first_name: '', last_name: '', email: '', password: '', phone_number: '',
  });
  const [errors, setErrors]         = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading]   = useState(false);

  const { handleSuccess: handleGoogleSuccess, handleError: handleGoogleError } = useGoogleAuth(setServerError, setIsLoading);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handlePhoneChange = (value: string) => {
    setForm((prev) => ({ ...prev, phone_number: value }));
    setErrors((prev) => ({ ...prev, phone_number: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.first_name.trim())  newErrors.first_name  = t('auth.register.errors.firstNameRequired');
    if (!form.last_name.trim())   newErrors.last_name   = t('auth.register.errors.lastNameRequired');
    if (!form.email.includes('@')) newErrors.email       = t('auth.register.errors.invalidEmail');
    if (form.password.length < 8) newErrors.password    = t('auth.register.errors.passwordTooShort');
    if (!form.phone_number.trim()) newErrors.phone_number = t('auth.register.errors.phoneRequired');
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError('');
    if (!validate()) return;

    setIsLoading(true);
    try {
      await register(form);
      navigate(`/verify-otp?email=${encodeURIComponent(form.email)}`);
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: Record<string, string[]> } };
      const data = axiosError.response?.data;
      if (data) {
        const fieldError = Object.values(data).flat()[0];
        setServerError(fieldError ?? t('auth.register.errors.registrationFailed'));
      } else {
        setServerError(t('auth.register.errors.registrationFailed'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--bg) flex items-center justify-center px-4 py-12">
      {isLoading && <AjoLoaderOverlay message={t('auth.register.creatingAccount')} />}

      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <AjoLoader size={52} />
          </div>
          <h1 className="text-3xl font-extrabold text-(--primary) mt-2">Scribe</h1>
          <p className="mt-1 text-sm text-(--text-secondary)">{t('auth.register.subtitle')}</p>
        </div>

        <div className="bg-(--surface) rounded-2xl shadow-sm border border-(--border) p-8">
          {serverError && (
            <div
              className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400"
              role="alert"
            >
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label={t('auth.register.firstNameLabel')}  name="first_name"  value={form.first_name}  onChange={handleChange} error={errors.first_name}  placeholder={t('auth.register.firstNamePlaceholder')}  required />
              <Input label={t('auth.register.lastNameLabel')}   name="last_name"   value={form.last_name}   onChange={handleChange} error={errors.last_name}   placeholder={t('auth.register.lastNamePlaceholder')}   required />
            </div>
            <Input label={t('auth.login.emailLabel')} name="email"       type="email" value={form.email}       onChange={handleChange} error={errors.email}       placeholder={t('auth.login.emailPlaceholder')}    required />
            <PhoneNumberInput label={t('auth.register.phoneLabel')} name="phone_number" value={form.phone_number} onChange={handlePhoneChange} error={errors.phone_number} required />
            <Input label={t('auth.login.passwordLabel')}      name="password"    type="password" value={form.password}    onChange={handleChange} error={errors.password}    placeholder={t('auth.register.passwordPlaceholder')} required />

            <Button type="submit" variant="primary" fullWidth loading={isLoading}>
              {t('auth.register.createAccount')}
            </Button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="flex-1 border-t border-(--border)" />
            <span className="text-xs text-(--text-muted)">{t('auth.login.orContinueWith')}</span>
            <div className="flex-1 border-t border-(--border)" />
          </div>

          <GoogleAuthButton onSuccess={handleGoogleSuccess} onError={handleGoogleError} text="signup_with" />

          <p className="mt-6 text-center text-sm text-(--text-secondary)">
            {t('auth.register.alreadyHaveAccount')}{' '}
            <Link to="/login" className="font-medium text-(--primary) hover:text-(--primary-dark)">
              {t('auth.register.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
