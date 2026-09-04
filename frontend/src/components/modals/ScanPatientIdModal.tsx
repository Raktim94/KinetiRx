import React, { useEffect, useRef, useState } from 'react';
import { Camera, IdCard, Loader2, ScanLine, Upload, UserX, X } from 'lucide-react';
import { PatientRecord } from '../../types';
import { extractPatientIdCandidates, recognizeIdText } from '../../utils/patientIdOcr';
import { findPatientById, findPatientByPhone } from '../../utils/patientUtils';

interface ScanPatientIdModalProps {
  isOpen: boolean;
  onClose: () => void;
  patients: PatientRecord[];
  onFound: (patient: PatientRecord) => void;
}

/**
 * Scans a photo of a patient ID card / OPD slip with fully offline OCR
 * (tesseract.js running against the locally vendored WASM core + English
 * traineddata under public/tesseract/ — no network call, no Gemini key
 * needed) and looks the recognized ID up against the already-loaded
 * `patients` list, matching this app's existing search-by-ID lookup
 * (patientUtils.findPatientById / findPatientByPhone). On a match it hands
 * the record to `onFound`, which callers wire to the same "patient CV"
 * profile view (info + purchase history) used by the manual search box.
 */
export const ScanPatientIdModal: React.FC<ScanPatientIdModalProps> = ({
  isOpen,
  onClose,
  patients,
  onFound,
}) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [notFoundText, setNotFoundText] = useState<string | null>(null);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetState = () => {
    setPreviewImage(null);
    setIsProcessing(false);
    setStatusMessage(null);
    setNotFoundText(null);
    setRecognizedText(null);
  };

  const handleClose = () => {
    handleStopCamera();
    resetState();
    onClose();
  };

  const handleStartCamera = async () => {
    try {
      setStatusMessage(null);
      setNotFoundText(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      setIsCameraActive(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied or unavailable:', err);
      setStatusMessage('Camera unavailable — use "Upload Photo" instead.');
    }
  };

  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const runOcrAndLookup = async (imageSrc: string) => {
    setPreviewImage(imageSrc);
    setNotFoundText(null);
    setIsProcessing(true);
    setStatusMessage('Reading ID offline (no internet needed)…');
    try {
      const text = await recognizeIdText(imageSrc);
      setRecognizedText(text);
      const candidates = extractPatientIdCandidates(text);

      let match: PatientRecord | undefined;
      for (const c of candidates) {
        match = c.kind === 'phone' ? findPatientByPhone(c.value, patients) : findPatientById(c.value, patients);
        if (match) break;
      }

      if (match) {
        setStatusMessage(null);
        onFound(match);
        handleClose();
        return;
      }

      setStatusMessage(null);
      setNotFoundText(
        candidates.length > 0
          ? `No patient matches the scanned ID (tried: ${candidates.map(c => c.value).join(', ')}).`
          : "Couldn't read a patient ID from this photo — try a clearer, well-lit shot."
      );
    } catch (err) {
      console.error('Offline OCR failed:', err);
      setStatusMessage(null);
      setNotFoundText('OCR failed to process this image. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    const base64 = canvas.toDataURL('image/jpeg');
    handleStopCamera();
    void runOcrAndLookup(base64);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = event => {
      const base64 = event.target?.result as string;
      void runOcrAndLookup(base64);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  useEffect(() => {
    if (!isOpen) {
      handleStopCamera();
      resetState();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => () => handleStopCamera(), []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs text-text animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
              <ScanLine className="w-4 h-4" />
            </div>
            <span>Scan Patient ID (Offline)</span>
          </h3>
          <button onClick={handleClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-text-muted">
          Point the camera at (or upload a photo of) the patient's ID card or OPD slip. Recognition
          runs entirely offline on-device — no internet connection or API key required.
        </p>

        {isCameraActive ? (
          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden border border-border aspect-video bg-black">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            </div>
            <div className="flex gap-2">
              <button onClick={handleCaptureSnapshot} className="btn-primary flex-1 py-2 rounded-xl">
                <Camera className="w-4 h-4" />
                <span>Capture &amp; Read ID</span>
              </button>
              <button onClick={handleStopCamera} className="btn-secondary py-2 px-4 rounded-xl">
                Cancel
              </button>
            </div>
          </div>
        ) : previewImage ? (
          <div className="rounded-2xl overflow-hidden border border-border">
            <img src={previewImage} alt="Scanned ID" className="w-full max-h-64 object-contain bg-black/5" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleStartCamera}
              className="btn-secondary flex flex-col items-center gap-2 py-6 rounded-2xl"
            >
              <Camera className="w-6 h-6 text-primary" />
              <span>Use Camera</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="btn-secondary flex flex-col items-center gap-2 py-6 rounded-2xl"
            >
              <Upload className="w-6 h-6 text-primary" />
              <span>Upload Photo</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileUpload}
            />
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-primary justify-center py-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>{statusMessage}</span>
          </div>
        )}

        {notFoundText && (
          <div className="flex items-start gap-2 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
            <UserX className="w-4 h-4 mt-0.5 shrink-0" />
            <div className="space-y-1">
              <p>{notFoundText}</p>
              {recognizedText && (
                <p className="text-text-muted font-mono text-[10px] break-all">Raw text: {recognizedText.trim().slice(0, 200)}</p>
              )}
              <button
                onClick={() => {
                  resetState();
                }}
                className="text-primary underline underline-offset-2"
              >
                Try another photo
              </button>
            </div>
          </div>
        )}

        {!isCameraActive && !previewImage && (
          <p className="flex items-center gap-1.5 text-text-muted">
            <IdCard className="w-3.5 h-3.5" />
            Matches against Patient ID (e.g. 108 or P/108) or the registered mobile number.
          </p>
        )}
      </div>
    </div>
  );
};
