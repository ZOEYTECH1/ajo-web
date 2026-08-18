import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { register } from '../../services/authService';

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

  const [form, setForm] = useState<FormState>({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    phone_number: '',
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [serverError, setServerError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};
    if (!form.first_name.trim()) newErrors.first_name = 'First name is required.';
    if (!form.last_name.trim()) newErrors.last_name = 'Last name is required.';
    if (!form.email.includes('@')) newErrors.email = 'Enter a valid email address.';
    if (form.password.length < 8) newErrors.password = 'Password must be at least 8 characters.';
    if (!form.phone_number.trim()) newErrors.phone_number = 'Phone number is required.';
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
        setServerError(fieldError ?? 'Registration failed. Please try again.');
      } else {
        setServerError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-orange-600">Ajo</h1>
          <p className="mt-2 text-sm text-gray-500">Create your account</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8">
          {serverError && (
            <div className="mb-4 rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700" role="alert">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First name"
                name="first_name"
                value={form.first_name}
                onChange={handleChange}
                error={errors.first_name}
                placeholder="John"
                required
              />
              <Input
                label="Last name"
                name="last_name"
                value={form.last_name}
                onChange={handleChange}
                error={errors.last_name}
                placeholder="Doe"
                required
              />
            </div>

            <Input
              label="Email address"
              name="email"
              type="email"
              value={form.email}
              onChange={handleChange}
              error={errors.email}
              placeholder="you@example.com"
              required
            />

            <Input
              label="Phone number"
              name="phone_number"
              type="tel"
              value={form.phone_number}
              onChange={handleChange}
              error={errors.phone_number}
              placeholder="+234 800 000 0000"
              required
            />

            <Input
              label="Password"
              name="password"
              type="password"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              placeholder="At least 8 characters"
              required
            />

            <Button
              type="submit"
              variant="primary"
              fullWidth
              loading={isLoading}
            >
              Create account
            </Button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="font-medium text-orange-600 hover:text-orange-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
