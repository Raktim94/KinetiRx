import React, { useMemo, useState } from 'react';
import { Check, Download, Eye, FileText, Image as ImageIcon, Printer, Sparkles, X } from 'lucide-react';
import { InvoiceConfig, InvoicePrintData } from '../../types';
import { buildInvoiceHtml, PrinterFormat, printInvoiceReceipt, resolvePrinterFormat } from '../../utils/receiptPrint';

interface InvoicePrintModalProps {
  invoice: InvoicePrintData | null;
  onClose: () => void;
  config: InvoiceConfig;
}

const FORMAT_OPTIONS: { value: PrinterFormat; label: string }[] = [
  { value: 'thermal_80mm', label: '80mm Thermal' },
  { value: 'thermal_58mm', label: '58mm Thermal' },
  { value: 'a4', label: 'A4 Full Page' },
];

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoice,
  onClose,
  config,
}) => {
  const [format, setFormat] = useState<PrinterFormat>(() => resolvePrinterFormat(config));

  // Option: Show Clean Bill Invoice Only (Pure Slip Mode)
  const [cleanInvoiceOnly, setCleanInvoiceOnly] = useState<boolean>(false);

  const previewHtml = useMemo(
    () => (invoice ? buildInvoiceHtml(config, invoice, format) : ''),
    [invoice, config, format]
  );

  if (!invoice) return null;

  const handlePrint = () => {
    printInvoiceReceipt(config, invoice, format);
  };

  const handleDownloadHTML = () => {
    const blob = new Blob([previewHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Invoice_${invoice.invNo}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div
        className={`glass-panel rounded-3xl w-full p-6 space-y-4 max-h-[92vh] overflow-y-auto text-xs text-text animate-in zoom-in-95 transition-all duration-300 ${
          cleanInvoiceOnly ? 'max-w-3xl' : 'max-w-2xl'
        }`}
      >
        {/* Top Header Controls */}
        <div className="flex justify-between items-center border-b border-border pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Printer className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <span>Tax Invoice Slip & PDF Preview</span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
                  {invoice.invNo}
                </span>
              </h3>
              <p className="text-[11px] text-text-muted">
                Official GST-compliant medical bill memo with complete itemization.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Clean Invoice Only Smart View Toggle */}
            <button
              type="button"
              id="btn-toggle-clean-invoice-only"
              onClick={() => setCleanInvoiceOnly(prev => !prev)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
                cleanInvoiceOnly
                  ? 'bg-emerald-600 text-text shadow-md'
                  : 'bg-bg hover:bg-border text-text-muted border border-border'
              }`}
              title="Show only the pure bill invoice without extraneous controls"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>{cleanInvoiceOnly ? 'Clean Bill Only (Active)' : 'Only Show Bill Invoice'}</span>
            </button>

            <button
              onClick={onClose}
              className="text-text-muted hover:text-text p-1.5 rounded-xl hover:bg-bg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printer Format Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-text-muted">Print As:</span>
          <div className="flex items-center gap-1 p-1 bg-bg rounded-xl border border-border">
            {FORMAT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormat(opt.value)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  format === opt.value
                    ? 'bg-primary text-primary-foreground shadow-md'
                    : 'text-text-muted hover:text-text hover:bg-surface'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Printable Invoice Preview — renders the exact self-contained HTML
            that will be sent to the printer/downloaded, so this is a true
            WYSIWYG preview rather than a differently-styled mockup. */}
        <div className="flex justify-center bg-slate-100 rounded-2xl border border-slate-300 p-4 overflow-auto">
          <iframe
            key={format}
            title="Invoice preview"
            srcDoc={previewHtml}
            className="bg-white shadow-xl rounded-lg border border-slate-300"
            style={{
              width: format === 'a4' ? '100%' : format === 'thermal_80mm' ? '320px' : '240px',
              height: format === 'a4' ? '600px' : '520px',
              maxWidth: '100%',
            }}
          />
        </div>

        {/* Modal Action Buttons */}
        <div className="flex justify-between items-center pt-3 border-t border-border flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-bg text-text-muted hover:text-text font-semibold rounded-2xl transition cursor-pointer"
            >
              Close
            </button>
            <button
              type="button"
              onClick={handleDownloadHTML}
              className="px-3 py-2 bg-surface hover:bg-bg border border-border text-text rounded-2xl font-semibold text-xs flex items-center gap-1.5 transition cursor-pointer"
              title="Download standalone HTML file"
            >
              <Download className="w-3.5 h-3.5 text-primary" />
              <span>Download File</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn text-primary-foreground bg-success border border-success hover:brightness-105"
            >
              <Printer className="w-4 h-4" />
              <span>Print {FORMAT_OPTIONS.find(o => o.value === format)?.label}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
