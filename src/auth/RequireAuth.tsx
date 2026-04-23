import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

export function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // still checking localStorage/me
  if (loading) {
    return (
      <div className="min-h-[200px] flex items-center justify-center text-[rgb(var(--muted))] text-sm">
        Loading…
      </div>
    );
  }

  // no user => bounce to /login, remember where we tried to go
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}
