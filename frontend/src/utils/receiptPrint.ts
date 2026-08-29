import { InvoiceConfig, InvoicePrintData } from '../types';
import { escHtml as esc, printHtml } from './printUtils';

export type PrinterFormat = 'a4' | 'thermal_80mm' | 'thermal_58mm';

export function resolvePrinterFormat(config: InvoiceConfig, override?: PrinterFormat): PrinterFormat {
  if (override) return override;
  const configured = config.printerType;
  if (configured === 'a4' || configured === 'thermal_80mm' || configured === 'thermal_58mm') {
    return configured;
  }
  return 'thermal_80mm';
}

function money(n: number): string {
  return `Rs ${n.toFixed(2)}`;
}

// Thermal receipts (58mm / 80mm) — self-contained HTML, no dependency on the
// app's Tailwind stylesheet. Modeled on nodedr-pos's proven zero-setup
// pattern: @page{size:<width>mm auto; margin:0}, box-sizing:border-box, and a
// left-aligned body — a centered body plus a printer/engine that ignores the
// custom @page size and falls back to A4/Letter would otherwise clip the
// receipt to a sliver on the physical thermal head. This is the exact
// mechanism that lets any thermal printer already installed as an OS printer
// (no driver, no app-side setup) render a correctly-sized slip via the
// browser's native print dialog.
function buildThermalHtml(config: InvoiceConfig, invoice: InvoicePrintData, widthMm: 58 | 80): string {
  const fontSize = widthMm === 58 ? '10.5px' : '11.5px';
  const itemRows = invoice.items
    .map(
      it => `
      <tr>
        <td colspan="3" style="padding-top:3px;">${esc(it.name)}</td>
      </tr>
      <tr>
        <td style="color:#333;">${it.qty} x ${it.price.toFixed(2)}</td>
        <td></td>
        <td style="text-align:right;font-weight:700;">${it.total.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Receipt ${esc(invoice.invNo)}</title>
<style>
  html { margin: 0; }
  body {
    font-family: 'Courier New', Consolas, monospace;
    margin: 0;
    padding: 3mm;
    color: #000;
    width: ${widthMm}mm;
    box-sizing: border-box;
    font-size: ${fontSize};
    line-height: 1.4;
  }
  @page { size: ${widthMm}mm auto; margin: 0; }
  @media print {
    html, body { width: ${widthMm}mm; }
  }
  .center { text-align: center; }
  .bold { font-weight: 700; }
  .divider { border-top: 1px dashed #000; margin: 4px 0; }
  .small { font-size: 9px; color: #333; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 0; vertical-align: top; word-break: break-word; }
  .totals td { padding: 1px 0; }
</style>
</head>
<body>
  <div class="center bold" style="font-size:${widthMm === 58 ? '12px' : '13px'};">${esc(config.name)}</div>
  <div class="center small">${esc(config.addr)}</div>
  <div class="center small">Ph: ${esc(config.phone)}</div>
  <div class="center small">DL: ${esc(config.dl)} | GSTIN: ${esc(config.gst)}</div>
  <div class="divider"></div>
  <table>
    <tr><td>Inv#</td><td style="text-align:right;">${esc(invoice.invNo)}</td></tr>
    <tr><td>Date</td><td style="text-align:right;">${esc(invoice.date)}</td></tr>
    <tr><td>Patient</td><td style="text-align:right;">${esc(invoice.patientName)}</td></tr>
    <tr><td>Doctor</td><td style="text-align:right;">${esc(invoice.doctor)}</td></tr>
    <tr><td>Pay Mode</td><td style="text-align:right;">${esc(invoice.paymentMode)}</td></tr>
  </table>
  <div class="divider"></div>
  <table>${itemRows}</table>
  <div class="divider"></div>
  <table class="totals">
    <tr><td>Sub-Total</td><td style="text-align:right;">${money(invoice.subtotal)}</td></tr>
    ${invoice.discountPercent > 0
      ? `<tr><td>Discount (${invoice.discountPercent}%)</td><td style="text-align:right;">-${money(invoice.subtotal * (invoice.discountPercent / 100))}</td></tr>`
      : ''}
    <tr class="bold" style="font-size:${widthMm === 58 ? '11.5px' : '12.5px'};">
      <td>Grand Total</td><td style="text-align:right;">${money(invoice.grandTotal)}</td>
    </tr>
    <tr><td>Paid</td><td style="text-align:right;">${money(invoice.paidAmount)}</td></tr>
    ${invoice.dueAmount > 0
      ? `<tr class="bold"><td>Due</td><td style="text-align:right;">${money(invoice.dueAmount)}</td></tr>`
      : ''}
  </table>
  <div class="divider"></div>
  <div class="small">${esc(config.terms || 'Medicines once sold will not be returned without cash memo.')}</div>
  ${config.waGroup ? `<div class="small center" style="margin-top:2px;">WhatsApp: ${esc(config.waGroup)}</div>` : ''}
  <div class="center bold" style="margin-top:6px;">Thank You!</div>
</body>
</html>`;
}

// A4 tax-invoice layout — fully self-contained CSS (previously this reused
// the on-screen modal's Tailwind-classed innerHTML, but the print window
// never loaded Tailwind, so borders/flex layout/colors silently dropped out
// of the printed page). Rebuilt here from data with real CSS rules instead.
function buildA4Html(config: InvoiceConfig, invoice: InvoicePrintData): string {
  const itemRows = invoice.items
    .map(
      (it, idx) => `
      <tr>
        <td class="c">${idx + 1}</td>
        <td class="b">${esc(it.name)}</td>
        <td class="c">${it.qty}</td>
        <td class="r">Rs ${Math.abs(it.price).toFixed(2)}</td>
        <td class="r b">Rs ${it.total.toFixed(2)}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Tax Invoice - ${esc(invoice.invNo)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 20px; color: #0f172a; font-size: 12px; line-height: 1.4; }
  .box { max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px; gap: 16px; }
  .shop-name { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
  .shop-sub { font-size: 11px; color: #475569; margin-top: 4px; font-family: monospace; }
  .badge { display: inline-block; background: #ecfdf5; color: #065f46; border: 1px solid #6ee7b7; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; }
  .meta { text-align: right; }
  .inv-no { font-size: 14px; font-weight: 700; font-family: monospace; margin-top: 6px; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; }
  .sec-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; color: #334155; font-size: 11px; }
  .c { text-align: center; } .r { text-align: right; } .b { font-weight: 700; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; border-top: 2px solid #e2e8f0; padding-top: 16px; gap: 16px; }
  .terms { max-width: 55%; font-size: 10px; color: #64748b; line-height: 1.4; }
  .totals { text-align: right; min-width: 220px; font-family: monospace; font-size: 12px; }
  .totals .row { display: flex; justify-content: space-between; padding: 2px 0; color: #475569; }
  .grand { display: flex; justify-content: space-between; border-top: 1px solid #cbd5e1; padding-top: 6px; margin-top: 4px; font-size: 14px; font-weight: 800; }
  .due { color: #dc2626; font-weight: 700; }
  .paid { color: #16a34a; font-weight: 700; }
</style>
</head>
<body>
  <div class="box">
    <div class="header">
      <div>
        <div class="shop-name">${esc(config.name)}</div>
        <div class="shop-sub">DL No: ${esc(config.dl || 'DL-19A')} | GSTIN: ${esc(config.gst || 'N/A')}</div>
        <div class="shop-sub">${esc(config.addr)} • ${esc(config.phone)}</div>
      </div>
      <div class="meta">
        <span class="badge">Tax Invoice / Cash Memo</span>
        <div class="inv-no">${esc(invoice.invNo)}</div>
        <div class="shop-sub">Date: ${esc(invoice.date)}</div>
      </div>
    </div>

    <div class="grid-2">
      <div>
        <div class="sec-title">Patient Information</div>
        <div>Patient ID: ${esc(invoice.patientId)}</div>
        <div class="b">${esc(invoice.patientName)}</div>
        <div>Phone: ${esc(invoice.phone)}</div>
        <div>${esc(invoice.ageGender)} • ${esc(invoice.address)}</div>
      </div>
      <div>
        <div class="sec-title">Clinical Consultation &amp; Mode</div>
        <div>Prescribing Doctor / OPD:</div>
        <div class="b">${esc(invoice.doctor)}</div>
        <div style="margin-top:6px;">Payment Mode: <b>${esc(invoice.paymentMode)}</b></div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="c" style="width:36px;">#</th>
          <th>Particulars / Medicine Name</th>
          <th class="c" style="width:90px;">Qty / Strip</th>
          <th class="r" style="width:110px;">MRP Rate</th>
          <th class="r" style="width:120px;">Total</th>
        </tr>
      </thead>
      <tbody>${itemRows}</tbody>
    </table>

    <div class="footer">
      <div class="terms">
        <div class="b">Terms &amp; Conditions:</div>
        <div>${esc(config.terms || '* Medicines once sold will not be returned without cash memo.')}</div>
        ${config.waGroup ? `<div class="paid" style="margin-top:4px;">WhatsApp Group: ${esc(config.waGroup)}</div>` : ''}
      </div>
      <div class="totals">
        <div class="row"><span>Sub-Total:</span><span>Rs ${invoice.subtotal.toFixed(2)}</span></div>
        ${invoice.discountPercent > 0
          ? `<div class="row" style="color:#4338ca;font-weight:700;"><span>Discount (${invoice.discountPercent}%):</span><span>- Rs ${(invoice.subtotal * (invoice.discountPercent / 100)).toFixed(2)}</span></div>`
          : ''}
        <div class="grand"><span>Grand Total:</span><span>Rs ${invoice.grandTotal.toFixed(2)}</span></div>
        <div class="row paid"><span>Paid:</span><span>Rs ${invoice.paidAmount.toFixed(2)}</span></div>
        ${invoice.dueAmount > 0
          ? `<div class="row due" style="border-top:1px dashed #fca5a5;padding-top:2px;"><span>Due Balance:</span><span>Rs ${invoice.dueAmount.toFixed(2)}</span></div>`
          : ''}
      </div>
    </div>
  </div>
</body>
</html>`;
}

export function buildInvoiceHtml(config: InvoiceConfig, invoice: InvoicePrintData, format: PrinterFormat): string {
  if (format === 'thermal_58mm') return buildThermalHtml(config, invoice, 58);
  if (format === 'thermal_80mm') return buildThermalHtml(config, invoice, 80);
  return buildA4Html(config, invoice);
}

export function printInvoiceReceipt(config: InvoiceConfig, invoice: InvoicePrintData, format?: PrinterFormat): void {
  const resolved = resolvePrinterFormat(config, format);
  printHtml(buildInvoiceHtml(config, invoice, resolved));
}
