// Bulk CSV / Excel import for the Medicine & Lab Stock table. Column headers
// are matched loosely (case-insensitive, ignoring punctuation/spacing) so the
// file exported by exportCsv.ts's handleExportCSV round-trips cleanly, and so
// a pharmacist's own ad-hoc spreadsheet with plain headers like "Name" /
// "MRP" / "Stock" still works without forcing an exact template.
import * as XLSX from 'xlsx';
import { Medicine } from '../types';

export const IMPORT_TEMPLATE_HEADERS = [
  'Item Type',
  'Name',
  'Brand / Company',
  'Salt / Parameter',
  'Distributor',
  'HSN Code',
  'Batch',
  'Pack Type',
  'Units Per Pack',
  'Stock Quantity',
  'Purchase Rate',
  'Old MRP',
  'Selling MRP',
  'GST %',
  'Discount %',
  'Expiry (YYYY-MM)',
  'Rack / Chamber',
];

const TEMPLATE_EXAMPLE_ROWS: (string | number)[][] = [
  [
    'Medicine',
    'Paracetamol 650mg',
    'Cipla',
    'Paracetamol 650mg',
    'General Supplier',
    '300490',
    'B26001',
    'Strip',
    10,
    50,
    22.0,
    0,
    30.0,
    12,
    4,
    '2027-12',
    'RACK-A1',
  ],
  [
    'Medicine',
    'Cough Syrup 100ml',
    'Micro Labs',
    'Dextromethorphan',
    'General Supplier',
    '300490',
    'B26002',
    'Bottle',
    100,
    20,
    45.0,
    0,
    65.0,
    12,
    0,
    '2027-06',
    'RACK-B2',
  ],
];

// Downloads a starter .csv the pharmacist can fill in and re-upload — same
// mechanism as exportCsv.ts's exportToCSV (UTF-8 BOM for Excel).
export function downloadImportTemplate() {
  let csvContent = '﻿' + IMPORT_TEMPLATE_HEADERS.map(h => `"${h}"`).join(',') + '\n';
  TEMPLATE_EXAMPLE_ROWS.forEach(row => {
    csvContent += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
  });
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'kinetirx_stock_import_template.csv';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Parses a .csv/.xlsx/.xls File into an array of plain header->value row
// objects. Excel parsing goes through SheetJS (installed from SheetJS's own
// CDN, not the unmaintained/vulnerable npm "xlsx" package — see the prototype
// pollution / ReDoS advisories against npm's copy).
export async function parseImportFile(file: File): Promise<Record<string, string>[]> {
  const ext = file.name.split('.').pop()?.toLowerCase();

  if (ext === 'csv') {
    const text = await file.text();
    return parseCsvText(text);
  }

  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) return [];
  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '', raw: false });
  return rows.map(row => {
    const out: Record<string, string> = {};
    for (const key of Object.keys(row)) {
      out[key] = String(row[key] ?? '').trim();
    }
    return out;
  });
}

// Minimal RFC4180-ish CSV parser (handles quoted fields, escaped "" quotes,
// commas/newlines inside quotes). No external dependency needed for CSV.
function parseCsvText(text: string): Record<string, string>[] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  const src = text.replace(/^﻿/, '');

  for (let i = 0; i < src.length; i++) {
    const char = src[i];
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      if (row.some(c => c.trim() !== '')) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    if (row.some(c => c.trim() !== '')) rows.push(row);
  }

  if (rows.length === 0) return [];
  const headers = rows[0].map(h => h.trim());
  return rows.slice(1).map(r => {
    const out: Record<string, string> = {};
    headers.forEach((h, idx) => {
      out[h] = (r[idx] ?? '').trim();
    });
    return out;
  });
}

// Normalizes a header for loose matching: lowercase, alphanumerics only.
function normalizeHeader(h: string): string {
  return h.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Each Medicine field accepts several plausible header spellings, matched
// after normalization (so "Selling MRP", "MRP", "Selling MRP / Fee (INR)"
// all resolve to the same target).
const FIELD_ALIASES: Record<string, string[]> = {
  itemType: ['itemtype'],
  name: ['name', 'itemname', 'medicinename', 'itemnamebrand'],
  company: ['brandcompany', 'company', 'brand'],
  salt: ['saltparameter', 'salt', 'saltformulation'],
  dist: ['distributor', 'distributorlabwing', 'supplier'],
  hsn: ['hsncode', 'hsn'],
  batch: ['batchserviceid', 'batch', 'batchnumber'],
  packType: ['packtype'],
  tabsPerStrip: ['unitsperpack', 'tabletsperstrip', 'unitsperstrip'],
  stock: ['stockquantityunits', 'stocktrackingunits', 'stockquantity', 'stock'],
  rate: ['purchaseratecostrateinr', 'purchaserate', 'costrate', 'rate'],
  omrp: ['oldmrpinr', 'oldmrp', 'omrp'],
  mrp: ['sellingmrpfeeinr', 'sellingmrp', 'currentmrp', 'mrp'],
  gst: ['gst', 'gstpercent', 'gsttaxrate'],
  disc: ['discountpercent', 'disc', 'discount'],
  expiry: ['expiryyyyymm', 'expirydateyyyymm', 'expirydate', 'expiry'],
  rack: ['rackchamber', 'rackid', 'rack'],
};

function findValue(row: Record<string, string>, field: keyof typeof FIELD_ALIASES): string {
  const normalizedRow: Record<string, string> = {};
  for (const key of Object.keys(row)) {
    normalizedRow[normalizeHeader(key)] = row[key];
  }
  for (const alias of FIELD_ALIASES[field]) {
    if (normalizedRow[alias] !== undefined && normalizedRow[alias] !== '') {
      return normalizedRow[alias];
    }
  }
  return '';
}

function packSuffixFor(packType: string): string {
  const t = packType.trim().toLowerCase();
  if (t === 'bottle' || t === 'vial' || t === 'ampoule') return 'ML';
  if (t === 'tube' || t === 'jar') return 'GM';
  if (t === 'sachet') return 'Sachets';
  if (t === 'box') return 'Units';
  if (t === 'strip' || t === '') return '*T';
  return 'Units';
}

export interface ImportResult {
  medicines: Medicine[];
  errors: string[];
}

// Maps parsed spreadsheet rows into Medicine objects, mirroring the same
// field defaults AddStockModal uses (so an imported row and a manually
// added one behave identically downstream — same GST/loose-price math).
export function mapRowsToMedicines(rows: Record<string, string>[]): ImportResult {
  const medicines: Medicine[] = [];
  const errors: string[] = [];

  rows.forEach((row, idx) => {
    const rowNum = idx + 2; // header is row 1
    const name = findValue(row, 'name').trim();
    const mrpRaw = findValue(row, 'mrp');
    const mrp = parseFloat(mrpRaw);

    if (!name) {
      errors.push(`Row ${rowNum}: missing item name — skipped.`);
      return;
    }
    if (!mrpRaw || isNaN(mrp) || mrp <= 0) {
      errors.push(`Row ${rowNum} (${name}): missing/invalid Selling MRP — skipped.`);
      return;
    }

    const itemTypeRaw = findValue(row, 'itemType').trim().toLowerCase();
    const isLabTest = itemTypeRaw.includes('lab') || itemTypeRaw.includes('diagnostic');

    const packType = findValue(row, 'packType').trim() || 'Strip';
    const tabsPerStrip = parseInt(findValue(row, 'tabsPerStrip'), 10) || (isLabTest ? 1 : 10);
    const suffix = packSuffixFor(packType);
    const pack = suffix === '*T' ? `${tabsPerStrip}*T` : `${tabsPerStrip} ${suffix}`;

    medicines.push({
      id: `IMP-${Date.now()}-${idx}-${Math.floor(Math.random() * 1000)}`,
      name,
      company: findValue(row, 'company').trim() || 'Standard Pharma',
      dist: findValue(row, 'dist').trim() || 'General Supplier',
      salt: findValue(row, 'salt').trim() || name,
      batch: findValue(row, 'batch').trim() || 'GEN-' + Math.floor(100 + Math.random() * 900),
      hsn: findValue(row, 'hsn').trim() || '300490',
      pack,
      group: 'General',
      rack: findValue(row, 'rack').trim() || (isLabTest ? 'LAB-CHAMBER' : 'RACK-GEN'),
      stock: parseInt(findValue(row, 'stock'), 10) || 0,
      rate: parseFloat(findValue(row, 'rate')) || 0,
      omrp: parseFloat(findValue(row, 'omrp')) || 0,
      mrp,
      scheme: '0.00',
      gst: parseFloat(findValue(row, 'gst')) || 0,
      disc: parseFloat(findValue(row, 'disc')) || 0,
      tabsPerStrip,
      expiry: findValue(row, 'expiry').trim() || '2027-12',
      isLabTest,
      itemType: isLabTest ? 'lab_test' : 'medicine',
    });
  });

  return { medicines, errors };
}
