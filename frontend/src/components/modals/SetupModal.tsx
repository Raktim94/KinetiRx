import React, { useState } from 'react';
import { Eye, EyeOff, ShieldAlert, ShieldCheck, UserPlus } from 'lucide-react';
import { ApiError, authApi, AuthUser, setToken } from '../../lib/api';

interface SetupModalProps {
  onSetupSuccess: (user: AuthUser) => void;
}

/** First-run "create the admin account" screen — shown instead of the login
 * form when GET /api/auth/setup-status reports no employees exist yet (a
 * fresh install with no KINETIRX_ADMIN_PASSWORD set before first boot). */
export const SetupModal: React.FC<SetupModalProps> = ({ onSetupSuccess }) => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const res = await authApi.setup(name.trim(), password);
      setToken(res.accessToken);
      onSetupSuccess(res.user);
    } catch (err) {
      if (err instanceof ApiError) {
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
      <div className="glass-panel rounded-3xl max-w-sm w-full p-6 space-y-4 text-xs text-text animate-in zoom-in-95">
        <div className="border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <UserPlus className="w-4 h-4" />
            </div>
            <span>Welcome to KinetiRx</span>
          </h3>
          <p className="mt-2 text-text-muted leading-relaxed">
            No admin account exists yet. Create one now — this will be the
            first login for your pharmacy.
          </p>
        </div>

        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="font-semibold text-text-muted block mb-1.5">Your Name</label>
            <input
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g. Ramesh Sharma"
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
                placeholder="At least 8 characters"
                className="w-full pl-4 pr-10 py-3 bg-surface border border-border rounded-2xl font-mono text-center text-base font-bold text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg tracking-widest backdrop-blur-md"
                minLength={8}
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

          <div>
            <label className="font-semibold text-text-muted block mb-1.5">Confirm Password</label>
            <input
              type={showPass ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => {
                setConfirmPassword(e.target.value);
                setError('');
              }}
              placeholder="Re-enter your password"
              className="w-full pl-4 pr-4 py-3 bg-surface border border-border rounded-2xl font-mono text-center text-base font-bold text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg tracking-widest backdrop-blur-md"
              minLength={8}
              required
            />
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
              <ShieldCheck className="w-4 h-4" />
              <span>{submitting ? 'Creating account…' : 'Create Admin Account'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
