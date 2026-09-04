import { createWorker, OEM, type Worker } from 'tesseract.js';

// All three asset files below are vendored locally under public/tesseract/
// (worker script, LSTM-only WASM core, and gzipped English traineddata)
// instead of being fetched from tesseract.js's default CDN. That keeps ID
// scanning working with zero internet access, matching this app's
// self-hosted / "runs fully offline in fallback mode" design (see README).
const TESS_BASE = '/tesseract';

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng', OEM.LSTM_ONLY, {
      workerPath: `${TESS_BASE}/worker.min.js`,
      corePath: `${TESS_BASE}/tesseract-core-simd-lstm.wasm.js`,
      langPath: TESS_BASE,
      gzip: true,
      cacheMethod: 'none',
    }).catch(err => {
      // Let the next caller retry instead of permanently caching a failed init.
      workerPromise = null;
      throw err;
    });
  }
  return workerPromise;
}

/** Runs offline OCR on an image (data URL, File, or Blob) and returns raw recognized text. */
export async function recognizeIdText(image: string | File | Blob): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(image);
  return data.text || '';
}

export interface OcrIdCandidate {
  value: string;
  kind: 'id' | 'phone';
}

/**
 * Best-effort extraction of patient-ID / phone candidates from OCR text off
 * an ID card, OPD slip, or prescription header. Patient IDs in this app are
 * plain sequential numbers (see getNextSequentialPatientId) on some entry
 * points and an older "P/123" prefixed form (see AddPatientModal) on
 * others, so both forms are produced as candidates alongside any
 * 10-digit Indian mobile number found in the text.
 */
export function extractPatientIdCandidates(text: string): OcrIdCandidate[] {
  const candidates: OcrIdCandidate[] = [];
  const seen = new Set<string>();

  const add = (value: string, kind: 'id' | 'phone') => {
    const key = `${kind}:${value}`;
    if (!value || seen.has(key)) return;
    seen.add(key);
    candidates.push({ value, kind });
  };

  // Explicit "P/123", "PAT-123", "Patient ID: 123" style labels — most reliable.
  for (const m of text.matchAll(/\b(?:P\/|PAT-|PATIENT\s*ID[:#]?\s*|ID[:#]\s*)(\d{1,8})\b/gi)) {
    add(m[1], 'id');
    add(`P/${m[1]}`, 'id');
  }

  // 10-digit Indian mobile numbers, with optional +91 / 0 prefix.
  for (const m of text.matchAll(/(?:\+?91[\s-]?|0)?\b([6-9]\d{9})\b/g)) {
    add(m[1], 'phone');
  }

  // Fallback: short bare numbers (<=6 digits) that could be an unlabeled
  // sequential ID, shortest first since patient IDs are small counters and
  // longer digit runs on the same slip are more likely dates/amounts/invoice
  // numbers.
  const bare = Array.from(text.matchAll(/\b(\d{1,6})\b/g), m => m[1]);
  bare.sort((a, b) => a.length - b.length);
  for (const n of bare.slice(0, 5)) {
    add(n, 'id');
  }

  return candidates;
}
