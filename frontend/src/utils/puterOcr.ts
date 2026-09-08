// Optional, opt-in OCR path backed by Puter.js (https://developer.puter.com/tutorials/free-unlimited-ocr-api/).
// Puter runs on a "User-Pays" model: no API key or backend wiring needed here —
// the browser loads Puter's SDK from their CDN and the end user authenticates
// with their own (free) Puter account the first time it's used, so their
// account covers the OCR call instead of this app's server. That's why it's
// off by default and toggled per-device (localStorage), not synced through
// InvoiceConfig like the rest of Settings.

const STORAGE_KEY = 'kinetirx_puter_ocr_enabled';
const PUTER_SCRIPT_SRC = 'https://js.puter.com/v2/';

declare global {
  interface Window {
    puter?: {
      ai: {
        img2txt: (image: string) => Promise<string>;
      };
    };
  }
}

export function isPuterOcrEnabled(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

export function setPuterOcrEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'true' : 'false');
  } catch {
    // Private-browsing / storage-blocked contexts just won't persist the
    // toggle across reloads — not worth surfacing an error for.
  }
}

let scriptLoadPromise: Promise<void> | null = null;

function loadPuterScript(): Promise<void> {
  if (window.puter) return Promise.resolve();
  if (scriptLoadPromise) return scriptLoadPromise;

  scriptLoadPromise = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector(`script[src="${PUTER_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', () => reject(new Error('Failed to load Puter.js')));
      return;
    }
    const script = document.createElement('script');
    script.src = PUTER_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load Puter.js'));
    document.head.appendChild(script);
  }).catch(err => {
    // Let the next call retry (e.g. after the network comes back) instead of
    // permanently caching a failed load.
    scriptLoadPromise = null;
    throw err;
  });

  return scriptLoadPromise;
}

/**
 * Runs OCR via Puter's free img2txt cloud API on an image data URL. First
 * call in a browser session may prompt the user to sign in / authorize a
 * free Puter account (their popup, outside this app's control) — that's
 * expected and how their unlimited free tier is funded.
 */
export async function recognizeWithPuter(imageBase64: string): Promise<string> {
  await loadPuterScript();
  if (!window.puter) {
    throw new Error('Puter.js did not initialize.');
  }
  const text = await window.puter.ai.img2txt(imageBase64);
  return text || '';
}
