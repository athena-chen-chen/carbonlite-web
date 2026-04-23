import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { getAuthUser, setAuthUser } from '../services/http';
import { performLogin, performLogout, fetchMe } from '../services/auth';

export type AuthContextValue = {
  user: { id: string; email: string; name?: string; role?: string } | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthCtx = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthContextValue['user']>(null);
  const [loading, setLoading] = useState(true);

  // restore user from localStorage on first load
  useEffect(() => {
    const cached = getAuthUser();
    if (cached) {
      setUser(cached);
      setLoading(false);
    } else {
      // no cached user, but we might still have token -> try /auth/me
      (async () => {
        try {
          const me = await fetchMe();
          if (me) {
            setUser(me);
            setAuthUser(me);
          }
        } catch {
          // ignore, probably 401
        } finally {
          setLoading(false);
        }
      })();
    }
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const u = await performLogin(email, password);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    performLogout();
    setUser(null);
    window.location.href = '/login';
  }, []);

  return (
    <AuthCtx.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
