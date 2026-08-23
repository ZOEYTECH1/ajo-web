import { useState, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { verifyOTP, getMe } from '../../services/authService';
import useAuthStore from '../../store/useAuthStore';

const OTP_LENGTH = 6;

export default function OTPPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') ?? '';
  const { setAuth } = useAuthStore();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
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
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    const nextEmpty = newDigits.findIndex((d) => !d);
    const focusIndex = nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty;
    inputRefs.current[focusIndex]?.focus();
  };

  const code = digits.join('');
  const isComplete = code.length === OTP_LENGTH;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isComplete) return;
    setError('');
    setIsLoading(true);

    try {
      const tokens = await verifyOTP(email, code);
      localStorage.setItem('access', tokens.access);
      localStorage.setItem('refresh', tokens.refresh);
      const user = await getMe();
      setAuth(user, tokens);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Invalid or expired OTP. Please try again.');
      setDigits(Array(OTP_LENGTH).fill(''));
      inputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-(--bg) flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-orange-600">Scribe</h1>
          <p className="mt-2 text-sm text-(--text-secondary)">Verify your email</p>
        </div>

        <div className="bg-(--surface) rounded-xl shadow-sm border border-(--border) p-8">
          <div className="text-center mb-6">
            <p className="text-sm text-(--text-secondary)">
              We sent a 6-digit code to
            </p>
            <p className="font-semibold text-(--text-primary) mt-0.5">{email || 'your email'}</p>
          </div>

          {error && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
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

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isLoading}
              disabled={!isComplete}
            >
              Verify
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-(--text-secondary)">
            Wrong email?{' '}
            <Link to="/register" className="font-medium text-orange-600 hover:text-orange-700">
              Go back
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
