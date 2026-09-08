/**
 * Auth service — wraps all authentication-related API calls.
 *
 * Every function returns a typed promise so callers get full type-safety
 * without needing to cast API responses manually.
 */
import api from './api';

export interface LoginPayload {
  email: string;
  password: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone_number: string;
}

export interface AuthTokens {
  access: string;
  refresh: string;
}

export interface User {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  // null for a brand-new Google sign-in — they haven't added a phone number yet.
  phone_number: string | null;
  role: string;
  profile_photo_url?: string;
  is_email_verified: boolean;
  selectedModules?: string[];
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

/**
 * Best-effort browser-detected IANA timezone (e.g. "Africa/Lagos"). The
 * backend resolves each user's "today" (cycle close eligibility, etc.)
 * against their own timezone rather than one global clock, so this is sent
 * on every login/register to keep it in sync — never blocks auth if it fails.
 */
function detectTimeZone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

/**
 * Authenticate a user with email and password.
 *
 * @param payload - Login credentials (email + password)
 * @returns Access/refresh tokens and the authenticated user object
 */
export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const time_zone = detectTimeZone();
  const response = await api.post<LoginResponse>('/auth/login/', { ...payload, ...(time_zone ? { time_zone } : {}) });
  return response.data;
}

/**
 * Authenticate (or silently create) a user from a Google ID token.
 * A brand-new account is returned with phone_number: null — the caller
 * must route to the complete-profile flow to collect it.
 *
 * @param idToken - The JWT credential returned by Google Identity Services
 * @returns Access/refresh tokens and the authenticated user object
 */
export async function googleSignIn(idToken: string): Promise<LoginResponse> {
  const time_zone = detectTimeZone();
  const response = await api.post<LoginResponse>('/auth/google/', {
    id_token: idToken,
    ...(time_zone ? { time_zone } : {}),
  });
  return response.data;
}

/**
 * Register a new user account.
 *
 * @param payload - Registration data (email, password, name, phone)
 * @returns A confirmation message from the server
 */
export async function register(payload: RegisterPayload): Promise<{ message: string }> {
  const time_zone = detectTimeZone();
  const response = await api.post<{ message: string }>('/auth/register/', { ...payload, ...(time_zone ? { time_zone } : {}) });
  return response.data;
}

/**
 * Verify the user's email address using a one-time OTP code.
 *
 * @param email - The email address being verified
 * @param code  - The OTP code sent to that address
 * @returns A confirmation message from the server
 */
export async function verifyEmail(email: string, code: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/verify-email/', { email, code });
  return response.data;
}

/**
 * Add/replace the phone number for the current (authenticated) user — used
 * by brand-new Google sign-ins, who start with phone_number: null. Triggers
 * an SMS OTP to verify it.
 *
 * @param phoneNumber - E.164-formatted phone number (e.g. +2348012345678)
 */
export async function setPhone(phoneNumber: string): Promise<{ detail: string }> {
  const response = await api.post<{ detail: string }>('/auth/set-phone/', { phone_number: phoneNumber });
  return response.data;
}

/**
 * Verify the user's phone number using the OTP sent by {@link setPhone}.
 *
 * @param email - The account email address
 * @param code  - The 6-digit OTP received via SMS
 */
export async function verifyPhone(email: string, code: string): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/verify-phone/', { email, code });
  return response.data;
}

/**
 * Re-sends an email or phone OTP.
 *
 * @param email - The account's email address
 * @param type  - Whether to re-send to 'email' or 'phone'
 */
export async function resendOtp(email: string, type: 'email' | 'phone'): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/resend-otp/', { email, type });
  return response.data;
}

/**
 * Validate a forgot-password OTP and obtain temporary tokens.
 *
 * @param email - Account email address
 * @param code  - The reset OTP sent to that address
 * @returns Temporary access/refresh tokens and the user object
 */
export async function forgotPasswordVerify(email: string, code: string): Promise<AuthTokens & { user: User }> {
  const response = await api.post<AuthTokens & { user: User }>('/auth/forgot-password/verify/', { email, code });
  return response.data;
}

/**
 * Set a new password using a temporary access token obtained after OTP verification.
 *
 * @param newPassword  - The new password chosen by the user
 * @param accessToken  - Temporary token from `forgotPasswordVerify`
 */
export async function resetPassword(newPassword: string, accessToken: string): Promise<void> {
  await api.post('/auth/reset-password/', { new_password: newPassword }, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

/**
 * Exchange a refresh token for a fresh access token.
 *
 * @param refresh - The current refresh token from localStorage
 * @returns A new short-lived access token
 */
export async function refreshToken(refresh: string): Promise<{ access: string }> {
  const response = await api.post<{ access: string }>('/auth/token/refresh/', { refresh });
  return response.data;
}

/**
 * Fetch the currently authenticated user's profile.
 *
 * @returns The full user profile object
 */
export async function getMe(): Promise<User> {
  const response = await api.get<User>('/auth/me/');
  return response.data;
}

/**
 * Invalidate the current session on the server and clear local tokens.
 */
export async function logout(): Promise<void> {
  const refresh = localStorage.getItem('refresh');
  await api.post('/auth/logout/', { refresh });
}
