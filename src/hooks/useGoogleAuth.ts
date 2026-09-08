import { useNavigate } from 'react-router-dom';
import type { CredentialResponse } from '@react-oauth/google';
import { googleSignIn } from '../services/authService';
import useAuthStore from '../store/useAuthStore';

/**
 * Shared handler for the Google Identity Services button on Login and
 * Register — both go through the same find-or-create backend endpoint and
 * need identical post-auth routing, so this avoids duplicating that logic.
 * Callers pass their own error/loading setters so the Google flow shares
 * the same error banner and loading state as their password form.
 */
export function useGoogleAuth(setError: (msg: string) => void, setIsLoading: (v: boolean) => void) {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();

  const handleSuccess = async (credentialResponse: CredentialResponse) => {
    if (!credentialResponse.credential) {
      setError('Google sign-in failed. Please try again.');
      return;
    }
    setError('');
    setIsLoading(true);
    try {
      const { user, ...tokens } = await googleSignIn(credentialResponse.credential);
      setAuth(user, tokens);
      navigate(user.phone_number ? '/dashboard' : '/complete-profile', { replace: true });
    } catch (err: unknown) {
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || 'Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleError = () => setError('Google sign-in failed. Please try again.');

  return { handleSuccess, handleError };
}
