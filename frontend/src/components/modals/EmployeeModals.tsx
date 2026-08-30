import React, { useEffect, useState } from 'react';
import { AlertCircle, CheckCircle2, Copy, Eye, EyeOff, KeyRound, Lock, Plus, ShieldCheck, Users, X } from 'lucide-react';
import { Employee, TabType } from '../../types';
import { ApiError, authApi, employeesApi } from '../../lib/api';

const allAvailableModules: { id: TabType; label: string }[] = [
  { id: 'dashboard', label: 'Overview Analytics' },
  { id: 'pos', label: 'POS Billing Counter' },
  { id: 'daily-sales', label: 'Daily Sales Register' },
  { id: 'due-khata', label: 'Due Khata' },
  { id: 'medicine-orders', label: 'Special Medicine Orders' },
  { id: 'inventory', label: 'Medicine Stock ERP' },
  { id: 'inward-ocr', label: 'OCR Invoice Auto-Scan' },
  { id: 'opd', label: 'OPD & Patient Re-visits' },
  { id: 'patients', label: 'Patient Master Database' },
  { id: 'expenses', label: 'Daily Expenditures' },
  { id: 'business-dev', label: 'Doctor Campaign & Tasks' },
  { id: 'employee-mgmt', label: 'Employee Access Control' },
  { id: 'invoice-settings', label: 'Invoice & WhatsApp' },
];

// A static default password ('changeme123') would give every newly created
// employee account the exact same guessable password until they first log
// in — generate a random one instead so it's actually secret from creation.
function generateTempPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
  let out = '';
  for (let i = 0; i < 10; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveEmployee: (emp: Employee) => void;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSaveEmployee,
}) => {
  const [name, setName] = useState('');
  const [desig, setDesig] = useState('Pharmacist / Staff');
  const [pass, setPass] = useState(generateTempPassword);
  const [selectedPermissions, setSelectedPermissions] = useState<TabType[]>([
    'dashboard',
    'pos',
    'daily-sales',
    'inventory',
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ name: string; pass: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setName('');
      setDesig('Pharmacist / Staff');
      setPass(generateTempPassword());
      setSelectedPermissions(['dashboard', 'pos', 'daily-sales', 'inventory']);
      setSubmitting(false);
      setError(null);
      setCreated(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const togglePermission = (tab: TabType) => {
    if (selectedPermissions.includes(tab)) {
      setSelectedPermissions(selectedPermissions.filter(t => t !== tab));
    } else {
      setSelectedPermissions([...selectedPermissions, tab]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Please enter employee name.');
      return;
    }
    const cleanPass = pass.trim();
    if (cleanPass.length < 8) {
      setError('Login password must be at least 8 characters (server requirement).');
      return;
    }

    setSubmitting(true);
    try {
      const createdEmp = await employeesApi.create({
        id: '',
        name: name.trim(),
        desig: desig.trim(),
        pass: cleanPass,
        permissions: selectedPermissions,
      } as Employee);
      onSaveEmployee(createdEmp);
      // Show the temp password back once — the server never returns it again.
      setCreated({ name: createdEmp.name, pass: cleanPass });
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : 'Could not reach the KinetiRx server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (created) {
    return (
      <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="glass-panel rounded-3xl max-w-sm w-full p-6 space-y-4 text-xs text-text animate-in zoom-in-95">
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <h3 className="text-sm font-bold text-text">Employee account created</h3>
          </div>
          <p className="text-text-muted">
            Share this temporary password with <span className="font-semibold text-text">{created.name}</span>. They'll be
            required to set their own password the first time they log in — the server won't show this again.
          </p>
          <div className="flex items-center justify-between gap-2 p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-text">
            <span>{created.pass}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(created.pass).catch(() => undefined)}
              className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer"
              title="Copy password"
            >
              <Copy className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex justify-end pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-text font-bold rounded-2xl shadow-lg transition cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs text-text max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-pink-500/20 border border-pink-500/30 flex items-center justify-center text-pink-600 dark:text-pink-400">
              <Users className="w-4 h-4" />
            </div>
            <span>Add New Staff / Employee</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-medium text-text-muted block mb-1">Employee Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Rahul Sen"
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-text-muted block mb-1">Designation / Role</label>
              <input
                type="text"
                value={desig}
                onChange={e => setDesig(e.target.value)}
                placeholder="e.g. Dispensing Pharmacist"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
            </div>
            <div>
              <label className="font-medium text-text-muted block mb-1">Login Password (min. 8 chars)</label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  value={pass}
                  onChange={e => setPass(e.target.value)}
                  placeholder="min. 8 characters"
                  minLength={8}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
                  required
                />
                <button
                  type="button"
                  onClick={() => setPass(generateTempPassword())}
                  className="px-2.5 bg-surface hover:bg-surface-elevated border border-border rounded-xl text-text-muted hover:text-text transition cursor-pointer shrink-0"
                  title="Generate a new random password"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <div>
            <label className="font-medium text-text-muted block mb-2">
              Allowed Modules & Tabs:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border p-3 rounded-2xl bg-surface backdrop-blur-md">
              {allAvailableModules.map(m => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 p-2 hover:bg-surface rounded-xl cursor-pointer text-[11px] transition text-text"
                >
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(m.id)}
                    onChange={() => togglePermission(m.id)}
                    className="rounded text-pink-500 focus:ring-pink-500"
                  />
                  <span className="font-medium text-text">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-muted hover:text-text bg-surface hover:bg-bg rounded-2xl font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-text font-bold rounded-2xl shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
              <span>{submitting ? 'Saving…' : 'Save Employee'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  emp: Employee | null;
  onUpdateEmployee: (emp: Employee) => void;
}

export const EditEmployeeModal: React.FC<EditEmployeeModalProps> = ({
  isOpen,
  onClose,
  emp,
  onUpdateEmployee,
}) => {
  const [desig, setDesig] = useState('');
  const [pass, setPass] = useState('');
  const [permissions, setPermissions] = useState<TabType[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (emp) {
      setDesig(emp.desig);
      // Never prefill a password field from local state — the server never
      // sends the hash back, and this stays blank unless the admin is
      // deliberately resetting it (see the field's helper text below).
      setPass('');
      setPermissions(emp.permissions);
      setSubmitting(false);
      setError(null);
    }
  }, [emp, isOpen]);

  if (!isOpen || !emp) return null;

  const togglePermission = (tab: TabType) => {
    if (permissions.includes(tab)) {
      setPermissions(permissions.filter(t => t !== tab));
    } else {
      setPermissions([...permissions, tab]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (pass.trim() !== '' && pass.trim().length < 8) {
      setError('New password must be at least 8 characters long, or leave it blank to keep the existing one.');
      return;
    }

    setSubmitting(true);
    try {
      const updated = await employeesApi.update(emp.id, {
        ...emp,
        desig,
        pass: pass.trim(),
        permissions,
      });
      onUpdateEmployee(updated);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.describe() : 'Could not reach the KinetiRx server. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs text-text max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <span>Edit Permissions for {emp.name}</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-text-muted block mb-1">Designation</label>
              <input
                type="text"
                value={desig}
                onChange={e => setDesig(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
            </div>
            <div>
              <label className="font-medium text-text-muted block mb-1">New Password (optional)</label>
              <input
                type="text"
                value={pass}
                onChange={e => setPass(e.target.value)}
                placeholder="Leave blank to keep existing password"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
              <p className="text-[10px] text-text-muted mt-1">
                The server never sends the current password back — this field is blank unless you type a new one (min. 8 characters).
              </p>
            </div>
          </div>

          <div>
            <label className="font-medium text-text-muted block mb-2">Permitted Modules:</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto border border-border p-3 rounded-2xl bg-surface backdrop-blur-md">
              {allAvailableModules.map(m => (
                <label
                  key={m.id}
                  className="flex items-center gap-2 p-2 hover:bg-surface rounded-xl cursor-pointer text-[11px] transition text-text"
                >
                  <input
                    type="checkbox"
                    checked={permissions.includes(m.id)}
                    onChange={() => togglePermission(m.id)}
                    className="rounded text-sky-500 focus:ring-sky-500"
                  />
                  <span className="font-medium text-text">{m.label}</span>
                </label>
              ))}
            </div>
          </div>

          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-muted hover:text-text bg-surface hover:bg-bg rounded-2xl font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-text font-bold rounded-2xl shadow-lg transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving…' : 'Update Permissions'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface ChangeAdminPassModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPasswordChanged?: () => void;
}

export const ChangeAdminPassModal: React.FC<ChangeAdminPassModalProps> = ({
  isOpen,
  onClose,
  onPasswordChanged,
}) => {
  const [oldPass, setOldPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setOldPass('');
      setNewPass('');
      setConfirmPass('');
      setError(null);
      setSuccess(null);
      setShowOld(false);
      setShowNew(false);
      setShowConfirm(false);
      setSubmitting(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPass.trim().length < 8) {
      setError('New password must be at least 8 characters long (server requirement).');
      return;
    }
    if (newPass.trim() !== confirmPass.trim()) {
      setError('New password confirmation does not match.');
      return;
    }

    const cleanNewPass = newPass.trim();
    setSubmitting(true);
    try {
      await authApi.changePassword(oldPass, cleanNewPass);
    } catch (err) {
      setSubmitting(false);
      if (err instanceof ApiError && err.status === 401) {
        setError('Current password does not match. Please verify your existing password.');
      } else if (err instanceof ApiError) {
        setError(err.describe());
      } else {
        setError('Could not reach the KinetiRx server. Check your connection and try again.');
      }
      return;
    }
    setSubmitting(false);
    onPasswordChanged?.();
    setSuccess('Admin master password updated and saved automatically! The new password will be required next time.');

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-sm w-full p-6 space-y-4 text-xs text-text animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <KeyRound className="w-4 h-4" />
            </div>
            <span>Change Admin Master Password</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Current Password */}
          <div>
            <label className="font-semibold text-text-muted block mb-1">Current Admin Password</label>
            <div className="relative">
              <input
                type={showOld ? 'text' : 'password'}
                value={oldPass}
                onChange={e => {
                  setOldPass(e.target.value);
                  setError(null);
                }}
                placeholder="Enter current password"
                className="w-full pl-3 pr-10 py-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg text-xs"
                required
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
                title={showOld ? 'Hide password' : 'Show password'}
              >
                {showOld ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="font-semibold text-text-muted block mb-1">New Password (min. 8 characters)</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={newPass}
                onChange={e => {
                  setNewPass(e.target.value);
                  setError(null);
                }}
                placeholder="Enter new password"
                className="w-full pl-3 pr-10 py-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
                title={showNew ? 'Hide password' : 'Show password'}
              >
                {showNew ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="font-semibold text-text-muted block mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={confirmPass}
                onChange={e => {
                  setConfirmPass(e.target.value);
                  setError(null);
                }}
                placeholder="Re-enter new password"
                className="w-full pl-3 pr-10 py-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg text-xs"
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text p-1"
                title={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Error message */}
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-[11px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success message */}
          {success && (
            <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[11px] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{success}</span>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-muted hover:text-text bg-surface hover:bg-bg rounded-xl font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/40 transition cursor-pointer flex items-center gap-1.5 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{submitting ? 'Saving…' : 'Save & Update'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
