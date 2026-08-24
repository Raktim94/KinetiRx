import React, { useState } from 'react';
import { AlertCircle, Eye, EyeOff, KeyRound, LogOut } from 'lucide-react';
import { ApiError, authApi, AuthUser } from '../lib/api';

interface ForcedPasswordChangeScreenProps {
  currentUser: AuthUser;
  onPasswordChanged: () => void;
  onLogout: () => void;
}

// Full-screen gate shown right after login when the server flags the
// account's password as temporary (admin-created or admin-reset). Blocks
// the rest of the app until a real password is set — see PUT /api/auth/password.
export const ForcedPasswordChangeScreen: React.FC<ForcedPasswordChangeScreenProps> = ({
  currentUser,
  onPasswordChanged,
  onLogout,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (newPassword.trim().length < 8) {
      setError('New password must be at least 8 characters long.');
      return;
    }
    if (newPassword.trim() !== confirmPassword.trim()) {
      setError('New password confirmation does not match.');
      return;
    }

    setSubmitting(true);
    try {
      await authApi.changePassword(currentPassword, newPassword.trim());
      onPasswordChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError('Current (temporary) password is incorrect.');
      } else {
        setError(err instanceof ApiError ? err.describe() : 'Could not reach the KinetiRx server. Check your connection and try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-bg flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl shadow-2xl max-w-sm w-full p-6 space-y-4 text-xs text-text">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text">Set Your Password</h3>
            <p className="text-text-muted">
              Welcome, {currentUser.name}. Your account was created with a temporary password — set your own before continuing.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="font-semibold text-text-muted block mb-1">Temporary Password</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                className="glass-input w-full pl-3 pr-10 py-2.5 rounded-xl font-mono outline-none text-xs"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
              >
                {showCurrent ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-text-muted block mb-1">New Password (min. 8 characters)</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="glass-input w-full pl-3 pr-10 py-2.5 rounded-xl font-mono outline-none text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
              >
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          <div>
            <label className="font-semibold text-text-muted block mb-1">Confirm New Password</label>
            <input
              type={showNew ? 'text' : 'password'}
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              className="glass-input w-full p-2.5 rounded-xl font-mono outline-none text-xs"
              required
            />
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{submitting ? 'Saving…' : 'Set Password & Continue'}</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="w-full py-2 text-text-muted hover:text-text text-[11px] flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Log out instead</span>
          </button>
        </form>
      </div>
    </div>
  );
};
