import { InvoiceConfig, InvoicePrintData, SalesRecord } from '../types';
import { getCurrencySymbol } from './currency';

export function exportToCSV(filename: string, headers: string[], rows: (string | number | undefined)[][]) {
  // UTF-8 BOM so Excel automatically recognizes unicode / Indian currency and Bengali characters
  let csvContent = '\uFEFF' + headers.map(h => `"${(h || '').replace(/"/g, '""')}"`).join(',') + '\n';

  rows.forEach(row => {
    const line = row
      .map(cell => {
        if (cell === null || cell === undefined) return '""';
        const str = String(cell).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(',');
    csvContent += line + '\n';
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function formatWhatsAppPhone(phone: string): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) return '91' + cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return cleaned;
  return cleaned;
}

// Export Batch Invoices as a Single Printable HTML / PDF Document
export function exportInvoicesHTML(
  filename: string,
  invoices: SalesRecord[],
  config: InvoiceConfig,
  dateRangeLabel: string = 'Archive'
) {
  const currencySymbol = getCurrencySymbol(config.currency);
  const invoiceBlocks = invoices
    .map((inv, idx) => {
      const invNum = inv.inv || inv.invoiceNo || `INV-${inv.id}`;
      const invDate = inv.date;
      const patient = inv.cust || inv.patient || inv.name || 'Counter Customer';
      const phone = inv.phone || 'N/A';
      const doctor = inv.doctor || 'Self Prescribed / OTC';
      const paymentMode = inv.mode || 'Cash';
      const totalAmt = Number(inv.total || inv.amt || 0).toFixed(2);
      const subtotal = Number(inv.subtotal || inv.total || inv.amt || 0).toFixed(2);
      const discount = inv.discountPercent || 0;
      const paid = Number(inv.paidAmount !== undefined ? inv.paidAmount : (inv.total || inv.amt || 0)).toFixed(2);
      const due = Number(inv.dueAmount !== undefined ? inv.dueAmount : 0).toFixed(2);

      let itemsRows = '';
      if (inv.itemsDetail && inv.itemsDetail.length > 0) {
        itemsRows = inv.itemsDetail
          .map(
            item => `
          <tr>
            <td>${item.name}</td>
            <td style="text-align:center;">${item.qty}</td>
            <td style="text-align:right;">${currencySymbol}${Number(item.price).toFixed(2)}</td>
            <td style="text-align:right; font-weight:bold;">${currencySymbol}${Number(item.total).toFixed(2)}</td>
          </tr>
        `
          )
          .join('');
      } else {
        itemsRows = `
          <tr>
            <td>${inv.items || inv.name || 'Pharmacy Medicines'}</td>
            <td style="text-align:center;">${inv.qty || 1}</td>
            <td style="text-align:right;">${currencySymbol}${totalAmt}</td>
            <td style="text-align:right; font-weight:bold;">${currencySymbol}${totalAmt}</td>
          </tr>
        `;
      }

      return `
      <div class="invoice-card" style="page-break-inside: avoid; border: 1px solid #cbd5e1; border-radius: 12px; padding: 20px; margin-bottom: 24px; background: #ffffff;">
        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">
          <div>
            <h2 style="margin: 0; font-size: 18px; color: #0f172a;">${config.name}</h2>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">DL: ${config.dl || 'N/A'} | GSTIN: ${config.gst || 'N/A'}</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569;">Phone: ${config.phone} • ${config.addr}</p>
          </div>
          <div style="text-align: right;">
            <span style="background: #dcfce7; color: #166534; font-size: 11px; font-weight: bold; padding: 3px 8px; border-radius: 4px; border: 1px solid #86efac;">TAX INVOICE</span>
            <p style="margin: 6px 0 0 0; font-family: monospace; font-weight: bold; font-size: 13px; color: #1e293b;">#${invNum}</p>
            <p style="margin: 2px 0 0 0; font-size: 11px; color: #64748b; font-family: monospace;">Date: ${invDate}</p>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin: 12px 0; font-size: 11px; background: #f8fafc; padding: 10px 14px; border-radius: 8px; border: 1px solid #f1f5f9;">
          <div>
            <strong>Patient Details:</strong><br>
            Name: <span style="color: #0f172a; font-weight: 600;">${patient}</span><br>
            Phone: ${phone}<br>
            ID: ${inv.patientId || `P/${idx + 101}`}
          </div>
          <div style="text-align: right;">
            <strong>Doctor Ref:</strong> ${doctor}<br>
            <strong>Payment Mode:</strong> ${paymentMode}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin: 10px 0;">
          <thead>
            <tr style="background: #f1f5f9; color: #334155; font-size: 11px;">
              <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left;">Item Description</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: center; width: 60px;">Qty</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; width: 90px;">Price</th>
              <th style="border: 1px solid #cbd5e1; padding: 6px 10px; text-align: right; width: 100px;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; align-items: flex-end; border-top: 1px solid #e2e8f0; padding-top: 10px; font-size: 11px;">
          <div style="color: #64748b; font-size: 10px; max-width: 60%;">
            ${config.terms || 'Goods once sold cannot be returned without original cash memo.'}
          </div>
          <div style="text-align: right; font-family: monospace;">
            <p style="margin: 2px 0;">Subtotal: ${currencySymbol}${subtotal}</p>
            ${discount > 0 ? `<p style="margin: 2px 0; color: #0284c7;">Discount (${discount}%): -${currencySymbol}${((Number(subtotal) * discount) / 100).toFixed(2)}</p>` : ''}
            <p style="margin: 4px 0; font-size: 14px; font-weight: bold; color: #0f172a;">Grand Total: ${currencySymbol}${totalAmt}</p>
            <p style="margin: 2px 0; color: #166534; font-weight: bold;">Paid: ${currencySymbol}${paid}</p>
            ${Number(due) > 0 ? `<p style="margin: 2px 0; color: #e11d48; font-weight: bold;">Due Balance: ${currencySymbol}${due}</p>` : ''}
          </div>
        </div>
      </div>
    `;
    })
    .join('\n');

  const fullHTML = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${filename} - ${dateRangeLabel}</title>
        <style>
          body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            background-color: #f8fafc;
            color: #1e293b;
            padding: 24px;
            margin: 0;
          }
          .header-banner {
            background: #0f172a;
            color: #ffffff;
            padding: 16px 20px;
            border-radius: 12px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          @media print {
            body { background: #ffffff; padding: 0; }
            .header-banner { display: none; }
            .no-print { display: none !important; }
            .invoice-card { page-break-after: always; margin-bottom: 0; border: none !important; }
          }
        </style>
      </head>
      <body>
        <div class="header-banner">
          <div>
            <h1 style="margin: 0; font-size: 20px;">${config.name} - Invoices Archive</h1>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">Filter: ${dateRangeLabel} | Total Invoices: ${invoices.length}</p>
          </div>
          <div class="no-print">
            <button onclick="window.print()" style="background: #4f46e5; color: #ffffff; border: none; padding: 10px 18px; border-radius: 8px; font-weight: bold; cursor: pointer; font-size: 13px;">
              Print / Save as PDF
            </button>
          </div>
        </div>
        ${invoiceBlocks}
      </body>
    </html>
  `;

  const blob = new Blob([fullHTML], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.html`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Export Invoices as JSON Backup
export function exportInvoicesJSON(filename: string, invoices: SalesRecord[], config: InvoiceConfig) {
  const exportPayload = {
    shop: config,
    exportTimestamp: new Date().toISOString(),
    retentionPolicy: `${config.retentionMonths || 6} Months`,
    totalInvoices: invoices.length,
    invoices: invoices,
  };

  const jsonString = JSON.stringify(exportPayload, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().toISOString().slice(0, 10)}.json`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// GST filing export — HSN-wise summary of outward supplies (the same shape
// as GSTR-1's Table 12). MRP-based retail pricing in India is GST-inclusive,
// so each line's taxable value is derived by reversing the tax out of the
// billed total: taxable = total / (1 + gstRate/100). Assumes intra-state
// sales (the near-universal case for a single local retail counter), so the
// tax is split evenly into CGST + SGST rather than IGST.
export function exportGSTFilingSummary(filename: string, invoices: SalesRecord[]) {
  const buckets = new Map<
    string,
    { hsn: string; gstRate: number; qty: number; taxableValue: number; taxAmount: number; totalValue: number }
  >();

  invoices.forEach(inv => {
    (inv.itemsDetail || []).forEach(item => {
      const hsn = item.hsn?.trim() || 'N/A';
      const gstRate = Number(item.gst) || 0;
      const key = `${hsn}__${gstRate}`;
      const total = Number(item.total) || 0;
      const taxableValue = gstRate > 0 ? total / (1 + gstRate / 100) : total;
      const taxAmount = total - taxableValue;

      const existing = buckets.get(key);
      if (existing) {
        existing.qty += Number(item.qty) || 0;
        existing.taxableValue += taxableValue;
        existing.taxAmount += taxAmount;
        existing.totalValue += total;
      } else {
        buckets.set(key, {
          hsn,
          gstRate,
          qty: Number(item.qty) || 0,
          taxableValue,
          taxAmount,
          totalValue: total,
        });
      }
    });
  });

  const rows = Array.from(buckets.values())
    .sort((a, b) => a.hsn.localeCompare(b.hsn) || a.gstRate - b.gstRate)
    .map(b => [
      b.hsn,
      b.gstRate.toFixed(2),
      b.qty,
      b.taxableValue.toFixed(2),
      (b.taxAmount / 2).toFixed(2),
      (b.taxAmount / 2).toFixed(2),
      b.taxAmount.toFixed(2),
      b.totalValue.toFixed(2),
    ]);

  exportToCSV(
    filename,
    ['HSN/SAC Code', 'GST Rate (%)', 'Total Quantity', 'Taxable Value', 'CGST', 'SGST', 'Total Tax', 'Total Invoice Value'],
    rows
  );
}

// Convert SalesRecord to InvoicePrintData for onPrintInvoice trigger
export function salesRecordToInvoicePrintData(s: SalesRecord): InvoicePrintData {
  const invNumber = s.inv || s.invoiceNo || `INV-${s.id}`;
  const totalVal = Number(s.total || s.amt || 0);
  const subtotalVal = Number(s.subtotal !== undefined ? s.subtotal : totalVal);

  const items = s.itemsDetail && s.itemsDetail.length > 0
    ? s.itemsDetail
    : [
        {
          name: s.items || s.name || 'Medicines',
          qty: typeof s.qty === 'number' ? s.qty : 1,
          price: totalVal,
          total: totalVal,
        },
      ];

  return {
    invNo: invNumber,
    date: s.date,
    patientId: s.patientId || 'P/101',
    patientName: s.cust || s.patient || s.name || 'Counter Customer',
    phone: s.phone || 'N/A',
    ageGender: s.ageGender || '-- / Male',
    address: s.address || 'Local Area',
    doctor: s.doctor || 'Self Prescribed / OTC',
    items: items,
    subtotal: subtotalVal,
    discountPercent: s.discountPercent || 0,
    grandTotal: totalVal,
    paidAmount: Number(s.paidAmount !== undefined ? s.paidAmount : totalVal),
    dueAmount: Number(s.dueAmount !== undefined ? s.dueAmount : 0),
    paymentMode: s.mode || 'Cash',
  };
}
