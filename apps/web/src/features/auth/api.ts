import { http } from '../../services/http';

export const authApi = {
  register: (email: string, password: string, name?: string) =>
    http.post('/auth/register', { email, password, name }),
  login: (email: string, password: string) =>
    http.post('/auth/login', { email, password }),
  refresh: (refreshToken: string) =>
    http.post('/auth/refresh', { refreshToken }),
  me: () => http.get('/auth/me'),
};
