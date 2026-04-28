import React, { useState } from 'react';
import { useAuth } from '../auth/AuthProvider';
import { useToast } from '../components/Toast';
import { Navigate } from 'react-router-dom';

export default function Login() {
  const { user, loading, login } = useAuth();
  const toast = useToast();

  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('Password123!');
  const [busy, setBusy] = useState(false);
  const [errMsg, setErrMsg] = useState<string | null>(null);

  // already logged in → go dashboard
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setErrMsg('Email and password are required');
      return;
    }
    setErrMsg(null);
    setBusy(true);
    try {
      await login(email.trim(), password);
      toast('Welcome back 👋');
    } catch (err: any) {
      console.error('login error', err);
      setErrMsg(err?.response?.data?.message || err?.message || 'Login failed');
      toast('Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[rgb(var(--bg))] p-6">
      <div className="card max-w-sm w-full shadow-lg">
        <div className="card-body space-y-6">
          <div className="space-y-1 text-center">
            <div className="text-xl font-semibold text-[rgb(var(--text))]">Sign in</div>
            <div className="text-sm text-[rgb(var(--muted))]">
              Use your CarbonLite AI admin credentials
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Email</label>
              <input
                className="input"
                type="email"
                autoComplete="username"
                disabled={busy}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                className="input"
                type="password"
                autoComplete="current-password"
                disabled={busy}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {errMsg && (
              <div className="text-xs text-red-600 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-700 rounded-lg px-3 py-2">
                {errMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn btn-primary w-full justify-center"
            >
              {busy ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <div className="text-[10px] text-center text-[rgb(var(--muted))]">
            CarbonLite AI Internal · v0.1
          </div>
        </div>
      </div>
    </div>
  );
}
