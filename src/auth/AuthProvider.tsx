import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import {
  getCurrentUser,
  getToken,
  login as loginRequest,
  logout as logoutRequest,
  register as registerRequest,
  type AuthUser,
  isAdminUser,
} from '../services/auth';
import {
  identify,
  reset as resetAnalytics,
  track,
} from '../services/analytics.service';

type RegisterInput = {
  organizationName: string;
  email: string;
  password: string;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => getCurrentUser());
  const [token, setToken] = useState<string | null>(() => getToken());

  useEffect(() => {
    if (token && user) {
      identify(user);
    }
  }, [token, user]);

  const login = useCallback(async (email: string, password: string) => {
    await loginRequest({ email, password });
    const currentUser = getCurrentUser();
    identify(currentUser);
    track('USER_LOGGED_IN');
    setUser(currentUser);
    setToken(getToken());
  }, []);

  const register = useCallback(async (input: RegisterInput) => {
    await registerRequest(input);
    const currentUser = getCurrentUser();
    identify(currentUser);
    setUser(currentUser);
    setToken(getToken());
  }, []);

  const logout = useCallback(() => {
    track('USER_LOGGED_OUT');
    resetAnalytics();
    logoutRequest();
    setUser(null);
    setToken(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: Boolean(token),
        isAdmin: isAdminUser(user),
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
