import React, { useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Upload, X } from 'lucide-react';
import { Medicine } from '../../types';
import { downloadImportTemplate, mapRowsToMedicines, parseImportFile } from '../../utils/importStock';

interface ImportStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (medicines: Medicine[]) => void;
}

export const ImportStockModal: React.FC<ImportStockModalProps> = ({ isOpen, onClose, onImport }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<Medicine[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [imported, setImported] = useState(false);

  if (!isOpen) return null;

  const reset = () => {
    setFileName('');
    setParsed([]);
    setErrors([]);
    setImported(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setParsing(true);
    setParsed([]);
    setErrors([]);
    setImported(false);
    try {
      const rows = await parseImportFile(file);
      const { medicines, errors: mapErrors } = mapRowsToMedicines(rows);
      setParsed(medicines);
      setErrors(mapErrors);
    } catch (err) {
      setErrors([err instanceof Error ? `Could not read file: ${err.message}` : 'Could not read file.']);
    } finally {
      setParsing(false);
    }
  };

  const handleConfirmImport = () => {
    if (parsed.length === 0) return;
    onImport(parsed);
    setImported(true);
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs text-text max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
            <span>Import Stock (CSV / Excel)</span>
          </h3>
          <button onClick={handleClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-text-muted leading-relaxed">
          Upload a <b className="text-text">.csv</b>, <b className="text-text">.xlsx</b> or{' '}
          <b className="text-text">.xls</b> file to add many medicines or lab tests at once. Column
          headers are matched loosely — "MRP", "Selling MRP" etc. all work — but if you're starting
          from scratch, download the template below for the exact expected columns.
        </p>

        <button
          type="button"
          onClick={downloadImportTemplate}
          className="w-full px-3.5 py-2 bg-surface hover:bg-surface-elevated text-text border border-border font-semibold rounded-2xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-primary" />
          <span>Download Template CSV</span>
        </button>

        <label
          className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-border rounded-2xl bg-surface hover:bg-surface-elevated cursor-pointer transition text-center"
        >
          <Upload className="w-6 h-6 text-primary" />
          <span className="font-semibold text-text">{fileName || 'Click to choose a CSV or Excel file'}</span>
          <span className="text-text-muted text-[10px]">.csv, .xlsx, .xls</span>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={e => {
              const file = e.target.files?.[0];
              if (file) handleFile(file);
            }}
          />
        </label>

        {parsing && <p className="text-text-muted text-center">Parsing file…</p>}

        {!parsing && (parsed.length > 0 || errors.length > 0) && (
          <div className="space-y-2.5">
            {parsed.length > 0 && (
              <div className="p-3 rounded-2xl bg-success/10 border border-success/30 flex items-center gap-2 text-success">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span className="font-semibold">
                  {parsed.length} item{parsed.length === 1 ? '' : 's'} ready to import.
                </span>
              </div>
            )}

            {errors.length > 0 && (
              <div className="p-3 rounded-2xl bg-danger/10 border border-danger/30 text-danger space-y-1 max-h-32 overflow-y-auto">
                <div className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errors.length} row{errors.length === 1 ? '' : 's'} skipped</span>
                </div>
                {errors.map((e, i) => (
                  <p key={i} className="text-[11px] pl-6">{e}</p>
                ))}
              </div>
            )}

            {parsed.length > 0 && (
              <div className="border border-border rounded-2xl overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-surface-elevated text-text-muted uppercase">
                    <tr>
                      <th className="p-2">Name</th>
                      <th className="p-2">Pack</th>
                      <th className="p-2">Stock</th>
                      <th className="p-2">MRP</th>
                      <th className="p-2">GST%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {parsed.slice(0, 5).map(m => (
                      <tr key={m.id}>
                        <td className="p-2 font-semibold text-text">{m.name}</td>
                        <td className="p-2 text-text-muted">{m.pack}</td>
                        <td className="p-2 text-text-muted">{m.stock}</td>
                        <td className="p-2 text-text-muted">{m.mrp.toFixed(2)}</td>
                        <td className="p-2 text-text-muted">{m.gst}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {parsed.length > 5 && (
                  <p className="p-2 text-center text-text-muted bg-surface">
                    + {parsed.length - 5} more row{parsed.length - 5 === 1 ? '' : 's'}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {imported && (
          <div className="p-3 rounded-2xl bg-success/15 border border-success/30 text-success font-semibold text-center">
            Imported {parsed.length} item{parsed.length === 1 ? '' : 's'} into stock.
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={handleClose}
            className="px-4 py-2 text-text-muted hover:text-text bg-surface hover:bg-bg rounded-2xl font-medium transition cursor-pointer"
          >
            {imported ? 'Done' : 'Cancel'}
          </button>
          {!imported && (
            <button
              type="button"
              onClick={handleConfirmImport}
              disabled={parsed.length === 0}
              className="px-5 py-2 bg-primary hover:bg-primary-hover disabled:opacity-40 disabled:cursor-not-allowed text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/40 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Import {parsed.length > 0 ? `${parsed.length} Item${parsed.length === 1 ? '' : 's'}` : ''}</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
