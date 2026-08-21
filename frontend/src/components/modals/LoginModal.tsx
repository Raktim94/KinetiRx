import React, { useState } from 'react';
import { Eye, EyeOff, Lock, LogIn, ShieldAlert, X } from 'lucide-react';
import { ApiError, authApi, AuthUser, setToken } from '../../lib/api';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: AuthUser) => void;
  /** false while gating the whole app pre-auth — hides the close/X affordance
   * so there's nothing to dismiss into (there's no authenticated app behind
   * it yet). Defaults to true for the "switch active user" reuse of this
   * same modal once already logged in. */
  allowClose?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  allowClose = true,
}) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await authApi.login(identifier.trim(), password);
      setToken(res.accessToken);
      onLoginSuccess(res.user);
      setPassword('');
      setIdentifier('');
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Invalid employee ID/name or password.');
      } else if (err instanceof ApiError) {
        setError(err.describe());
      } else {
        setError('Could not reach the KinetiRx server. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface-elevated backdrop-blur-2xl rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-border text-xs text-text animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Lock className="w-4 h-4" />
            </div>
            <span>Sign In to KinetiRx</span>
          </h3>
          {allowClose && (
            <button
              onClick={onClose}
              className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="font-semibold text-text-muted block mb-1.5">
              Employee ID or Name
            </label>
            <input
              type="text"
              value={identifier}
              onChange={e => {
                setIdentifier(e.target.value);
                setError('');
              }}
              placeholder="e.g. EMP-ADMIN-1 or Master Admin"
              className="w-full p-2.5 bg-surface border border-border rounded-2xl outline-none text-text focus:border-primary font-medium backdrop-blur-md"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="font-semibold text-text-muted block mb-1.5">Password</label>
            <div className="relative">
              <input
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={e => {
                  setPassword(e.target.value);
                  setError('');
                }}
                placeholder="••••••••"
                className="w-full pl-4 pr-10 py-3 bg-surface border border-border rounded-2xl font-mono text-center text-base font-bold text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg tracking-widest backdrop-blur-md"
                required
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
                title={showPass ? 'Hide password' : 'Show password'}
              >
                {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/15 border border-rose-500/30 text-rose-300 font-medium rounded-2xl text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-primary hover:bg-primary text-text font-bold rounded-2xl shadow-lg shadow-primary/40 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogIn className="w-4 h-4" />
              <span>{submitting ? 'Signing in…' : 'Authorize & Sign In'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
