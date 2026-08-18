import { create } from 'zustand';
import type { User, AuthTokens } from '../services/authService';

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  setAuth: (user: User, tokens: AuthTokens) => void;
  clearAuth: () => void;
  setUser: (user: User) => void;
}

// Load tokens from localStorage at init time
function loadTokensFromStorage(): AuthTokens | null {
  const access = localStorage.getItem('access');
  const refresh = localStorage.getItem('refresh');
  if (access && refresh) {
    return { access, refresh };
  }
  return null;
}

const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tokens: loadTokensFromStorage(),
  isLoading: false,

  setAuth: (user: User, tokens: AuthTokens) => {
    localStorage.setItem('access', tokens.access);
    localStorage.setItem('refresh', tokens.refresh);
    set({ user, tokens, isLoading: false });
  },

  clearAuth: () => {
    localStorage.removeItem('access');
    localStorage.removeItem('refresh');
    set({ user: null, tokens: null, isLoading: false });
  },

  setUser: (user: User) => {
    set({ user });
  },
}));

export default useAuthStore;
