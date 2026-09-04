import React, { useState } from 'react';
import { Barcode as BarcodeIcon, Printer, RefreshCw, ScanLine, X } from 'lucide-react';
import { Medicine } from '../../types';
import { generateEan13 } from '../../utils/barcode';
import { BarcodeCanvas } from '../BarcodeCanvas';
import { useBarcodeScanner } from '../../hooks/useBarcodeScanner';

interface BarcodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicine: Medicine | null;
  medicines: Medicine[];
  setMedicines?: React.Dispatch<React.SetStateAction<Medicine[]>>;
}

export const BarcodeModal: React.FC<BarcodeModalProps> = ({
  isOpen,
  onClose,
  medicine,
  medicines,
  setMedicines,
}) => {
  const [busy, setBusy] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanFeedback, setScanFeedback] = useState<{ ok: boolean; msg: string } | null>(null);

  const assignExistingCode = (rawCode: string) => {
    if (!setMedicines || !medicine) return;
    const code = rawCode.trim();
    if (!code) return;
    const usedByOther = medicines.some(m => m.id !== medicine.id && m.barcode === code);
    if (usedByOther) {
      setScanFeedback({ ok: false, msg: `Barcode ${code} is already assigned to another item.` });
      return;
    }
    setMedicines(prev => prev.map(m => (m.id === medicine.id ? { ...m, barcode: code } : m)));
    setManualCode('');
    setScanFeedback({ ok: true, msg: `Assigned existing barcode ${code}.` });
    window.setTimeout(() => setScanFeedback(null), 3000);
  };

  // Assigns the manufacturer's own printed barcode (scanned off the box
  // with a USB/handheld scanner) instead of generating a new EAN-13 —
  // stock already carrying a real barcode from the supplier shouldn't get
  // a second, made-up one. The scanner acts as a fast keyboard (see
  // useBarcodeScanner), so this fires while the modal is open regardless
  // of which field has focus.
  useBarcodeScanner({ onScan: assignExistingCode, enabled: isOpen && !!setMedicines });

  if (!isOpen || !medicine) return null;

  const handleGenerate = () => {
    if (!setMedicines) return;
    setBusy(true);
    try {
      const existing = medicines.map(m => m.barcode).filter((b): b is string => !!b);
      const code = generateEan13(existing);
      setMedicines(prev => prev.map(m => (m.id === medicine.id ? { ...m, barcode: code } : m)));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Could not generate barcode');
    } finally {
      setBusy(false);
    }
  };

  const handlePrint = () => {
    const canvas = document.getElementById('barcode-label-canvas') as HTMLCanvasElement | null;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const printWindow = window.open('', '_blank', 'width=400,height=300');
    if (!printWindow) return;
    printWindow.document.write(`
      <html>
        <head><title>Barcode Label — ${medicine.name}</title></head>
        <body style="margin:0;padding:16px;text-align:center;font-family:sans-serif;">
          <div style="font-weight:bold;font-size:13px;margin-bottom:6px;">${medicine.name}</div>
          <img src="${dataUrl}" style="max-width:100%;" />
          <script>window.onload = () => { window.print(); window.close(); };</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-sm w-full p-6 space-y-4 text-xs text-text animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <BarcodeIcon className="w-4 h-4" />
            </div>
            <span>Product Barcode</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="text-center">
          <p className="font-bold text-text">{medicine.name}</p>
          <p className="text-text-muted text-[11px]">{medicine.company}</p>
        </div>

        <div className="flex justify-center p-3 bg-white rounded-xl border border-border">
          {medicine.barcode ? (
            <BarcodeCanvas id="barcode-label-canvas" value={medicine.barcode} format="EAN13" />
          ) : (
            <p className="text-text-muted py-8">No barcode assigned yet.</p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={busy || !setMedicines}
            className="flex-1 px-3 py-2 bg-surface hover:bg-surface-elevated disabled:opacity-40 text-text rounded-xl font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer border border-border"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{medicine.barcode ? 'Regenerate' : 'Generate Barcode'}</span>
          </button>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!medicine.barcode}
            className="flex-1 px-3 py-2 bg-primary hover:bg-primary-hover disabled:opacity-40 text-primary-foreground rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Label</span>
          </button>
        </div>

        <div className="pt-3 border-t border-border space-y-1.5">
          <p className="text-[11px] text-text-muted flex items-center gap-1.5">
            <ScanLine className="w-3.5 h-3.5 text-primary" />
            <span>
              Or use the item's <b className="text-text">existing</b> manufacturer barcode: scan it with a USB
              scanner (works automatically) or type it in below.
            </span>
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualCode}
              onChange={e => setManualCode(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  assignExistingCode(manualCode);
                }
              }}
              placeholder="Scan or type existing barcode..."
              disabled={!setMedicines}
              className="flex-1 p-2 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary disabled:opacity-40"
            />
            <button
              type="button"
              onClick={() => assignExistingCode(manualCode)}
              disabled={!setMedicines || !manualCode.trim()}
              className="px-3 py-2 bg-surface hover:bg-surface-elevated disabled:opacity-40 text-text rounded-xl font-semibold transition cursor-pointer border border-border"
            >
              Assign
            </button>
          </div>
          {scanFeedback && (
            <p className={`text-[11px] font-semibold ${scanFeedback.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {scanFeedback.msg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
