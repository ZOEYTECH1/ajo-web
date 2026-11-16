import clsx from 'clsx';
import PhoneInput from 'react-phone-number-input';
import 'react-phone-number-input/style.css';

interface PhoneNumberInputProps {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
}

export function PhoneNumberInput({
  label,
  name,
  value,
  onChange,
  error,
  required = false,
  disabled = false,
}: PhoneNumberInputProps) {
  const inputId = `input-${name}`;

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={inputId} className="text-sm font-medium text-(--text-secondary)">
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      <PhoneInput
        id={inputId}
        name={name}
        international
        defaultCountry="NG"
        value={value || undefined}
        onChange={(v) => onChange(v ?? '')}
        disabled={disabled}
        aria-describedby={error ? `${inputId}-error` : undefined}
        aria-invalid={!!error}
        className={clsx(
          'ajo-phone-input flex items-center gap-2 rounded-lg border px-3 py-2 text-sm text-(--text-primary)',
          'focus-within:ring-2 focus-within:ring-(--primary) focus-within:border-(--primary)',
          disabled && 'bg-(--bg) text-(--text-muted) cursor-not-allowed',
          error ? 'border-red-400 bg-red-50' : 'border-(--border) bg-(--surface)',
        )}
      />
      {error && (
        <p id={`${inputId}-error`} className="text-xs text-red-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
