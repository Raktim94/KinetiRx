import { Distributor, InvoiceConfig, NeededMedOrder } from '../types';
import { formatPatientId } from './patientUtils';
import { downloadHtml, escHtml as esc, printHtml } from './printUtils';

// Groups the shortage book's still-open orders ("Pending" — not yet ordered,
// delivered, or cancelled) by their free-text distributor name, so the
// Medicine Orders screen can turn "we're short of these" into an actual
// purchase order per distributor instead of leaving it as a bare list.
export function groupNeededMedsByDistributor(orders: NeededMedOrder[]): Map<string, NeededMedOrder[]> {
  const groups = new Map<string, NeededMedOrder[]>();
  for (const order of orders) {
    if (order.status !== 'Pending') continue;
    const key = order.dist?.trim() || 'Unassigned Distributor';
    const list = groups.get(key) || [];
    list.push(order);
    groups.set(key, list);
  }
  return groups;
}

export function findDistributorByName(distributors: Distributor[], name: string): Distributor | undefined {
  const target = name.trim().toLowerCase();
  return distributors.find(d => d.name.trim().toLowerCase() === target);
}

export function buildPurchaseOrderHtml(
  shop: InvoiceConfig,
  distributorName: string,
  distributor: Distributor | undefined,
  orders: NeededMedOrder[],
  poNumber: string
): string {
  const today = new Date().toISOString().slice(0, 10);
  const rows = orders
    .map(
      (o, idx) => `
      <tr>
        <td class="c">${idx + 1}</td>
        <td class="b">${esc(o.med)}</td>
        <td class="c">${o.qty}</td>
        <td>${esc(o.name)}${o.patientId ? ` (${esc(formatPatientId(o.patientId))})` : ''}</td>
        <td>${esc(o.time || '-')}</td>
      </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>Purchase Order ${esc(poNumber)}</title>
<style>
  @page { size: A4 portrait; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; margin: 0; color: #0f172a; font-size: 12px; line-height: 1.4; }
  .box { max-width: 800px; margin: 0 auto; border: 1px solid #cbd5e1; border-radius: 8px; padding: 24px; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 16px; gap: 16px; }
  .title { font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
  .sub { font-size: 11px; color: #475569; margin-top: 4px; font-family: monospace; }
  .badge { display: inline-block; background: #eff6ff; color: #1e3a8a; border: 1px solid #93c5fd; font-size: 11px; font-weight: 800; padding: 3px 10px; border-radius: 4px; text-transform: uppercase; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 16px; }
  .sec-title { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 16px; font-size: 12px; }
  th, td { border: 1px solid #cbd5e1; padding: 8px 10px; text-align: left; }
  th { background: #f1f5f9; font-weight: 700; color: #334155; font-size: 11px; }
  .c { text-align: center; } .b { font-weight: 700; }
  .footer { font-size: 10px; color: #64748b; border-top: 2px solid #e2e8f0; padding-top: 12px; }
</style>
</head>
<body>
  <div class="box">
    <div class="header">
      <div>
        <div class="title">${esc(shop.name)}</div>
        <div class="sub">DL No: ${esc(shop.dl || 'N/A')} | GSTIN: ${esc(shop.gst || 'N/A')}</div>
        <div class="sub">${esc(shop.addr)} • ${esc(shop.phone)}</div>
      </div>
      <div style="text-align:right;">
        <span class="badge">Purchase Order</span>
        <div class="sub" style="font-size:13px;font-weight:700;">${esc(poNumber)}</div>
        <div class="sub">Date: ${esc(today)}</div>
      </div>
    </div>

    <div class="grid-2">
      <div>
        <div class="sec-title">Ordering From (Distributor)</div>
        <div class="b">${esc(distributorName)}</div>
        ${distributor?.gstin ? `<div>GSTIN: ${esc(distributor.gstin)}</div>` : ''}
        ${distributor?.phone ? `<div>Phone: ${esc(distributor.phone)}</div>` : ''}
        ${distributor?.addr ? `<div>${esc(distributor.addr)}</div>` : ''}
        ${!distributor ? '<div style="color:#b45309;">Not yet registered in the Distributors directory.</div>' : ''}
      </div>
      <div>
        <div class="sec-title">Order Summary</div>
        <div>${orders.length} line item${orders.length === 1 ? '' : 's'} requested</div>
        <div>Total units: ${orders.reduce((sum, o) => sum + (o.qty || 0), 0)}</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th class="c" style="width:36px;">#</th>
          <th>Medicine Required</th>
          <th class="c" style="width:70px;">Qty</th>
          <th>Requested For</th>
          <th>Needed By</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <div class="footer">
      Please confirm availability and expected delivery date at your earliest convenience.
      Generated from KinetiRx's Medicine Orders (shortage book).
    </div>
  </div>
</body>
</html>`;
}

export function printPurchaseOrder(
  shop: InvoiceConfig,
  distributorName: string,
  distributor: Distributor | undefined,
  orders: NeededMedOrder[],
  poNumber: string
): void {
  printHtml(buildPurchaseOrderHtml(shop, distributorName, distributor, orders, poNumber));
}

export function downloadPurchaseOrder(
  shop: InvoiceConfig,
  distributorName: string,
  distributor: Distributor | undefined,
  orders: NeededMedOrder[],
  poNumber: string
): void {
  downloadHtml(
    buildPurchaseOrderHtml(shop, distributorName, distributor, orders, poNumber),
    `PO_${poNumber}.html`
  );
}

function formatWhatsAppPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) return '91' + cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return cleaned;
  return cleaned;
}

// Opens a WhatsApp share with a plain-text summary of the PO — the same
// wa.me deep-link pattern already used for due-khata payment reminders.
export function shareOrderOnWhatsApp(
  shop: InvoiceConfig,
  distributorName: string,
  distributorPhone: string | undefined,
  orders: NeededMedOrder[],
  poNumber: string
): void {
  const lines = orders.map(o => `• ${o.med} — Qty ${o.qty}${o.time ? ` (needed by ${o.time})` : ''}`);
  const message =
    `*PURCHASE ORDER ${poNumber}*\n` +
    `${shop.name}\n` +
    `${shop.addr}\n` +
    `${shop.phone}\n` +
    `----------------------------------\n` +
    `To: ${distributorName}\n` +
    `----------------------------------\n` +
    lines.join('\n') +
    `\n----------------------------------\nPlease confirm availability and delivery date.`;

  const phone = distributorPhone ? formatWhatsAppPhone(distributorPhone) : '';
  const url = phone
    ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank');
}
