import { useAuth } from './AuthProvider';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isPlatformAdmin } = useAuth();

  if (!isPlatformAdmin) {
    return <AccessDeniedPage />;
  }

  return children;
}
