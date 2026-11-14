import { useTheme } from '../../context/ThemeContext';

interface AjoLoaderProps {
  size?: number;
  label?: string;
}

export function AjoLoader({ size = 64, label = 'Loading…' }: AjoLoaderProps) {
  const { isDark } = useTheme();

  const ringLight  = isDark ? '#6B96FF' : '#4D7EFF';
  const ringDark   = isDark ? '#0035F0' : '#0028C2';
  const shieldFill = isDark ? '#4ADE80' : '#22C55E';

  return (
    <div
      role="status"
      aria-label={label}
      style={{ width: size, height: size, position: 'relative', display: 'inline-block' }}
    >
      {/* Spinning ring */}
      <svg
        className="ajo-ring"
        width={size}
        height={size}
        viewBox="0 0 200 200"
        style={{ position: 'absolute', top: 0, left: 0 }}
        aria-hidden="true"
      >
        <path
          d="M113.9,21.2 A80,80 0 0,1 113.9,178.8"
          fill="none"
          stroke={ringLight}
          strokeWidth="18"
          strokeLinecap="round"
        />
        <path
          d="M86.1,178.8 A80,80 0 0,1 86.1,21.2"
          fill="none"
          stroke={ringDark}
          strokeWidth="18"
          strokeLinecap="round"
        />
      </svg>

      {/* Pulsing shield + checkmark */}
      <svg
        className="ajo-shield"
        width={size}
        height={size}
        viewBox="0 0 200 200"
        style={{ position: 'absolute', top: 0, left: 0 }}
        aria-hidden="true"
      >
        <path
          d="M100,65 L70,80 L70,110 Q70,135 100,145 Q130,135 130,110 L130,80 Z"
          fill={shieldFill}
          stroke="#FFFFFF"
          strokeWidth="2"
        />
        <path
          d="M80,108 L95,123 L122,88"
          fill="none"
          stroke="#FFFFFF"
          strokeWidth="8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

/** Full-screen overlay — used on auth pages while submitting */
export function AjoLoaderOverlay({ message }: { message?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 dark:bg-black/80 backdrop-blur-sm">
      <AjoLoader size={72} />
      {message && (
        <p className="mt-4 text-sm font-medium text-(--text-secondary)">{message}</p>
      )}
    </div>
  );
}
