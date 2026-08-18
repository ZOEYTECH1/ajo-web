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
  phone_number: string;
  role: string;
  profile_photo_url?: string;
  is_email_verified: boolean;
  selectedModules?: string[];
}

export interface LoginResponse extends AuthTokens {
  user: User;
}

export async function login(payload: LoginPayload): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>('/auth/login/', payload);
  return response.data;
}

export async function register(payload: RegisterPayload): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>('/auth/register/', payload);
  return response.data;
}

export async function verifyOTP(email: string, code: string): Promise<AuthTokens> {
  const response = await api.post<AuthTokens>('/auth/verify-otp/', { email, code });
  return response.data;
}

export async function refreshToken(refresh: string): Promise<{ access: string }> {
  const response = await api.post<{ access: string }>('/auth/token/refresh/', { refresh });
  return response.data;
}

export async function getMe(): Promise<User> {
  const response = await api.get<User>('/auth/me/');
  return response.data;
}

export async function logout(): Promise<void> {
  const refresh = localStorage.getItem('refresh');
  await api.post('/auth/logout/', { refresh });
}
