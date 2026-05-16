import { Navigate, useLocation } from 'react-router-dom';
import { getToken } from '../services/auth';
import { isDemoMode } from '../demo/demoData';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  if (!getToken() && !isDemoMode()) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
