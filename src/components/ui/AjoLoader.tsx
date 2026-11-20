interface AjoLoaderProps {
  size?: number;
  label?: string;
}

// Uses the same full brand mark (public/ajo-logo.svg) as the navbar/sidebar/
// splash screen, instead of a separate simplified ring+shield spinner graphic
// -- one mark for the whole app. The SVG's own embedded <style> (ring +
// naira-badge breathing pulse, and its own prefers-reduced-motion override)
// keeps animating identically when loaded via <img>.
export function AjoLoader({ size = 64, label = 'Loading…' }: AjoLoaderProps) {
  return (
    <div role="status" aria-label={label} style={{ display: 'inline-block' }}>
      <img src="/ajo-logo.svg" width={size} height={size} alt="" aria-hidden="true" />
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
