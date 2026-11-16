import { useEffect, useRef, useState } from 'react';
import { GoogleLogin } from '@react-oauth/google';
import type { CredentialResponse } from '@react-oauth/google';

interface GoogleAuthButtonProps {
  onSuccess: (credentialResponse: CredentialResponse) => void;
  onError: () => void;
  text: 'continue_with' | 'signup_with';
}

/**
 * GoogleLogin's `width` only accepts a fixed pixel number -- there's no
 * "100%" option. A hardcoded value (336) overflowed the auth card on any
 * viewport narrower than that, since the card itself is responsive. This
 * measures the actual space available and re-renders the button to match,
 * so it's never wider than its container on any screen size.
 */
export function GoogleAuthButton({ onSuccess, onError, text }: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(300);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const measured = entries[0]?.contentRect.width;
      if (measured) setWidth(Math.max(200, Math.floor(measured)));
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <GoogleLogin onSuccess={onSuccess} onError={onError} width={width} text={text} shape="pill" />
    </div>
  );
}
