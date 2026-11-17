import { useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';

/**
 * Backend's default Flutterwave redirect_url (SUBSCRIPTION_REDIRECT_URL) is
 * a mobile-only deep link -- a browser can't follow ajo:// back into the web
 * app, which is why every web payment page used to require the user to
 * manually copy-paste the transaction id out of Flutterwave's own
 * confirmation page. Pass this as redirect_url when initiating a payment
 * from a web page instead, so Flutterwave sends the browser straight back
 * here with ?transaction_id=...&status=...&tx_ref=... already in the query
 * string.
 */
export function currentPageRedirectUrl() {
  return window.location.origin + window.location.pathname;
}

/**
 * Pairs with currentPageRedirectUrl() above. Call once per payment page --
 * fires `onReturn` exactly once with the transaction_id if the page just
 * loaded with Flutterwave's redirect params present, then strips them from
 * the URL so refreshing the page doesn't re-trigger verification. Does
 * nothing (and the manual transaction-id input stays as a fallback) if the
 * params are absent, e.g. the user navigated here directly.
 */
export function useFlutterwaveRedirect(onReturn: (transactionId: string) => void) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const handled = useRef(false);

  useEffect(() => {
    // The ref guard (not an empty dependency array) is what actually limits
    // this to firing once -- navigate() below changes searchParams/location
    // identity, which re-runs this effect, but handled.current is already
    // true by then so it's a no-op. That's deliberate: it lets the effect
    // list its real dependencies honestly instead of suppressing the lint
    // rule that would otherwise flag a stale closure here.
    if (handled.current) return;
    const transactionId = searchParams.get('transaction_id');
    const payStatus = searchParams.get('status');
    if (!transactionId) return;

    handled.current = true;
    navigate(location.pathname, { replace: true });
    if (payStatus === 'successful') {
      onReturn(transactionId);
    }
  }, [searchParams, navigate, location, onReturn]);
}
