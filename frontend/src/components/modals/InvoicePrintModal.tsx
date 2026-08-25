import React, { useState } from 'react';
import { Check, Download, Eye, FileText, Image as ImageIcon, Printer, Sparkles, X } from 'lucide-react';
import { InvoiceConfig, InvoicePrintData } from '../../types';

interface InvoicePrintModalProps {
  invoice: InvoicePrintData | null;
  onClose: () => void;
  config: InvoiceConfig;
}

export const InvoicePrintModal: React.FC<InvoicePrintModalProps> = ({
  invoice,
  onClose,
  config,
}) => {
  if (!invoice) return null;

  // Option: Show Clean Bill Invoice Only (Pure Slip Mode)
  const [cleanInvoiceOnly, setCleanInvoiceOnly] = useState<boolean>(false);

  const handlePrint = () => {
    try {
      const printContents = document.getElementById('printable-invoice')?.innerHTML;
      if (printContents) {
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <!DOCTYPE html>
            <html>
              <head>
                <meta charset="utf-8" />
                <title>Tax Invoice - ${invoice.invNo}</title>
                <style>
                  @page {
                    size: A4 portrait;
                    margin: 12mm;
                  }
                  * { box-sizing: border-box; margin: 0; padding: 0; }
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    padding: 20px;
                    color: #0f172a;
                    background: #ffffff;
                    font-size: 12px;
                    line-height: 1.4;
                  }
                  .invoice-box {
                    max-width: 800px;
                    margin: 0 auto;
                    border: 1px solid #cbd5e1;
                    border-radius: 8px;
                    padding: 24px;
                  }
                  .header {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-start;
                    border-bottom: 2px solid #e2e8f0;
                    padding-bottom: 16px;
                    margin-bottom: 16px;
                  }
                  .logo-wrap {
                    display: flex;
                    align-items: center;
                    gap: 14px;
                  }
                  .shop-logo {
                    max-height: 64px;
                    max-width: 120px;
                    object-fit: contain;
                    border-radius: 6px;
                  }
                  .shop-name {
                    font-size: 18px;
                    font-weight: 800;
                    color: #0f172a;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                  }
                  .shop-sub {
                    font-size: 11px;
                    color: #475569;
                    margin-top: 2px;
                  }
                  .invoice-badge {
                    display: inline-block;
                    background: #ecfdf5;
                    color: #065f46;
                    border: 1px solid #6ee7b7;
                    font-size: 11px;
                    font-weight: 800;
                    padding: 3px 10px;
                    border-radius: 4px;
                    text-transform: uppercase;
                  }
                  .inv-meta {
                    text-align: right;
                  }
                  .inv-no {
                    font-size: 14px;
                    font-weight: 700;
                    font-family: monospace;
                    margin-top: 4px;
                  }
                  .grid-2 {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 16px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    border-radius: 6px;
                    padding: 12px;
                    margin-bottom: 16px;
                  }
                  .section-title {
                    font-size: 10px;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.5px;
                    margin-bottom: 4px;
                  }
                  table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-bottom: 16px;
                    font-size: 12px;
                  }
                  th, td {
                    border: 1px solid #cbd5e1;
                    padding: 8px 10px;
                    text-align: left;
                  }
                  th {
                    background: #f1f5f9;
                    font-weight: 700;
                    color: #334155;
                    font-size: 11px;
                  }
                  .text-right { text-align: right; }
                  .text-center { text-align: center; }
                  .font-mono { font-family: monospace; }
                  .font-bold { font-weight: 700; }
                  .footer {
                    display: flex;
                    justify-content: space-between;
                    align-items: flex-end;
                    border-top: 2px solid #e2e8f0;
                    padding-top: 16px;
                  }
                  .terms {
                    max-width: 55%;
                    font-size: 10px;
                    color: #64748b;
                    line-height: 1.4;
                  }
                  .totals-box {
                    text-align: right;
                    min-width: 220px;
                  }
                  .total-row {
                    display: flex;
                    justify-content: space-between;
                    padding: 2px 0;
                    font-size: 11px;
                    color: #475569;
                  }
                  .grand-total {
                    display: flex;
                    justify-content: space-between;
                    border-top: 1px solid #cbd5e1;
                    padding-top: 6px;
                    margin-top: 4px;
                    font-size: 14px;
                    font-weight: 800;
                    color: #0f172a;
                  }
                  .due-row {
                    color: #dc2626;
                    font-weight: 700;
                  }
                  .paid-row {
                    color: #16a34a;
                    font-weight: 700;
                  }
                </style>
              </head>
              <body>
                <div class="invoice-box">
                  ${printContents}
                </div>
                <script>
                  window.onload = function() {
                    window.print();
                  };
                </script>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
        }
      } else {
        window.print();
      }
    } catch {
      window.print();
    }
  };

  const handleDownloadHTML = () => {
    const printContents = document.getElementById('printable-invoice')?.innerHTML;
    if (!printContents) return;
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Invoice_${invoice.invNo}</title>
  <style>
    body { font-family: system-ui, sans-serif; padding: 30px; color: #1e293b; background: #fff; max-width: 800px; margin: 0 auto; }
    table { width: 100%; border-collapse: collapse; margin: 15px 0; }
    th, td { border: 1px solid #cbd5e1; padding: 8px 12px; }
    th { background: #f8fafc; font-weight: bold; }
    .text-right { text-align: right; }
    .text-center { text-align: center; }
    .font-bold { font-weight: bold; }
  </style>
</head>
<body>
  ${printContents}
</body>
</html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
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
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full font-mono border border-emerald-500/30">
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

        {/* Printable Invoice Container */}
        <div
          id="printable-invoice"
          className="p-6 border border-slate-300 rounded-2xl space-y-4 font-sans bg-white text-slate-800 shadow-xl"
        >
          {/* Header with Shop Logo & Pharmacy Name */}
          <div className="flex justify-between items-start border-b-2 border-slate-200 pb-4 gap-4">
            <div className="flex items-center gap-3.5">
              {config.logoUrl ? (
                <img
                  src={config.logoUrl}
                  alt="Shop Logo"
                  className="max-h-16 max-w-[120px] object-contain rounded-lg border border-slate-200 p-1 bg-white"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-emerald-600 flex items-center justify-center text-text font-black text-xl shadow-md">
                  +
                </div>
              )}
              <div>
                <h2 className="text-lg font-black text-slate-900 tracking-tight uppercase">
                  {config.name}
                </h2>
                <p className="text-[11px] text-slate-600 font-mono mt-0.5">
                  DL No: <span className="font-bold text-slate-800">{config.dl || 'DL-19A'}</span> | GSTIN:{' '}
                  <span className="font-bold text-slate-800">{config.gst || 'N/A'}</span>
                </p>
                <p className="text-[11px] text-text-muted mt-0.5">
                  📍 {config.addr} • 📞 {config.phone}
                </p>
              </div>
            </div>

            <div className="text-right shrink-0">
              <span className="bg-emerald-100 text-emerald-900 text-[10px] font-black px-2.5 py-1 rounded border border-emerald-300 uppercase tracking-wider">
                TAX INVOICE / CASH MEMO
              </span>
              <p className="text-xs font-mono font-bold mt-1.5 text-slate-900">
                {invoice.invNo}
              </p>
              <p className="text-[11px] text-text-muted font-mono mt-0.5">Date: {invoice.date}</p>
            </div>
          </div>

          {/* Patient Details & Doctor Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                Patient Information:
              </p>
              <p className="font-mono font-bold text-sky-700">Patient ID: {invoice.patientId}</p>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{invoice.patientName}</p>
              <p className="text-slate-600 font-mono text-[11px]">Phone: {invoice.phone}</p>
              <p className="text-text-muted text-[11px]">{invoice.ageGender} • {invoice.address}</p>
            </div>

            <div>
              <p className="font-bold text-slate-700 uppercase text-[10px] tracking-wider mb-1">
                Clinical Consultation & Mode:
              </p>
              <p className="text-[11px] text-slate-600">Prescribing Doctor / OPD:</p>
              <p className="font-bold text-slate-900 mt-0.5">{invoice.doctor}</p>
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[11px] text-slate-600">Payment Mode:</span>
                <span className="px-2 py-0.5 bg-indigo-100 text-indigo-900 font-bold rounded text-[10px] border border-indigo-200">
                  {invoice.paymentMode}
                </span>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <table className="w-full text-left border-collapse border border-slate-200 text-xs">
            <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-300 text-[11px]">
              <tr>
                <th className="p-2.5 border-r border-slate-200 w-10 text-center">#</th>
                <th className="p-2.5 border-r border-slate-200">Particulars / Medicine Name</th>
                <th className="p-2.5 border-r border-slate-200 text-center w-24">Qty / Strip</th>
                <th className="p-2.5 border-r border-slate-200 text-right w-28">MRP Rate (₹)</th>
                <th className="p-2.5 text-right w-32 font-bold text-slate-900">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((it, idx) => (
                <tr key={idx} className="hover:bg-slate-50/80">
                  <td className="p-2.5 border-r border-slate-200 text-center font-mono text-text-muted">
                    {idx + 1}
                  </td>
                  <td className="p-2.5 border-r border-slate-200 font-bold text-slate-900">
                    {it.name}
                  </td>
                  <td className="p-2.5 border-r border-slate-200 text-center font-mono font-semibold">
                    {it.qty}
                  </td>
                  <td className="p-2.5 border-r border-slate-200 text-right font-mono text-slate-700">
                    ₹ {Math.abs(it.price).toFixed(2)}
                  </td>
                  <td className="p-2.5 text-right font-mono font-bold text-slate-900">
                    ₹ {it.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Footer Terms & Totals */}
          <div className="flex justify-between items-start pt-3 border-t-2 border-slate-200 gap-4">
            <div className="text-[10px] text-text-muted max-w-[50%] space-y-1">
              <p className="font-semibold text-slate-700">Terms & Conditions:</p>
              <p className="leading-relaxed">{config.terms || '* Medicines once sold will not be returned without cash memo.'}</p>
              {config.waGroup && (
                <p className="text-emerald-700 font-bold pt-1">
                  📱 WhatsApp Group: {config.waGroup}
                </p>
              )}
            </div>

            <div className="text-right space-y-1 font-mono text-xs w-60">
              <div className="flex justify-between text-slate-600">
                <span>Sub-Total:</span>
                <span className="font-semibold">₹ {invoice.subtotal.toFixed(2)}</span>
              </div>

              {invoice.discountPercent > 0 && (
                <div className="flex justify-between text-indigo-700 font-bold">
                  <span>Discount ({invoice.discountPercent}%):</span>
                  <span>- ₹ {(invoice.subtotal * (invoice.discountPercent / 100)).toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between text-sm font-black text-slate-900 border-t border-slate-300 pt-1 mt-1">
                <span>Grand Total:</span>
                <span className="text-emerald-700">₹ {invoice.grandTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between text-emerald-700 font-bold">
                <span>Paid:</span>
                <span>₹ {invoice.paidAmount.toFixed(2)}</span>
              </div>

              {invoice.dueAmount > 0 && (
                <div className="flex justify-between text-rose-600 font-black border-t border-dashed border-rose-300 pt-0.5">
                  <span>Due Balance:</span>
                  <span>₹ {invoice.dueAmount.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>
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
              <span>Generate & Print PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
