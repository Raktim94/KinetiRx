import React, { useEffect, useState } from 'react';
import { AlertTriangle, BrainCircuit, CheckCircle2, ExternalLink, RefreshCw, Save, Trash2 } from 'lucide-react';
import { AIProviderConfigStatus, ApiError, aiProviderApi } from '../lib/api';

function formatDateTime(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export const AIProviderPanel: React.FC = () => {
  const [status, setStatus] = useState<AIProviderConfigStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; msg: string } | null>(null);

  const [showConfigForm, setShowConfigForm] = useState(false);
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStatus = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setStatus(await aiProviderApi.getConfig());
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.describe() : 'Could not reach the KinetiRx server.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showNotice = (ok: boolean, msg: string) => {
    setNotice({ ok, msg });
    window.setTimeout(() => setNotice(null), 6000);
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUrl.trim() || !model.trim() || !apiKey.trim()) {
      showNotice(false, 'Base URL, model, and API key are all required.');
      return;
    }
    setSaving(true);
    try {
      await aiProviderApi.saveConfig({ baseUrl: baseUrl.trim(), model: model.trim(), apiKey: apiKey.trim() });
      showNotice(true, 'AI provider saved and verified.');
      setApiKey('');
      setShowConfigForm(false);
      await loadStatus();
    } catch (err) {
      showNotice(false, err instanceof ApiError ? err.describe() : 'Could not save AI provider configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    if (!window.confirm('Remove this AI provider? Bill scanning and the AI assistant will fall back to GEMINI_API_KEY (if set) or offline mode.')) return;
    try {
      await aiProviderApi.deleteConfig();
      showNotice(true, 'AI provider removed.');
      await loadStatus();
    } catch (err) {
      showNotice(false, err instanceof ApiError ? err.describe() : 'Could not remove AI provider configuration.');
    }
  };

  return (
    <div className="p-5 rounded-3xl bg-surface border border-border shadow-xl space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
            <BrainCircuit className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text">AI OCR / Vision Model</h4>
            <p className="text-[11px] text-text-muted max-w-xl">
              Accurate purchase-bill scanning and the clinical assistant, via any OpenAI-compatible endpoint —
              Gemini, OpenAI, OpenRouter, Groq, or a local Ollama vision model. Not just Google's native API.
              For Gemini, paste{' '}
              <code className="bg-surface border border-border rounded px-1 py-0.5 text-text">
                https://generativelanguage.googleapis.com/v1beta/openai
              </code>{' '}
              as the Base URL below — not a docs page link (
              <a
                href="https://ai.google.dev/gemini-api/docs/openai"
                target="_blank"
                rel="noopener noreferrer"
                className="underline hover:text-primary inline-flex items-center gap-0.5"
              >
                Gemini OpenAI-compat docs
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              , for reference only — pasting this link itself as the Base URL will fail).
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={loadStatus}
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

      {status?.configured ? (
        <div className="p-3.5 rounded-2xl bg-bg border border-border space-y-2 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="font-bold text-text">{status.model}</span>
              <span className="text-text-muted"> @ {status.baseUrl}</span>
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
                onClick={handleRemove}
                className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 transition cursor-pointer"
                title="Remove"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          <div className="text-[11px] text-text-muted pt-1 border-t border-border">
            Last updated: <b className="text-text">{formatDateTime(status.updatedAt)}</b>
          </div>
        </div>
      ) : (
        <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-xs">
          No AI provider configured from Settings yet. Bill scanning and the assistant use the server's
          GEMINI_API_KEY environment variable if set, otherwise offline/fallback mode. Add one below for
          consistently accurate results on dense, small-print invoices.
        </div>
      )}

      {(!status?.configured || showConfigForm) && (
        <form onSubmit={handleSaveConfig} className="p-3.5 rounded-2xl bg-bg border border-border space-y-2.5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div className="sm:col-span-2">
              <label className="text-[11px] text-text-muted block mb-1">Base URL *</label>
              <input
                type="text"
                value={baseUrl}
                onChange={e => setBaseUrl(e.target.value)}
                placeholder="https://generativelanguage.googleapis.com/v1beta/openai"
                className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs outline-none focus:border-primary"
                required
              />
              <p className="text-[10px] text-text-muted mt-1">
                The OpenAI-compatible base URL (no trailing "/chat/completions" — that's appended
                automatically). Examples: Gemini's OpenAI-compat endpoint above, "https://api.openai.com/v1"
                for OpenAI, or "http://&lt;your-ollama-host&gt;:11434/v1" for a local Ollama vision model.
              </p>
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">Model *</label>
              <input
                type="text"
                value={model}
                onChange={e => setModel(e.target.value)}
                placeholder="gemini-3.7-flash"
                className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="text-[11px] text-text-muted block mb-1">API Key *</label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                placeholder={status?.configured ? 'Leave blank to keep unchanged' : ''}
                className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs outline-none focus:border-primary"
                required={!status?.configured}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            {status?.configured && (
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
              <span>{saving ? 'Testing Endpoint…' : 'Save & Test Endpoint'}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
