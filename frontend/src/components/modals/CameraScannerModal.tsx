import { useCallback, useEffect, useRef, useState } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { DecodeHintType } from '@zxing/library';
import { Camera, RotateCw, X } from 'lucide-react';

interface CameraScannerModalProps {
  onClose: () => void;
  /** Called once per detected code. The caller decides what to do (e.g. add to cart, fill a field). */
  onScan: (code: string) => void;
}

type FacingMode = 'environment' | 'user';
type Status = 'starting' | 'scanning' | 'error';

// Deliberately NOT setting POSSIBLE_FORMATS: zxing's own default (no hints
// at all) already tries every format it supports (all 1D formats, QR,
// MicroQR, DataMatrix, Aztec, PDF417, MaxiCode). TRY_HARDER alone is a pure
// win — more thorough per-frame decoding, no narrowing of what's recognized.
const SCAN_HINTS = new Map<DecodeHintType, unknown>([[DecodeHintType.TRY_HARDER, true]]);

// Best-effort: ask the browser to keep refocusing on whatever's in frame,
// rather than locking focus once at startup. Not universally supported
// (iOS Safari has no programmatic focus control at all), so wrapped
// defensively and silently does nothing where it isn't.
function applyContinuousFocus(controls: IScannerControls) {
  try {
    controls.streamVideoConstraintsApply?.({ advanced: [{ focusMode: 'continuous' }] } as unknown as MediaTrackConstraints);
  } catch {
    // Unsupported browser/device — nothing more to do here.
  }
}

// zxing fires the decode callback on *every* frame, with `error` set to a
// NotFoundException whenever no code is in view — that's the normal "still
// looking" state, not a real failure, so it's deliberately ignored below.
// Only a rejection of decodeFromConstraints itself (camera permission
// denied, no camera, stream failed to start) is treated as an error.
export function CameraScannerModal({ onClose, onScan }: CameraScannerModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const onScanRef = useRef(onScan);
  const [facingMode, setFacingMode] = useState<FacingMode>('environment');
  const [status, setStatus] = useState<Status>('starting');
  const [errorMessage, setErrorMessage] = useState('');
  const [canFlip, setCanFlip] = useState(true);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    onScanRef.current = onScan;
  });

  useEffect(() => {
    if (!videoRef.current) return;

    const reader = new BrowserMultiFormatReader(SCAN_HINTS);
    let controls: IScannerControls | null = null;
    let cancelled = false;

    setStatus('starting');

    // Browsers only expose getUserMedia on a secure context (https:// or
    // localhost) — on an insecure origin (e.g. reached from a phone/tablet
    // over plain http://) `navigator.mediaDevices` is simply undefined and
    // no permission prompt is ever shown.
    if (typeof window !== 'undefined' && !window.isSecureContext) {
      queueMicrotask(() => {
        if (cancelled) return;
        setErrorMessage(
          "Camera access needs a secure connection (https://) or 'localhost' — browsers block it on a plain http:// network address like this one. Use the hardware barcode scanner instead."
        );
        setStatus('error');
      });
      return;
    }

    const idealVideoConstraints: MediaTrackConstraints = {
      facingMode: { ideal: facingMode },
      width: { ideal: 1920 },
      height: { ideal: 1080 },
    };

    reader
      .decodeFromConstraints({ video: idealVideoConstraints }, videoRef.current, result => {
        if (cancelled || !result) return;
        onScanRef.current(result.getText());
      })
      .then(c => {
        if (cancelled) {
          c.stop();
          return;
        }
        controls = c;
        applyContinuousFocus(c);
        setStatus('scanning');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof Error ? err.name : '';
        if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
          setErrorMessage('Camera access was denied. Allow camera permission in your browser and try again.');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          if (name === 'OverconstrainedError') {
            setCanFlip(false);
            reader
              .decodeFromConstraints(
                { video: { width: { ideal: 1920 }, height: { ideal: 1080 } } },
                videoRef.current!,
                result => {
                  if (!cancelled && result) onScanRef.current(result.getText());
                }
              )
              .then(c => {
                if (cancelled) return c.stop();
                controls = c;
                applyContinuousFocus(c);
                setStatus('scanning');
              })
              .catch(() => setErrorMessage('Could not access any camera on this device.'));
            return;
          }
          setErrorMessage('No camera was found on this device.');
        } else {
          setErrorMessage('Could not start the camera. Please try again.');
        }
        setStatus('error');
      });

    return () => {
      cancelled = true;
      controls?.stop();
    };
  }, [facingMode, retryNonce]);

  const flipCamera = useCallback(() => {
    setFacingMode(mode => (mode === 'environment' ? 'user' : 'environment'));
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--color-overlay)] p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Scan a barcode or QR code"
    >
      <div className="glass-panel w-full max-w-md overflow-hidden rounded-3xl shadow-2xl animate-in zoom-in-95">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text">
            <Camera className="h-4 w-4 text-primary" aria-hidden="true" />
            <span>Scan Barcode / QR Code</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close scanner"
            className="rounded-lg p-1.5 text-text-muted transition-colors hover:bg-surface hover:text-text cursor-pointer"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="relative aspect-square bg-black">
          <video ref={videoRef} className="h-full w-full object-cover" muted playsInline autoPlay />

          {status !== 'error' && (
            <div className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-primary/80 shadow-[0_0_0_2000px_rgba(0,0,0,0.35)]" />
          )}

          {status === 'starting' && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm font-medium text-white">
              Starting camera…
            </div>
          )}

          {status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/85 p-6 text-center text-sm text-white">
              <p>{errorMessage}</p>
              <button
                type="button"
                onClick={() => setRetryNonce(n => n + 1)}
                className="px-4 py-2 bg-surface hover:bg-surface-elevated text-text rounded-xl text-xs font-semibold transition cursor-pointer"
              >
                Try again
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 p-4 text-xs">
          <p className="text-text-muted">
            {status === 'scanning' ? 'Point the camera at a code — it scans automatically.' : ' '}
          </p>
          {canFlip && (
            <button
              type="button"
              onClick={flipCamera}
              className="px-3 py-1.5 bg-surface hover:bg-surface-elevated text-text rounded-xl font-semibold flex items-center gap-1.5 transition cursor-pointer"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              <span>Flip Camera</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
