import clsx from 'clsx';
import type { ChangeEvent } from 'react';

interface InputProps {
  label: string;
  name: string;
  type?: string;
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  autoComplete?: string;
  inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  maxLength?: number;
}

export function Input({
  label,
  name,
  type = 'text',
  value,
  onChange,
  error,
  placeholder,
  required = false,
  disabled = false,
  autoComplete,
  inputMode,
  maxLength,
}: InputProps) {
  const inputId = `input-${name}`;

  return (
    <div className="flex flex-col gap-1">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-(--text-secondary)"
      >
        {label}
        {required && <span className="text-red-500 ml-1" aria-hidden="true">*</span>}
      </label>
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        autoComplete={autoComplete}
        inputMode={inputMode}
        maxLength={maxLength}
        aria-describedby={error ? `${inputId}-error` : undefined}
        aria-invalid={!!error}
        className={clsx(
          'w-full rounded-lg border px-3 py-2 text-sm text-(--text-primary) placeholder:text-(--text-muted)',
          'focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500',
          'disabled:bg-(--bg) disabled:text-(--text-muted) disabled:cursor-not-allowed',
          error
            ? 'border-red-400 bg-red-50'
            : 'border-(--border) bg-(--surface)',
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
