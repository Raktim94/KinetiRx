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

/**
 * Normalizes an image to a target resolution and grayscale before OCR.
 * Recognition time (and memory) scales with pixel count, not text size, so a
 * phone camera photo routinely 3000-4000px on the long edge is capped down —
 * full resolution buys no extra accuracy for printed text but can make
 * on-device OCR painfully slow on older/low-spec machines.
 *
 * The reverse case matters just as much: a photo already *below* the target
 * (e.g. ~1600px on the long edge, common for a bill photographed at a normal
 * distance rather than close up) is UPSCALED up to it, not left alone.
 * Verified against two real distributor invoices whose 6-8pt printed table
 * text Tesseract otherwise reads as near-total garbage (item names like
 * "TEE", batch/rate columns scrambled, distributor letterhead misread as "C
 * UMA MEDICINE DISTRIBUTOR" instead of "NEW UMA...") — a plain 2x upscale
 * plus grayscale (which strips the colour-channel noise a JPEG photo adds
 * around small glyphs) took the same two bills to correctly legible item
 * names and a correctly read distributor line, with no other change. This
 * doesn't add information the camera didn't capture, but it does give
 * Tesseract's feature detection more pixels per character stroke to work
 * with, which measurably improves its output on real low-DPI phone photos.
 */
async function prepareImageForOcr(image: string | File | Blob, maxLongEdge = 3200): Promise<string | File | Blob> {
  try {
    const blob = typeof image === 'string' ? await (await fetch(image)).blob() : image;
    const bitmap = await createImageBitmap(blob);
    const longEdge = Math.max(bitmap.width, bitmap.height);
    // Upscale up to 2x for a photo already at or below the cap (common for a
    // bill photographed at a normal distance rather than close up — the
    // exact case verified above) while still never exceeding maxLongEdge,
    // whether that's because of the 2x ceiling or because the source was
    // already larger than the cap to begin with.
    const scale = Math.min(2, maxLongEdge / longEdge);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close?.();
      return image;
    }
    // Grayscale during the draw itself, not a separate pixel-loop pass —
    // cheap and universally supported in the browsers this app targets.
    ctx.filter = 'grayscale(1)';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    // PNG (lossless), not JPEG: re-compressing an already-upscaled image
    // adds ringing artifacts right around the sharp text edges OCR depends
    // on most — this data never leaves the browser or gets stored, so the
    // larger file size costs nothing.
    return canvas.toDataURL('image/png');
  } catch {
    // Any failure here (unsupported API, decode error) just means OCR runs
    // against the original image instead — never block on this.
    return image;
  }
}

/** Runs offline OCR on an image (data URL, File, or Blob) and returns raw recognized text. */
export async function recognizeIdText(image: string | File | Blob): Promise<string> {
  const worker = await getWorker();
  const scaled = await prepareImageForOcr(image);
  const { data } = await worker.recognize(scaled);
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
