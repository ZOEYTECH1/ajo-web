import { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import api from '../../services/api';
import { forgotPasswordVerify, resetPassword } from '../../services/authService';

type Step = 'email' | 'otp' | 'password' | 'done';

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [step, setStep]         = useState<Step>('email');
  const [email, setEmail]       = useState('');
  const [code, setCode]         = useState('');
  const [newPw, setNewPw]       = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const accessTokenRef           = useRef('');

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError(t('auth.forgot.errors.enterEmail')); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/resend-otp/', { email: email.trim().toLowerCase(), type: 'email' });
      setStep('otp');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { email?: string[]; detail?: string } } };
      setError(e.response?.data?.email?.[0] ?? e.response?.data?.detail ?? t('auth.forgot.errors.failedSendCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) { setError(t('auth.forgot.errors.enter6Digit')); return; }
    setLoading(true);
    setError('');
    try {
      const result = await forgotPasswordVerify(email.trim().toLowerCase(), code.trim());
      accessTokenRef.current = result.access;
      setStep('password');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { code?: string[]; detail?: string } } };
      setError(e.response?.data?.code?.[0] ?? e.response?.data?.detail ?? t('auth.forgot.errors.invalidExpiredCode'));
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPw.length < 8) { setError(t('auth.forgot.errors.passwordTooShort')); return; }
    if (newPw !== confirmPw) { setError(t('auth.forgot.errors.passwordMismatch')); return; }
    setLoading(true);
    setError('');
    try {
      await resetPassword(newPw, accessTokenRef.current);
      setStep('done');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { detail?: string } } };
      setError(e.response?.data?.detail ?? t('auth.forgot.errors.failedReset'));
    } finally {
      setLoading(false);
    }
  };

  const subtitleMap: Record<Step, string> = {
    email:    t('auth.forgot.subtitleEmail'),
    otp:      t('auth.forgot.subtitleOtp', { email }),
    password: t('auth.forgot.subtitlePassword'),
    done:     t('auth.forgot.subtitleDone'),
  };

  return (
    <div className="min-h-screen bg-(--bg) flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-(--primary)">Scribe</h1>
          <p className="mt-1 text-sm text-(--text-secondary)">{t('auth.forgot.resetYourPassword')}</p>
        </div>

        <div className="bg-(--surface) rounded-2xl shadow-sm border border-(--border) p-8">
          <p className="mb-6 text-sm text-(--text-secondary)">{subtitleMap[step]}</p>

          {error && step !== 'done' && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400" role="alert">
              {error}
            </div>
          )}

          {step === 'email' && (
            <form onSubmit={handleSendCode} noValidate className="space-y-4">
              <Input
                label={t('auth.forgot.emailLabel')}
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.login.emailPlaceholder')}
                required
              />
              <Button type="submit" variant="primary" fullWidth loading={loading} disabled={!email}>
                {t('auth.forgot.sendCode')}
              </Button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyCode} noValidate className="space-y-4">
              <Input
                label={t('auth.forgot.verificationCodeLabel')}
                name="code"
                type="text"
                inputMode="numeric"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                required
              />
              <Button type="submit" variant="primary" fullWidth loading={loading} disabled={code.length !== 6}>
                {t('auth.forgot.verifyCode')}
              </Button>
              <button
                type="button"
                onClick={handleSendCode}
                className="w-full text-center text-sm text-(--primary) hover:underline mt-2"
              >
                {t('auth.forgot.resendCode')}
              </button>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handleResetPassword} noValidate className="space-y-4">
              <Input
                label={t('auth.forgot.newPasswordLabel')}
                name="new_password"
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                placeholder={t('auth.forgot.newPasswordPlaceholder')}
                required
              />
              <Input
                label={t('auth.forgot.confirmNewPasswordLabel')}
                name="confirm_password"
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                placeholder={t('auth.forgot.confirmNewPasswordPlaceholder')}
                required
              />
              <Button type="submit" variant="primary" fullWidth loading={loading} disabled={!newPw || !confirmPw}>
                {t('auth.forgot.resetPassword')}
              </Button>
            </form>
          )}

          {step === 'done' && (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-green-100 dark:bg-green-900/30 mx-auto">
                <svg className="w-7 h-7 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-(--text-primary)">{t('auth.forgot.passwordResetTitle')}</h2>
              <p className="text-sm text-(--text-secondary)">{t('auth.forgot.canSignInNow')}</p>
              <Button variant="primary" fullWidth onClick={() => navigate('/login', { replace: true })}>
                {t('auth.otp.goToLogin')}
              </Button>
            </div>
          )}

          <p className="mt-6 text-center text-sm text-(--text-secondary)">
            {t('auth.forgot.rememberPassword')}{' '}
            <Link to="/login" className="font-medium text-(--primary) hover:text-(--primary-dark)">
              {t('auth.login.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
