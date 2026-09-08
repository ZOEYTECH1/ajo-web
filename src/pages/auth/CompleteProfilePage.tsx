import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { setPhone, verifyPhone, resendOtp } from '../../services/authService';
import useAuthStore from '../../store/useAuthStore';

const OTP_LENGTH = 6;

/**
 * Shown to a user who just signed in with Google for the first time —
 * their account was created with phone_number: null. Collects a phone
 * number, sends an SMS OTP, and verifies it before letting them into the app.
 */
export default function CompleteProfilePage() {
  const navigate = useNavigate();
  const { user, setUser } = useAuthStore();

  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhoneValue] = useState('');
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resent, setResent] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phone.replace(/\D/g, '').length < 10) {
      setError('Enter a valid phone number.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      await setPhone(phone);
      setStep('otp');
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { phone_number?: string; detail?: string } } };
      const data = axiosError.response?.data;
      setError(data?.phone_number || data?.detail || 'Could not send OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);
    if (digit && index < OTP_LENGTH - 1) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) newDigits[i] = pasted[i];
    setDigits(newDigits);
    const nextEmpty = newDigits.findIndex((d) => !d);
    inputRefs.current[nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty]?.focus();
  };

  const code = digits.join('');
  const isComplete = code.length === OTP_LENGTH;

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete || !user) return;
    setError('');
    setIsLoading(true);
    try {
      await verifyPhone(user.email, code);
      setUser({ ...user, phone_number: phone });
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Invalid or expired code. Please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!user) return;
    try {
      await resendOtp(user.email, 'phone');
      setResent(true);
      setError('');
      setTimeout(() => setResent(false), 3000);
    } catch {
      setError('Could not resend code. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-(--bg) flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-(--primary)">
            {step === 'phone' ? 'Add Your Phone' : 'Verify Your Phone'}
          </h1>
          <p className="mt-2 text-sm text-(--text-secondary)">
            {step === 'phone'
              ? 'We need your phone number to secure your account and send payment alerts.'
              : `Enter the 6-digit code sent to ${phone}`}
          </p>
        </div>

        <div className="bg-(--surface) rounded-2xl shadow-sm border border-(--border) p-8">
          {error && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400" role="alert">
              {error}
            </div>
          )}

          {step === 'phone' ? (
            <form onSubmit={handleSendCode} noValidate className="space-y-4">
              <Input
                label="Phone number"
                name="phone_number"
                type="tel"
                value={phone}
                onChange={(e) => { setPhoneValue(e.target.value); setError(''); }}
                placeholder="+234 800 000 0000"
                required
              />
              <Button type="submit" variant="primary" fullWidth loading={isLoading}>
                Send verification code
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerify} noValidate>
              <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    aria-label={`OTP digit ${index + 1}`}
                    className="w-11 h-12 text-center text-lg font-semibold border border-(--border) rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-(--text-primary) bg-(--surface)"
                  />
                ))}
              </div>

              <Button type="submit" variant="primary" fullWidth loading={isLoading} disabled={!isComplete}>
                Verify phone
              </Button>

              <div className="mt-4 flex justify-between text-sm">
                <button type="button" onClick={() => { setStep('phone'); setDigits(Array(OTP_LENGTH).fill('')); setError(''); }} className="text-(--text-secondary) hover:text-(--primary)">
                  Wrong number?
                </button>
                <button type="button" onClick={handleResend} className="font-medium text-(--primary) hover:text-(--primary-dark)">
                  {resent ? 'Code sent!' : 'Resend code'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
