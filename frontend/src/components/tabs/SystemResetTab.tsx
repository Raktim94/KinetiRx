import React, { useState, useEffect } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Database,
  Download,
  Eye,
  EyeOff,
  FileCheck2,
  History,
  KeyRound,
  Lock,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Trash2,
  Unlock,
  Upload,
  UserCheck,
} from 'lucide-react';
import {
  CurrentUser,
  Distributor,
  DailyRegisterState,
  Employee,
  ExpenseRecord,
  InvoiceConfig,
  MarketingCampaign,
  Medicine,
  NeededMedOrder,
  OPDVisit,
  OrganizationOnboardingData,
  PatientRecord,
  SalesRecord,
  SystemBackupSnapshot,
  WorksheetTask,
} from '../../types';
import { ApiError, authApi } from '../../lib/api';

interface SystemResetTabProps {
  currentUser?: CurrentUser;
  /** @deprecated no longer used for verification (kept for prop-shape
   * stability) — password checks now go through a real POST /api/auth/login
   * call against currentUser's own credentials, since the backend never
   * exposes a plaintext admin password to the client. */
  adminPass: string;
  invoiceConfig: InvoiceConfig;
  medicines: Medicine[];
  salesHistory: SalesRecord[];
  dailyRegister: DailyRegisterState;
  expenses: ExpenseRecord[];
  patients: PatientRecord[];
  neededMeds: NeededMedOrder[];
  opdVisits: OPDVisit[];
  marketingCampaigns: MarketingCampaign[];
  worksheetTasks: WorksheetTask[];
  employees: Employee[];
  distributors: Distributor[];
  backupSnapshots: SystemBackupSnapshot[];
  onExecuteFactoryReset: (
    onboardingData: OrganizationOnboardingData,
    newAdminPass: string
  ) => void;
  onRestoreSnapshot: (snapshot: SystemBackupSnapshot) => void;
  onCreateManualSnapshot: (label?: string) => void;
  onDeleteSnapshot: (snapshotId: string) => void;
  onRestoreFromFile: (fileContent: string) => boolean;
}

export const SystemResetTab: React.FC<SystemResetTabProps> = ({
  currentUser,
  adminPass,
  invoiceConfig,
  medicines,
  salesHistory,
  dailyRegister,
  expenses,
  patients,
  neededMeds,
  opdVisits,
  marketingCampaigns,
  worksheetTasks,
  employees,
  distributors,
  backupSnapshots,
  onExecuteFactoryReset,
  onRestoreSnapshot,
  onCreateManualSnapshot,
  onDeleteSnapshot,
  onRestoreFromFile,
}) => {
  // Password Verification State
  const [enteredPass, setEnteredPass] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [passError, setPassError] = useState<string | null>(null);

  // Active Tab View: 'reset_wizard' | 'backups' | 'file_transfer'
  const [activeSubTab, setActiveSubTab] = useState<'reset_wizard' | 'backups' | 'file_transfer'>('reset_wizard');

  // New Organization Onboarding Form State
  const [onboardingForm, setOnboardingForm] = useState<OrganizationOnboardingData>({
    storeName: invoiceConfig.storeName || invoiceConfig.name || '',
    subtitle: invoiceConfig.subtitle || '',
    phone: invoiceConfig.phone || '',
    address: invoiceConfig.addr || '',
    gstin: invoiceConfig.gstin || invoiceConfig.gst || '',
    dlNo: invoiceConfig.dl || '',
    currency: invoiceConfig.currency || '₹',
    openingCash: 0,
    adminPassword: '',
    directorName: invoiceConfig.director || '',
    pharmacistName: invoiceConfig.pharmacist || '',
    welcomeNotes: 'Welcome to our pharmacy & healthcare centre.',
  });

  const [confirmResetText, setConfirmResetText] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [snapshotToRestore, setSnapshotToRestore] = useState<SystemBackupSnapshot | null>(null);
  const [restorePass, setRestorePass] = useState('');
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const [newSnapshotLabel, setNewSnapshotLabel] = useState('');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [verifyingPass, setVerifyingPass] = useState(false);

  // Check admin authorization by actually re-authenticating against the
  // server with the currently signed-in employee's id and the entered
  // password — the client never holds a plaintext password to compare
  // against locally.
  const verifyPassword = async () => {
    if (!currentUser) {
      setPassError('No signed-in user context available.');
      return;
    }
    setVerifyingPass(true);
    setPassError(null);
    try {
      await authApi.login(currentUser.id, enteredPass);
      setIsUnlocked(true);
      setStatusMessage({ type: 'success', text: 'Admin authorization verified successfully.' });
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err) {
      setIsUnlocked(false);
      setPassError(
        err instanceof ApiError && err.status === 401
          ? 'Incorrect password. Please enter your current administrator password.'
          : 'Could not verify password with the server. Check your connection and try again.'
      );
    } finally {
      setVerifyingPass(false);
    }
  };

  // Helper to calculate time remaining until 5-day expiration
  const getRemainingTimeText = (expiresAtIso: string) => {
    const diffMs = new Date(expiresAtIso).getTime() - new Date().getTime();
    if (diffMs <= 0) {
      return { expired: true, text: 'Expired (> 5 Days)' };
    }
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return { expired: false, text: `${diffDays}d ${diffHours}h remaining` };
    }
    return { expired: false, text: `${diffHours}h ${diffMins}m remaining` };
  };

  // Handle Reset Execution
  const handleExecuteReset = (e: React.FormEvent) => {
    e.preventDefault();

    if (!isUnlocked) {
      setPassError('Please unlock with Admin Password before executing reset.');
      return;
    }

    if (confirmResetText.trim().toUpperCase() !== 'RESET') {
      setStatusMessage({
        type: 'error',
        text: 'Please type "RESET" in the confirmation box to confirm factory reset.',
      });
      return;
    }

    if (!onboardingForm.storeName.trim()) {
      setStatusMessage({
        type: 'error',
        text: 'Please specify the New Organization / Pharmacy Name.',
      });
      return;
    }

    const finalNewAdminPass = onboardingForm.adminPassword?.trim() || adminPass;
    onExecuteFactoryReset(onboardingForm, finalNewAdminPass);
    setConfirmResetText('');
    setStatusMessage({
      type: 'success',
      text: '🎉 System successfully reset! 5-Day backup saved. Fresh organization initialized.',
    });
  };

  // Handle Snapshot Restore Confirmation
  const handleConfirmRestore = async () => {
    if (!snapshotToRestore) return;
    if (!currentUser) {
      setRestoreError('No signed-in user context available.');
      return;
    }
    try {
      await authApi.login(currentUser.id, restorePass);
    } catch (err) {
      setRestoreError(
        err instanceof ApiError && err.status === 401
          ? 'Incorrect password. Authorization required to restore backup.'
          : 'Could not verify password with the server. Check your connection and try again.'
      );
      return;
    }

    const remaining = getRemainingTimeText(snapshotToRestore.expiresAt);
    if (remaining.expired) {
      const proceed = confirm(
        'Warning: This backup was taken more than 5 days ago. Do you still want to restore this older backup snapshot?'
      );
      if (!proceed) return;
    }

    onRestoreSnapshot(snapshotToRestore);
    setSnapshotToRestore(null);
    setRestorePass('');
    setRestoreError(null);
    setStatusMessage({
      type: 'success',
      text: `✅ Backup "${snapshotToRestore.label}" successfully restored!`,
    });
  };

  // Download Offline Backup JSON
  const handleDownloadJSON = (snapshot?: SystemBackupSnapshot) => {
    const dataToExport = snapshot
      ? snapshot.payload
      : {
          exportDate: new Date().toISOString(),
          medicines,
          salesHistory,
          dailyRegister,
          expenses,
          patients,
          neededMeds,
          opdVisits,
          marketingCampaigns,
          worksheetTasks,
          employees,
          invoiceConfig,
          distributors,
        };

    const fileName = `pharma_care_backup_${new Date().toISOString().slice(0, 10)}.json`;
    const jsonStr = JSON.stringify(dataToExport, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatusMessage({ type: 'success', text: `Downloaded backup file: ${fileName}` });
  };

  // Upload Offline Backup JSON
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!isUnlocked) {
      setStatusMessage({
        type: 'error',
        text: 'Please unlock with Admin Password before restoring from a file.',
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = event => {
      try {
        const content = event.target?.result as string;
        const success = onRestoreFromFile(content);
        if (success) {
          setStatusMessage({
            type: 'success',
            text: `✅ File "${file.name}" restored successfully!`,
          });
        } else {
          setStatusMessage({
            type: 'error',
            text: 'Failed to restore: Invalid backup file format.',
          });
        }
      } catch (err) {
        setStatusMessage({
          type: 'error',
          text: 'Error parsing JSON file. Please ensure it is a valid backup.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6 text-text max-w-6xl mx-auto pb-12">
      {/* 1. TOP HEADER BANNER */}
      <div className="p-6 rounded-3xl bg-danger/8 backdrop-blur-2xl border border-danger/30 shadow-2xl flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-8 h-8 rounded-xl bg-danger/20 border border-danger/40 flex items-center justify-center text-danger">
              <RotateCcw className="w-4 h-4" />
            </div>
            <h3 className="text-xl font-bold text-text tracking-tight">
              System Factory Reset & 5-Day Backup Hub
            </h3>
            <span className="bg-rose-500/20 text-rose-700 dark:text-rose-300 text-xs px-2.5 py-0.5 rounded-full font-bold border border-rose-500/30">
              Admin Only
            </span>
          </div>
          <p className="text-xs text-text-muted max-w-2xl leading-relaxed">
            Reset the software for new organization handover, clear demo records, configure initial store parameters, and manage 5-day rolling safety backups with one-click restore.
          </p>
        </div>

        {/* Security Lock Badge */}
        <div className="flex items-center gap-3">
          {isUnlocked ? (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 text-xs font-bold shadow-lg">
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Admin Authorized</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-700 dark:text-rose-300 text-xs font-bold shadow-lg animate-pulse">
              <Lock className="w-4 h-4 text-rose-600 dark:text-rose-400" />
              <span>Admin Locked</span>
            </div>
          )}
        </div>
      </div>

      {/* STATUS ALERT TOAST */}
      {statusMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between text-xs font-semibold backdrop-blur-xl transition-all shadow-xl ${
            statusMessage.type === 'success'
              ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-800 dark:text-emerald-200'
              : 'bg-rose-500/20 border-rose-500/40 text-rose-800 dark:text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-text-muted hover:text-text text-xs ml-4"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. ADMIN PASSWORD AUTHENTICATION GATEWAY */}
      {!isUnlocked && (
        <div className="p-6 rounded-3xl bg-surface/5 backdrop-blur-2xl border border-rose-500/30 shadow-2xl space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text">Administrator Security Verification</h4>
              <p className="text-xs text-text-muted">
                System reset and backup restoration are restricted. Please enter the current Administrator Password to unlock controls.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <div className="relative flex-1">
              <input
                type={showPassword ? 'text' : 'password'}
                id="input-admin-pass-unlock"
                value={enteredPass}
                onChange={e => {
                  setEnteredPass(e.target.value);
                  setPassError(null);
                }}
                onKeyDown={e => e.key === 'Enter' && verifyPassword()}
                placeholder="Enter Administrator Password"
                className="w-full pl-4 pr-10 py-2.5 bg-bg/80 border border-border rounded-2xl text-text text-xs outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/20 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            <button
              id="btn-unlock-admin-reset"
              onClick={verifyPassword}
              className="btn-danger px-6 py-2.5 rounded-2xl text-xs"
            >
              <Unlock className="w-4 h-4" />
              <span>Verify & Unlock</span>
            </button>
          </div>

          {passError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1.5 mt-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{passError}</span>
            </p>
          )}
        </div>
      )}

      {/* 3. NAVIGATION SUB-TABS */}
      <div className="flex items-center gap-2 border-b border-border pb-3 flex-wrap">
        <button
          id="subtab-reset-wizard"
          onClick={() => setActiveSubTab('reset_wizard')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'reset_wizard'
              ? 'bg-rose-600 text-text shadow-lg border border-rose-400/30'
              : 'bg-surface/5 text-text-muted hover:text-text hover:bg-surface/10 border border-border'
          }`}
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Factory Reset & New Organization Setup</span>
        </button>

        <button
          id="subtab-backups"
          onClick={() => setActiveSubTab('backups')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'backups'
              ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 border border-primary/40'
              : 'bg-surface/5 text-text-muted hover:text-text hover:bg-surface/10 border border-border'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          <span>5-Day Rolling Backups & Restore</span>
          <span className="bg-surface/20 text-text text-[10px] px-1.5 py-0.2 rounded-full font-mono">
            {backupSnapshots.length}
          </span>
        </button>

        <button
          id="subtab-file-transfer"
          onClick={() => setActiveSubTab('file_transfer')}
          className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
            activeSubTab === 'file_transfer'
              ? 'bg-purple-600 text-text shadow-lg border border-purple-400/30'
              : 'bg-surface/5 text-text-muted hover:text-text hover:bg-surface/10 border border-border'
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Manual Snapshot & JSON Export/Import</span>
        </button>
      </div>

      {/* 4A. SUBTAB 1: FACTORY RESET WIZARD */}
      {activeSubTab === 'reset_wizard' && (
        <div className="space-y-6">
          {/* Current System Overview Card */}
          <div className="p-5 rounded-3xl bg-surface/5 backdrop-blur-xl border border-border shadow-xl">
            <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted mb-3 flex items-center gap-2">
              <Database className="w-4 h-4 text-primary" />
              <span>Current System Data Summary (Will be backed up for 5 Days before wipe)</span>
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3 text-center">
              <div className="p-3 rounded-2xl bg-surface/5 border border-border">
                <p className="text-[10px] text-text-muted">Medicine SKUs</p>
                <p className="text-base font-bold text-text font-mono mt-0.5">{medicines.length}</p>
              </div>
              <div className="p-3 rounded-2xl bg-surface/5 border border-border">
                <p className="text-[10px] text-text-muted">Sales Invoices</p>
                <p className="text-base font-bold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{salesHistory.length}</p>
              </div>
              <div className="p-3 rounded-2xl bg-surface/5 border border-border">
                <p className="text-[10px] text-text-muted">Patients</p>
                <p className="text-base font-bold text-teal-600 dark:text-teal-400 font-mono mt-0.5">{patients.length}</p>
              </div>
              <div className="p-3 rounded-2xl bg-surface/5 border border-border">
                <p className="text-[10px] text-text-muted">OPD Records</p>
                <p className="text-base font-bold text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">{opdVisits.length}</p>
              </div>
              <div className="p-3 rounded-2xl bg-surface/5 border border-border">
                <p className="text-[10px] text-text-muted">Expenses</p>
                <p className="text-base font-bold text-orange-600 dark:text-orange-400 font-mono mt-0.5">{expenses.length}</p>
              </div>
              <div className="p-3 rounded-2xl bg-surface/5 border border-border">
                <p className="text-[10px] text-text-muted">Staff Accounts</p>
                <p className="text-base font-bold text-purple-600 dark:text-purple-400 font-mono mt-0.5">{employees.length}</p>
              </div>
            </div>
          </div>

          {/* New Organization Onboarding Form */}
          <form onSubmit={handleExecuteReset} className="space-y-6">
            <div className="p-6 rounded-3xl bg-surface/5 backdrop-blur-2xl border border-border shadow-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-border pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-text">
                      New Organization & Clean Setup Details
                    </h4>
                    <p className="text-xs text-text-muted">
                      Enter the new company, clinic, or pharmacy details to start completely clean after reset.
                    </p>
                  </div>
                </div>
                <span className="text-xs bg-primary/20 text-primary px-3 py-1 rounded-xl border border-primary/30 font-semibold hidden sm:inline">
                  Step 1: Fill New Details
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="font-semibold text-text-muted block mb-1.5">
                    Organization / Pharmacy Name <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="new-org-name"
                    value={onboardingForm.storeName}
                    onChange={e => setOnboardingForm({ ...onboardingForm, storeName: e.target.value })}
                    className="w-full p-2.5 bg-bg/80 border border-border rounded-xl text-text outline-none focus:border-primary font-medium"
                    placeholder="e.g. M.R.S. Medical & Diagnostic Centre"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-text-muted block mb-1.5">
                    Tagline / Subtitle / Specialization
                  </label>
                  <input
                    type="text"
                    id="new-org-subtitle"
                    value={onboardingForm.subtitle}
                    onChange={e => setOnboardingForm({ ...onboardingForm, subtitle: e.target.value })}
                    className="w-full p-2.5 bg-bg/80 border border-border rounded-xl text-text outline-none focus:border-primary"
                    placeholder="e.g. Complete Healthcare & Medicine Store"
                  />
                </div>

                <div>
                  <label className="font-semibold text-text-muted block mb-1.5">
                    Primary Phone / WhatsApp Number <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="new-org-phone"
                    value={onboardingForm.phone}
                    onChange={e => setOnboardingForm({ ...onboardingForm, phone: e.target.value })}
                    className="w-full p-2.5 bg-bg/80 border border-border rounded-xl text-text outline-none focus:border-primary font-mono"
                    placeholder="e.g. 9876543210"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-text-muted block mb-1.5">
                    Drug License Number (D.L. No.)
                  </label>
                  <input
                    type="text"
                    id="new-org-dl"
                    value={onboardingForm.dlNo}
                    onChange={e => setOnboardingForm({ ...onboardingForm, dlNo: e.target.value })}
                    className="w-full p-2.5 bg-bg/80 border border-border rounded-xl text-text outline-none focus:border-primary font-mono"
                    placeholder="e.g. DL-2026-WB-8899"
                  />
                </div>

                <div>
                  <label className="font-semibold text-text-muted block mb-1.5">
                    GSTIN Number
                  </label>
                  <input
                    type="text"
                    id="new-org-gstin"
                    value={onboardingForm.gstin}
                    onChange={e => setOnboardingForm({ ...onboardingForm, gstin: e.target.value })}
                    className="w-full p-2.5 bg-bg/80 border border-border rounded-xl text-text outline-none focus:border-primary font-mono"
                    placeholder="e.g. 19ABCDE1234F1Z5"
                  />
                </div>

                <div>
                  <label className="font-semibold text-text-muted block mb-1.5">
                    Opening Cash in Drawer (₹)
                  </label>
                  <input
                    type="number"
                    id="new-org-cash"
                    value={onboardingForm.openingCash}
                    onChange={e => setOnboardingForm({ ...onboardingForm, openingCash: parseFloat(e.target.value) || 0 })}
                    className="w-full p-2.5 bg-bg/80 border border-border rounded-xl text-text outline-none focus:border-primary font-mono"
                    placeholder="0"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="font-semibold text-text-muted block mb-1.5">
                    Complete Shop / Facility Address <span className="text-rose-600 dark:text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    id="new-org-address"
                    value={onboardingForm.address}
                    onChange={e => setOnboardingForm({ ...onboardingForm, address: e.target.value })}
                    className="w-full p-2.5 bg-bg/80 border border-border rounded-xl text-text outline-none focus:border-primary"
                    placeholder="e.g. 12/B Medical Square, Station Road, District Center"
                    required
                  />
                </div>

                <div>
                  <label className="font-semibold text-text-muted block mb-1.5">
                    Director / Doctor In-Charge Name
                  </label>
                  <input
                    type="text"
                    id="new-org-director"
                    value={onboardingForm.directorName}
                    onChange={e => setOnboardingForm({ ...onboardingForm, directorName: e.target.value })}
                    className="w-full p-2.5 bg-bg/80 border border-border rounded-xl text-text outline-none focus:border-primary"
                    placeholder="e.g. Dr. A. K. Sharma"
                  />
                </div>

                <div>
                  <label className="font-semibold text-text-muted block mb-1.5">
                    Admin Master Password (Optional: Leave blank to retain current)
                  </label>
                  <input
                    type="password"
                    id="new-org-newpass"
                    value={onboardingForm.adminPassword || ''}
                    onChange={e => setOnboardingForm({ ...onboardingForm, adminPassword: e.target.value })}
                    className="w-full p-2.5 bg-bg/80 border border-border rounded-xl text-text outline-none focus:border-primary font-mono"
                    placeholder="Enter new admin password or leave empty"
                  />
                </div>
              </div>
            </div>

            {/* Confirmation & Reset Action Box */}
            <div className="p-6 rounded-3xl bg-rose-950/40 backdrop-blur-2xl border border-rose-500/40 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
                  <AlertOctagon className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-rose-800 dark:text-rose-200">
                    Step 2: Confirm System Factory Reset & Automatic 5-Day Safety Snapshot
                  </h4>
                  <p className="text-xs text-rose-700 dark:text-rose-300/80 leading-relaxed mt-0.5">
                    Clicking execute will clear all demo/current inventory, invoices, expenses, patients, and OPD records. An automated full backup snapshot will be saved in your 5-day archive so you can restore it anytime if needed.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="font-semibold text-xs text-rose-800 dark:text-rose-200 block mb-1">
                    Type <span className="font-mono bg-rose-500/30 px-1.5 py-0.5 rounded text-text">RESET</span> to confirm:
                  </label>
                  <input
                    type="text"
                    id="input-confirm-reset"
                    value={confirmResetText}
                    onChange={e => setConfirmResetText(e.target.value)}
                    placeholder="Type RESET"
                    className="w-full p-2.5 bg-bg/90 border border-rose-500/50 rounded-xl text-text text-xs font-mono outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-500/30"
                  />
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    id="btn-execute-factory-reset"
                    disabled={!isUnlocked || confirmResetText.trim().toUpperCase() !== 'RESET'}
                    className={`w-full py-2.5 px-4 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition shadow-lg ${
                      isUnlocked && confirmResetText.trim().toUpperCase() === 'RESET'
                        ? 'bg-danger hover:brightness-105 text-primary-foreground cursor-pointer'
                        : 'bg-surface/10 text-text-muted border border-border cursor-not-allowed'
                    }`}
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Execute Factory Reset & Save 5-Day Backup</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* 4B. SUBTAB 2: 5-DAY ROLLING BACKUPS & RESTORE LIST */}
      {activeSubTab === 'backups' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <h4 className="text-sm font-bold text-text flex items-center gap-2">
                <History className="w-4 h-4 text-primary" />
                <span>5-Day Active Backup Snapshots</span>
              </h4>
              <p className="text-xs text-text-muted">
                Snapshots created during reset or manual capture. Stored for 5 days with instant one-click restore.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newSnapshotLabel}
                onChange={e => setNewSnapshotLabel(e.target.value)}
                placeholder="Snapshot label (optional)"
                className="px-3 py-1.5 bg-bg/80 border border-border rounded-xl text-text text-xs outline-none focus:border-primary font-mono"
              />
              <button
                id="btn-create-instant-snapshot"
                onClick={() => {
                  onCreateManualSnapshot(newSnapshotLabel.trim() || undefined);
                  setNewSnapshotLabel('');
                  setStatusMessage({ type: 'success', text: '✅ Instant backup snapshot created successfully!' });
                }}
                className="bg-primary hover:bg-primary-hover text-primary-foreground px-3.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-primary/30 transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Take Snapshot Now</span>
              </button>
            </div>
          </div>

          {backupSnapshots.length === 0 ? (
            <div className="p-8 rounded-3xl bg-surface/5 backdrop-blur-xl border border-border text-center space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center mx-auto">
                <Database className="w-6 h-6" />
              </div>
              <h5 className="text-sm font-bold text-text">No Backup Snapshots Saved Yet</h5>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                Whenever you perform a factory reset, or click "Take Snapshot Now", a full 5-day backup is created here automatically.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {backupSnapshots.map(snap => {
                const remaining = getRemainingTimeText(snap.expiresAt);
                const createdDate = new Date(snap.createdAt).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });
                const expiresDate = new Date(snap.expiresAt).toLocaleString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={snap.id}
                    className="p-5 rounded-3xl bg-surface/5 backdrop-blur-xl border border-border hover:border-primary/40 transition-all shadow-xl space-y-4"
                  >
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h5 className="text-sm font-bold text-text">{snap.label}</h5>
                          {snap.reason === 'pre_reset_auto' && (
                            <span className="bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] px-2 py-0.5 rounded-full font-semibold border border-rose-500/30">
                              Pre-Reset Auto Backup
                            </span>
                          )}
                          {snap.reason === 'manual_snapshot' && (
                            <span className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-semibold border border-primary/30">
                              Manual Snapshot
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-text-muted mt-1">
                          <span>Captured: {createdDate}</span>
                          <span>•</span>
                          <span>Expires: {expiresDate}</span>
                        </div>
                      </div>

                      {/* Remaining Badge */}
                      <div className="flex items-center gap-2">
                        {remaining.expired ? (
                          <span className="bg-surface text-text-muted text-xs px-3 py-1 rounded-xl border border-border flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-text-muted" />
                            <span>Expired (&gt; 5 Days)</span>
                          </span>
                        ) : (
                          <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs px-3 py-1 rounded-xl border border-emerald-500/30 font-semibold flex items-center gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>Active: {remaining.text}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Snapshot Stats Bar */}
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-xs text-text-muted bg-bg/60 p-3 rounded-2xl border border-border font-mono">
                      <div>
                        <span className="text-text-muted block text-[10px]">Medicines:</span>
                        <span className="font-bold text-text">{snap.counts.medicines} SKUs</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">Sales:</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">{snap.counts.sales} Invoices</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">Patients:</span>
                        <span className="font-bold text-teal-600 dark:text-teal-400">{snap.counts.patients} Registered</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">OPD Consults:</span>
                        <span className="font-bold text-cyan-600 dark:text-cyan-400">{snap.counts.opdVisits} Visits</span>
                      </div>
                      <div>
                        <span className="text-text-muted block text-[10px]">Expenses:</span>
                        <span className="font-bold text-orange-600 dark:text-orange-400">{snap.counts.expenses} Records</span>
                      </div>
                    </div>

                    {/* Snapshot Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleDownloadJSON(snap)}
                          className="px-3 py-1.5 bg-surface/10 hover:bg-surface/15 text-text rounded-xl text-xs flex items-center gap-1.5 font-medium transition cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-primary" />
                          <span>Export JSON</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onDeleteSnapshot(snap.id)}
                          className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-700 dark:text-rose-300 rounded-xl text-xs flex items-center gap-1 transition cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>

                        <button
                          id={`btn-restore-snap-${snap.id}`}
                          onClick={() => {
                            setSnapshotToRestore(snap);
                            setRestorePass('');
                            setRestoreError(null);
                          }}
                          className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-text rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Restore This Backup</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4C. SUBTAB 3: MANUAL SNAPSHOT & JSON EXPORT/IMPORT */}
      {activeSubTab === 'file_transfer' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Download JSON Backup */}
          <div className="p-6 rounded-3xl bg-surface/5 backdrop-blur-2xl border border-border shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text">Download Full System Backup (.JSON)</h4>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Save an encrypted offsite copy of your entire database (Medicines, Sales Invoices, Expenses, Clinical OPD, Patients, Staff, and Store Settings) to your computer.
              </p>
            </div>
            <button
              id="btn-download-full-json"
              onClick={() => handleDownloadJSON()}
              className="w-full py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-primary/30 transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download JSON Backup File</span>
            </button>
          </div>

          {/* Restore from JSON Backup */}
          <div className="p-6 rounded-3xl bg-surface/5 backdrop-blur-2xl border border-border shadow-2xl space-y-4">
            <div className="w-10 h-10 rounded-2xl bg-purple-500/20 border border-purple-500/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-text">Restore From Backup File (.JSON)</h4>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                Upload a previously exported JSON backup file to completely restore your pharmacy database. Requires Admin authorization.
              </p>
            </div>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />

            <button
              id="btn-upload-json-backup"
              onClick={() => {
                if (!isUnlocked) {
                  setPassError('Please unlock with Admin Password above before uploading a restore file.');
                  return;
                }
                fileInputRef.current?.click();
              }}
              className="w-full py-2.5 bg-purple-600 hover:bg-purple-500 text-text rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg transition cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload & Restore Backup File</span>
            </button>
          </div>
        </div>
      )}

      {/* 5. RESTORE CONFIRMATION MODAL */}
      {snapshotToRestore && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-surface border border-emerald-500/40 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-border pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-text">Restore Backup Snapshot</h4>
                <p className="text-xs text-text-muted">{snapshotToRestore.label}</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-surface/5 border border-border space-y-2 text-xs">
              <p className="text-text-muted">
                You are about to restore this backup created on{' '}
                <span className="font-mono text-emerald-700 dark:text-emerald-300">
                  {new Date(snapshotToRestore.createdAt).toLocaleString()}
                </span>
                . Current data will be replaced by the snapshot's contents.
              </p>
              <div className="font-mono text-text-muted grid grid-cols-2 gap-2 pt-2 border-t border-border">
                <span>• {snapshotToRestore.counts.medicines} Medicines</span>
                <span>• {snapshotToRestore.counts.sales} Sales Invoices</span>
                <span>• {snapshotToRestore.counts.patients} Patients</span>
                <span>• {snapshotToRestore.counts.opdVisits} OPD Consultations</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-muted block">
                Enter Administrator Password to confirm restore:
              </label>
              <input
                type="password"
                value={restorePass}
                onChange={e => {
                  setRestorePass(e.target.value);
                  setRestoreError(null);
                }}
                placeholder="Admin Password"
                className="w-full p-2.5 bg-bg border border-border rounded-xl text-text text-xs font-mono outline-none focus:border-emerald-400"
              />
              {restoreError && (
                <p className="text-xs text-rose-600 dark:text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{restoreError}</span>
                </p>
              )}
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => {
                  setSnapshotToRestore(null);
                  setRestorePass('');
                  setRestoreError(null);
                }}
                className="px-4 py-2 bg-surface/10 hover:bg-surface/15 text-text-muted rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmRestore}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-text rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg transition cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Confirm & Restore</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
