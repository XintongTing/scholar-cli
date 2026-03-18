import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../features/auth/store';
import type { ReactNode } from 'react';

const PUBLIC_PATHS = ['/login', '/register'];

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated());

  useEffect(() => {
    const isPublic = PUBLIC_PATHS.includes(location.pathname);
    if (!isAuthenticated && !isPublic) {
      navigate('/login', { replace: true });
    }
    if (isAuthenticated && isPublic) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, location.pathname, navigate]);

  return <>{children}</>;
}
