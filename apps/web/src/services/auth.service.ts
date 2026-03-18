import { http } from './http';
import type { ApiResponse } from '../shared/types/api';

interface AuthResult {
  user: {
    id: string;
    email: string;
    name: string | null;
    role: string;
    plan: string;
    createdAt: string;
    updatedAt: string;
  };
  tokens: { accessToken: string; refreshToken: string };
}

export async function login(email: string, password: string) {
  const res = await http.post<ApiResponse<AuthResult>>('/api/auth/login', { email, password });
  return res.data.data!;
}

export async function register(email: string, password: string, name?: string) {
  const res = await http.post<ApiResponse<AuthResult>>('/api/auth/register', { email, password, name });
  return res.data.data!;
}

export async function refresh(refreshToken: string) {
  const res = await http.post<ApiResponse<{ accessToken: string }>>('/api/auth/refresh', { refreshToken });
  return res.data.data!;
}

export async function me() {
  const res = await http.get<ApiResponse<AuthResult['user']>>('/api/auth/me');
  return res.data.data!;
}
