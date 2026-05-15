import React, { createContext, useCallback, useContext, useState } from 'react';
import {
  getCurrentUser,
  getToken,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type AuthUser,
} from '../services/auth';

type RegisterInput = {
  organizationName: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [token, setToken] = useState<string | null>(() => getToken());

  const login = useCallback(async (email: string, password: string) => {
    await loginRequest({ email, password });
    setUser(getCurrentUser());
    setToken(getToken());
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await registerRequest(input);
    setUser(getCurrentUser());
    setToken(getToken());
  }, []);

  const logout = useCallback(() => {
    logoutRequest();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(token),
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
