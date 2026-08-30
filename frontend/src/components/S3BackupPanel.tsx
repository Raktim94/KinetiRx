import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  Download,
  History,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Trash2,
  Upload,
  XCircle,
} from 'lucide-react';
import { ApiError, backupApi, BackupConfigStatus, BackupRecord, BackupStatus } from '../lib/api';

function formatBytes(n?: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export const S3BackupPanel: React.FC = () => {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [history, setHistory] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  // Config form
  const [showConfigForm, setShowConfigForm] = useState(false);
  const [endpoint, setEndpoint] = useState('');
  const [bucket, setBucket] = useState('');
  const [region, setRegion] = useState('auto');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [intervalDays, setIntervalDays] = useState('3');
  const [retainCount, setRetainCount] = useState('5');
  const [saving, setSaving] = useState(false);

  const [triggering, setTriggering] = useState(false);
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [confirmText, setConfirmText] = useState('');

  const [downloading, setDownloading] = useState(false);
  const [showUploadRestore, setShowUploadRestore] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadConfirmText, setUploadConfirmText] = useState('');
  const [restoringUpload, setRestoringUpload] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadAll = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [s, h] = await Promise.all([backupApi.status(), backupApi.list()]);
      setStatus(s);
      setHistory(h.backups || []);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.describe() : 'Could not reach the KinetiRx server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showNotice = (ok: boolean, msg: string) => {
    setNotice({ ok, msg });
    window.setTimeout(() => setNotice(null), 5000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!endpoint.trim() || !bucket.trim() || !accessKeyId.trim() || !secretAccessKey.trim()) {
      showNotice(false, 'Endpoint, bucket, access key ID and secret access key are all required.');
      return;
    }
    setSaving(true);
    try {
      await backupApi.saveConfig({
        endpoint: endpoint.trim(),
        bucket: bucket.trim(),
        region: region.trim() || 'auto',
        accessKeyId: accessKeyId.trim(),
        secretAccessKey: secretAccessKey.trim(),
        intervalDays: parseInt(intervalDays, 10) || 3,
        retainCount: parseInt(retainCount, 10) || 5,
      });
      showNotice(true, 'Backup destination saved and verified.');
      setSecretAccessKey('');
      setShowConfigForm(false);
      await loadAll();
    } catch (err) {
      showNotice(false, err instanceof ApiError ? err.describe() : 'Could not save backup configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveDestination = async () => {
    if (!window.confirm('Remove this S3 backup destination? Existing backups already stored in the bucket are not deleted.')) return;
    try {
      await backupApi.deleteConfig();
      showNotice(true, 'Backup destination removed.');
      await loadAll();
    } catch (err) {
      showNotice(false, err instanceof ApiError ? err.describe() : 'Could not remove backup configuration.');
    }
  };

  const handleTriggerNow = async () => {
    setTriggering(true);
    try {
      await backupApi.triggerNow();
      showNotice(true, 'Backup completed and verified.');
      await loadAll();
    } catch (err) {
      showNotice(false, err instanceof ApiError ? err.describe() : 'Backup failed.');
    } finally {
      setTriggering(false);
    }
  };

  const handleRestoreFromHistory = async (id: string) => {
    if (confirmText.trim().toUpperCase() !== 'RESTORE') {
      showNotice(false, 'Type RESTORE in the confirmation box to proceed.');
      return;
    }
    setRestoringId(id);
    try {
      await backupApi.restoreFromHistory(id);
      showNotice(true, 'Database restored from backup.');
      setConfirmRestoreId(null);
      setConfirmText('');
    } catch (err) {
      showNotice(false, err instanceof ApiError ? err.describe() : 'Restore failed.');
    } finally {
      setRestoringId(null);
    }
  };

  const handleDownloadLocal = async () => {
    setDownloading(true);
    try {
      const { blob, filename } = await backupApi.downloadLocal();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showNotice(true, 'Backup downloaded.');
    } catch (err) {
      showNotice(false, err instanceof ApiError ? err.describe() : 'Download failed.');
    } finally {
      setDownloading(false);
    }
  };

  const handleRestoreFromUpload = async () => {
    if (!uploadFile) {
      showNotice(false, 'Choose a backup file first.');
      return;
    }
    if (uploadConfirmText.trim().toUpperCase() !== 'RESTORE') {
      showNotice(false, 'Type RESTORE in the confirmation box to proceed.');
      return;
    }
    setRestoringUpload(true);
    try {
      await backupApi.restoreFromUpload(uploadFile);
      showNotice(true, 'Database restored from the uploaded file.');
      setShowUploadRestore(false);
      setUploadFile(null);
      setUploadConfirmText('');
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      showNotice(false, err instanceof ApiError ? err.describe() : 'Restore failed.');
    } finally {
      setRestoringUpload(false);
    }
  };

  const cfg: BackupConfigStatus | null = status?.config ?? null;

  return (
    <div className="p-5 rounded-3xl bg-surface border border-border shadow-xl space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <CloudUpload className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text">S3 Offsite Backup</h4>
            <p className="text-[11px] text-text-muted">Automatic scheduled backup to your own S3-compatible storage, with verified restore.</p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadAll}
          disabled={loading}
          className="p-2 rounded-xl bg-bg hover:bg-surface-elevated border border-border text-text-muted hover:text-text transition cursor-pointer disabled:opacity-40"
          title="Refresh"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {notice && (
        <div
          className={`p-2.5 rounded-xl border text-xs font-semibold flex items-center gap-2 ${
            notice.ok
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-700 dark:text-rose-300'
          }`}
        >
          {notice.ok ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{notice.msg}</span>
        </div>
      )}

      {loadError && (
        <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs">
          {loadError}
        </div>
      )}

      {/* STATUS / CURRENT DESTINATION */}
      {cfg?.configured ? (
        <div className="p-3.5 rounded-2xl bg-bg border border-border space-y-2 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-bold text-text">{cfg.bucket}</span>
              <span className="text-text-muted"> @ {cfg.endpoint}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowConfigForm(v => !v)}
                className="px-2.5 py-1 rounded-lg bg-surface hover:bg-surface-elevated border border-border text-text-muted hover:text-text text-[11px] font-semibold transition cursor-pointer"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleRemoveDestination}
                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                title="Remove destination"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-text-muted font-mono">
            <span>Region: {cfg.region}</span>
            <span>Access Key: {cfg.accessKeyId}</span>
            <span>Every {cfg.intervalDays} day(s)</span>
            <span>Keep last {cfg.retainCount}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] pt-1 border-t border-border">
            <span className="text-text-muted">
              Last verified backup: <b className="text-text">{formatDateTime(status?.lastVerifiedAt)}</b>
            </span>
            {status?.nextDueAt && (
              <span className="text-text-muted">
                Next scheduled: <b className="text-text">{formatDateTime(status.nextDueAt)}</b>
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={handleTriggerNow}
            disabled={triggering}
            className="mt-1 px-3 py-2 bg-primary hover:bg-primary-hover disabled:opacity-40 text-primary-foreground rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${triggering ? 'animate-spin' : ''}`} />
            <span>{triggering ? 'Backing Up…' : 'Backup Now'}</span>
          </button>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
          No S3 backup destination configured yet. Add your own S3-compatible bucket below (AWS S3, Cloudflare R2, Backblaze B2, MinIO, RustFS — anything that speaks the S3 API).
        </div>
      )}

      {/* CONFIG FORM */}
      {(!cfg?.configured || showConfigForm) && (
        <form onSubmit={handleSaveConfig} className="p-3.5 rounded-2xl bg-bg border border-border space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="sm:col-span-2">
              <label className="text-[11px] text-text-muted block mb-1">Endpoint URL *</label>
              <input
                type="text"
                value={endpoint}
                onChange={e => setEndpoint(e.target.value)}
                placeholder="https://s3.your-provider.example.com"
                className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Bucket *</label>
              <input
                type="text"
                value={bucket}
                onChange={e => setBucket(e.target.value)}
                placeholder="kinetirx-backups"
                className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Region</label>
              <input
                type="text"
                value={region}
                onChange={e => setRegion(e.target.value)}
                placeholder="auto"
                className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Access Key ID *</label>
              <input
                type="text"
                value={accessKeyId}
                onChange={e => setAccessKeyId(e.target.value)}
                className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Secret Access Key *</label>
              <input
                type="password"
                value={secretAccessKey}
                onChange={e => setSecretAccessKey(e.target.value)}
                placeholder={cfg?.configured ? 'Leave blank to keep unchanged' : ''}
                className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs outline-none focus:border-primary"
                required={!cfg?.configured}
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Backup Interval (days)</label>
              <input
                type="number"
                min="1"
                max="30"
                value={intervalDays}
                onChange={e => setIntervalDays(e.target.value)}
                className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Keep Last N Backups</label>
              <input
                type="number"
                min="1"
                max="30"
                value={retainCount}
                onChange={e => setRetainCount(e.target.value)}
                className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            {cfg?.configured && (
              <button
                type="button"
                onClick={() => setShowConfigForm(false)}
                className="px-3 py-1.5 text-text-muted hover:text-text text-xs rounded-lg"
              >
                Cancel
              </button>
            )}
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-1.5 bg-primary hover:bg-primary-hover disabled:opacity-40 text-primary-foreground font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{saving ? 'Testing Connection…' : 'Save & Test Connection'}</span>
            </button>
          </div>
        </form>
      )}

      {/* LOCAL DOWNLOAD / RESTORE-FROM-FILE — work independently of S3 config */}
      <div className="p-3.5 rounded-2xl bg-bg border border-border space-y-2.5">
        <h5 className="text-xs font-bold text-text flex items-center gap-1.5">
          <Download className="w-3.5 h-3.5 text-primary" />
          <span>Local Backup File</span>
        </h5>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={handleDownloadLocal}
            disabled={downloading}
            className="px-3 py-2 bg-surface hover:bg-surface-elevated disabled:opacity-40 border border-border text-text rounded-xl font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{downloading ? 'Preparing…' : 'Download Local Backup'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowUploadRestore(v => !v)}
            className="px-3 py-2 bg-surface hover:bg-surface-elevated border border-border text-text rounded-xl font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Restore from Local Backup File</span>
          </button>
        </div>

        {showUploadRestore && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
            <p className="text-[11px] text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>This overwrites the live database with the contents of the uploaded file. This cannot be undone.</span>
            </p>
            <input
              ref={fileInputRef}
              type="file"
              onChange={e => setUploadFile(e.target.files?.[0] || null)}
              className="w-full text-xs text-text-muted file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-surface file:text-text file:text-xs file:cursor-pointer"
            />
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-text-muted">
                Type <span className="font-mono bg-rose-500/30 px-1.5 py-0.5 rounded text-text font-bold">RESTORE</span> to confirm:
              </span>
              <input
                type="text"
                value={uploadConfirmText}
                onChange={e => setUploadConfirmText(e.target.value)}
                placeholder="Type RESTORE"
                className="flex-1 p-1.5 bg-surface border border-border rounded-lg text-text font-mono text-xs outline-none focus:border-rose-400"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowUploadRestore(false)}
                className="px-3 py-1.5 text-text-muted hover:text-text text-xs rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleRestoreFromUpload}
                disabled={restoringUpload || uploadConfirmText.trim().toUpperCase() !== 'RESTORE' || !uploadFile}
                className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{restoringUpload ? 'Restoring…' : 'Restore Now'}</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* BACKUP HISTORY */}
      <div className="space-y-2">
        <h5 className="text-xs font-bold text-text flex items-center gap-1.5">
          <History className="w-3.5 h-3.5 text-primary" />
          <span>Backup History</span>
        </h5>
        {history.length === 0 ? (
          <p className="text-[11px] text-text-muted">No backups recorded yet.</p>
        ) : (
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {history.map(rec => (
              <div key={rec.id} className="p-2.5 rounded-xl bg-bg border border-border text-[11px] space-y-1.5">
                <div className="flex items-center justify-between flex-wrap gap-1.5">
                  <div className="flex items-center gap-1.5">
                    {rec.status === 'verified' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />}
                    {rec.status === 'failed' && <XCircle className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />}
                    {rec.status === 'pending' && <RefreshCw className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 animate-spin" />}
                    <span className="font-bold text-text">{formatDateTime(rec.startedAt)}</span>
                    <span className="text-text-muted font-mono">({rec.source})</span>
                  </div>
                  {rec.status === 'verified' && (
                    <button
                      type="button"
                      onClick={() => {
                        setConfirmRestoreId(confirmRestoreId === rec.id ? null : rec.id);
                        setConfirmText('');
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/15 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Restore</span>
                    </button>
                  )}
                </div>
                <div className="text-text-muted font-mono flex flex-wrap gap-x-3">
                  <span>{formatBytes(rec.sizeBytes)}</span>
                  {rec.sha256 && <span>sha256: {rec.sha256.slice(0, 12)}…</span>}
                  {rec.error && <span className="text-rose-600 dark:text-rose-400">{rec.error}</span>}
                </div>

                {confirmRestoreId === rec.id && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 space-y-2">
                    <p className="text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span>This overwrites the live database with this backup. This cannot be undone.</span>
                    </p>
                    <div className="flex items-center gap-2">
                      <span>
                        Type <span className="font-mono bg-rose-500/30 px-1.5 py-0.5 rounded text-text font-bold">RESTORE</span>:
                      </span>
                      <input
                        type="text"
                        value={confirmText}
                        onChange={e => setConfirmText(e.target.value)}
                        placeholder="Type RESTORE"
                        className="flex-1 p-1.5 bg-surface border border-border rounded-lg text-text font-mono text-xs outline-none focus:border-rose-400"
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmRestoreId(null)}
                        className="px-3 py-1.5 text-text-muted hover:text-text text-[11px] rounded-lg"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRestoreFromHistory(rec.id)}
                        disabled={restoringId === rec.id || confirmText.trim().toUpperCase() !== 'RESTORE'}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold rounded-lg text-[11px] transition cursor-pointer"
                      >
                        {restoringId === rec.id ? 'Restoring…' : 'Restore Now'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
