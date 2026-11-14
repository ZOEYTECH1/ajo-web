import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface WelcomeSplashProps {
  onComplete: () => void;
}

// Web equivalent of the mobile app's cold-start splash (see
// ajo-app/screen/AjoSplashScreen.tsx) -- the first thing a user sees on a
// fresh page load, before the real app underneath has finished mounting.
// Mirrors its timing: logo scales+fades in immediately, the accent bar
// follows 600ms later, held briefly, then this overlay fades out of the
// way (mobile cuts to the next screen instantly on navigation; a quick
// fade reads better sitting on top of a already-mounted web app instead
// of a hard route swap).
export function WelcomeSplash({ onComplete }: WelcomeSplashProps) {
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const startClose = setTimeout(() => setClosing(true), 2600);
    const finish = setTimeout(onComplete, 3000);
    return () => {
      clearTimeout(startClose);
      clearTimeout(finish);
    };
  }, [onComplete]);

  return (
    <div
      className={clsx(
        'fixed inset-0 z-[100] flex flex-col items-center justify-center bg-(--bg) transition-opacity duration-300',
        closing && 'opacity-0 pointer-events-none',
      )}
      aria-hidden="true"
    >
      <img
        src="/ajo-logo.svg"
        alt="Scribe"
        className="h-40 w-40 sm:h-56 sm:w-56 animate-splash-logo-in"
      />
      <span className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-wide text-(--primary) animate-splash-bar-in">
        Scribe
      </span>
      {/* Underline sized to the name above it, not an arbitrary short dash. */}
      <div className="mt-2 h-1 w-24 sm:w-28 rounded-full bg-(--primary) animate-splash-bar-in" />
    </div>
  );
}
