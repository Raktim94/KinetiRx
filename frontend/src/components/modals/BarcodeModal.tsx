import React, { useState } from 'react';
import { Barcode as BarcodeIcon, Printer, RefreshCw, X } from 'lucide-react';
import { Medicine } from '../../types';
import { generateEan13 } from '../../utils/barcode';
import { BarcodeCanvas } from '../BarcodeCanvas';

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
      </div>
    </div>
  );
};
