import { useAuth } from './AuthProvider';
import { AccessDeniedPage } from '../pages/AccessDeniedPage';

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();

  if (!isAdmin) {
    return <AccessDeniedPage />;
  }

  return children;
}
