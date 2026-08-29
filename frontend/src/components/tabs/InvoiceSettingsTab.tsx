import React, { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Image as ImageIcon,
  MessageCircle,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Send,
  ShieldCheck,
  Store,
  Trash2,
  Upload,
} from 'lucide-react';
import { InvoiceConfig, InvoicePrintData, SalesRecord } from '../../types';
import {
  exportInvoicesHTML,
  exportInvoicesJSON,
  exportToCSV,
  formatWhatsAppPhone,
  salesRecordToInvoicePrintData,
} from '../../utils/exportCsv';
import { PrinterFormat, resolvePrinterFormat } from '../../utils/receiptPrint';

const PRINTER_FORMAT_OPTIONS: { value: PrinterFormat; label: string; hint: string }[] = [
  { value: 'thermal_80mm', label: '80mm Thermal Receipt', hint: 'Standard-width till roll — most common counter printers' },
  { value: 'thermal_58mm', label: '58mm Thermal Receipt', hint: 'Narrow till roll — compact/handheld printers' },
  { value: 'a4', label: 'A4 Full Page', hint: 'Full tax-invoice layout for a regular printer' },
];

interface InvoiceSettingsTabProps {
  invoiceConfig: InvoiceConfig;
  setInvoiceConfig: React.Dispatch<React.SetStateAction<InvoiceConfig>>;
  salesHistory?: SalesRecord[];
  onPurgeOldInvoices?: () => void;
  onPrintInvoice?: (data: InvoicePrintData) => void;
  onNavigateToReset?: () => void;
}

export const InvoiceSettingsTab: React.FC<InvoiceSettingsTabProps> = ({
  invoiceConfig,
  setInvoiceConfig,
  salesHistory = [],
  onPurgeOldInvoices,
  onPrintInvoice,
  onNavigateToReset,
}) => {
  const [formData, setFormData] = useState<InvoiceConfig>(invoiceConfig);
  const [purgeNotice, setPurgeNotice] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle Logo File Upload (supports JPG, PNG, WEBP, SVG)
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a valid image file (PNG, JPG, SVG, WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setUploadError('Image size is too large. Please select an image under 2MB.');
      return;
    }

    setUploadError(null);
    const reader = new FileReader();
    reader.onload = event => {
      const result = event.target?.result as string;
      if (result) {
        setFormData(prev => ({
          ...prev,
          logoUrl: result,
        }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({
      ...prev,
      logoUrl: '',
    }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Date filter states for Invoice Download Center
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDatePreset, setActiveDatePreset] = useState<string>('all');

  const retentionMonths = formData.retentionMonths || 6;

  // Calculate cutoff date based on retention months (3, 6, or 12 months)
  const getCutoffDate = (months: number) => {
    const date = new Date();
    date.setMonth(date.getMonth() - months);
    return date.toISOString().slice(0, 10);
  };

  const cutoffDate = getCutoffDate(retentionMonths);
  const expiredInvoices = salesHistory.filter(s => s.date < cutoffDate);
  const retainedInvoices = salesHistory.filter(s => s.date >= cutoffDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setInvoiceConfig(formData);
    alert('Invoice settings, shop details & retention policy saved successfully!');
  };

  const handleManualPurge = () => {
    if (onPurgeOldInvoices) {
      onPurgeOldInvoices();
    } else {
      if (expiredInvoices.length === 0) {
        setPurgeNotice(`All ${salesHistory.length} invoices are active within the ${retentionMonths}-month retention period (after ${cutoffDate}).`);
      } else {
        setPurgeNotice(`Purged ${expiredInvoices.length} invoices older than ${retentionMonths} months (dated before ${cutoffDate}).`);
      }
      setTimeout(() => setPurgeNotice(null), 5000);
    }
  };

  // Quick Date Range Filter Presets
  const handleApplyDatePreset = (preset: string) => {
    setActiveDatePreset(preset);
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);

    if (preset === 'all') {
      setFilterFrom('');
      setFilterTo('');
    } else if (preset === 'today') {
      setFilterFrom(todayStr);
      setFilterTo(todayStr);
    } else if (preset === '7days') {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      setFilterFrom(d.toISOString().slice(0, 10));
      setFilterTo(todayStr);
    } else if (preset === '30days') {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      setFilterFrom(d.toISOString().slice(0, 10));
      setFilterTo(todayStr);
    } else if (preset === '3months') {
      const d = new Date();
      d.setMonth(d.getMonth() - 3);
      setFilterFrom(d.toISOString().slice(0, 10));
      setFilterTo(todayStr);
    } else if (preset === '6months') {
      const d = new Date();
      d.setMonth(d.getMonth() - 6);
      setFilterFrom(d.toISOString().slice(0, 10));
      setFilterTo(todayStr);
    } else if (preset === '1year') {
      const d = new Date();
      d.setFullYear(d.getFullYear() - 1);
      setFilterFrom(d.toISOString().slice(0, 10));
      setFilterTo(todayStr);
    }
  };

  // Filtered invoices based on Date Range and Search Query
  const filteredInvoices = useMemo(() => {
    return salesHistory.filter(s => {
      const matchFrom = !filterFrom || s.date >= filterFrom;
      const matchTo = !filterTo || s.date <= filterTo;

      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        !q ||
        (s.inv && s.inv.toLowerCase().includes(q)) ||
        (s.invoiceNo && s.invoiceNo.toLowerCase().includes(q)) ||
        (s.cust && s.cust.toLowerCase().includes(q)) ||
        (s.patient && s.patient.toLowerCase().includes(q)) ||
        (s.phone && s.phone.includes(q)) ||
        (s.doctor && s.doctor.toLowerCase().includes(q)) ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.items && s.items.toLowerCase().includes(q));

      return matchFrom && matchTo && matchQuery;
    });
  }, [salesHistory, filterFrom, filterTo, searchQuery]);

  // Total amount of filtered invoices
  const filteredTotalAmt = useMemo(() => {
    return filteredInvoices.reduce((sum, inv) => sum + Number(inv.total || inv.amt || 0), 0);
  }, [filteredInvoices]);

  // DOWNLOAD HANDLERS
  const handleDownloadExcel = () => {
    if (filteredInvoices.length === 0) {
      alert('No invoices found for the selected date filter to download.');
      return;
    }

    const headers = [
      'Invoice No',
      'Date',
      'Patient Name',
      'Phone',
      'Doctor Ref',
      'Billed Items',
      'Qty',
      'Payment Mode',
      'Subtotal (₹)',
      'Discount (%)',
      'Paid (₹)',
      'Due (₹)',
      'Grand Total (₹)',
    ];

    const rows = filteredInvoices.map(s => [
      s.inv || s.invoiceNo || `INV-${s.id}`,
      s.date,
      s.cust || s.patient || s.name || 'Counter Customer',
      s.phone || 'N/A',
      s.doctor || 'Self Prescribed / OTC',
      s.items || s.name || 'Pharmacy Medicines',
      s.qty || 1,
      s.mode || 'Cash',
      s.subtotal !== undefined ? s.subtotal : (s.total || s.amt || 0),
      s.discountPercent || 0,
      s.paidAmount !== undefined ? s.paidAmount : (s.total || s.amt || 0),
      s.dueAmount !== undefined ? s.dueAmount : 0,
      s.total || s.amt || 0,
    ]);

    const dateRangeTag = filterFrom && filterTo ? `${filterFrom}_to_${filterTo}` : filterFrom ? `from_${filterFrom}` : 'all_dates';
    exportToCSV(`Invoices_Register_${dateRangeTag}`, headers, rows);
  };

  const handleDownloadHTMLBatch = () => {
    if (filteredInvoices.length === 0) {
      alert('No invoices found for the selected date filter to export.');
      return;
    }
    const label = filterFrom && filterTo ? `${filterFrom} to ${filterTo}` : filterFrom ? `From ${filterFrom}` : 'Complete Archive';
    exportInvoicesHTML('Invoices_Print_Batch', filteredInvoices, invoiceConfig, label);
  };

  const handleDownloadJSON = () => {
    if (filteredInvoices.length === 0) {
      alert('No invoices found for the selected date filter to export.');
      return;
    }
    exportInvoicesJSON('Invoices_Backup', filteredInvoices, invoiceConfig);
  };

  const handlePrintSingle = (s: SalesRecord) => {
    if (onPrintInvoice) {
      const data = salesRecordToInvoicePrintData(s);
      onPrintInvoice(data);
    }
  };

  const handleWhatsAppSingle = (s: SalesRecord) => {
    const phone = s.phone;
    if (!phone || phone === 'N/A') {
      alert('Patient phone number is not available for this invoice.');
      return;
    }
    const formatted = formatWhatsAppPhone(phone);
    if (!formatted || formatted.length < 10) {
      alert('Valid 10-digit phone number is required.');
      return;
    }

    const invNumber = s.inv || s.invoiceNo || `INV-${s.id}`;
    const patientName = s.cust || s.patient || s.name || 'Customer';
    const totalAmt = Number(s.total || s.amt || 0).toFixed(2);
    const msg = `🧾 *INVOICE COPY #${invNumber}*\n🏥 *${invoiceConfig.name}*\n📍 ${invoiceConfig.addr}\n📞 Ph: ${invoiceConfig.phone}\n----------------------------------\n👤 *Patient:* ${patientName}\n📅 *Date:* ${s.date}\n💊 *Items:* ${s.items || s.name}\n💰 *Amount:* ₹${totalAmt}\n💳 *Payment Mode:* ${s.mode}\n----------------------------------\n${invoiceConfig.terms}\n\n👉 Join WhatsApp Channel: ${invoiceConfig.waGroup}`;

    const url = `https://api.whatsapp.com/send?phone=${formatted}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6 text-text">
      {/* 1. INVOICE STORAGE & AUTO-DELETION POLICY CARD */}
      <div
        id="invoice-retention-policy-card"
        className="p-6 rounded-3xl bg-surface/90 backdrop-blur-2xl border border-border shadow-2xl space-y-5"
      >
        <div className="flex justify-between items-center border-b border-border pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400 shadow-lg">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text flex items-center gap-2 flex-wrap">
                <span>Invoice Storage & Auto-Deletion Policy</span>
                <span className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-[11px] px-2.5 py-0.5 rounded-full font-mono font-medium">
                  {retentionMonths}-Month Active Policy
                </span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Invoice storage duration, auto-deletion rules, and date-wise downloads
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Storage & Purge Active</span>
            </span>
          </div>
        </div>

        {/* PRIMARY MANDATORY POLICY HIGHLIGHT */}
        <div className="p-4 rounded-2xl bg-warning/8 border border-warning/30 space-y-2 backdrop-blur-md">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-warning/20 text-warning shrink-0 mt-0.5">
              <Database className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                • The invoices should be stored for six months (or selected period: 3 months, 6 months, 1 year).
              </p>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-200">
                • After six months, older invoices will be automatically deleted from the live buffer.
              </p>
              <p className="text-xs text-text-muted font-sans pt-1">

              </p>
            </div>
          </div>
        </div>

        {/* RETENTION METRICS & LIVE STORAGE STATUS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-surface-elevated border border-border space-y-1.5 backdrop-blur-md">
            <div className="text-text-muted flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>Current Retention Window:</span>
            </div>
            <div className="text-lg font-bold text-text font-mono">
              {retentionMonths} Months ({retentionMonths * 30} Days)
            </div>
            <p className="text-[11px] text-text-muted">
              Invoices before <b className="text-primary font-mono">{cutoffDate}</b> are scheduled for deletion.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-elevated border border-border space-y-1.5 backdrop-blur-md">
            <div className="text-text-muted flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Invoices Active in Storage:</span>
            </div>
            <div className="text-lg font-bold text-emerald-600 dark:text-emerald-400 font-mono">
              {retainedInvoices.length} Invoices Available
            </div>
            <p className="text-[11px] text-text-muted">
              Ready for search, reprint, and instant download.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-surface-elevated border border-border space-y-1.5 backdrop-blur-md">
            <div className="text-text-muted flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
              <span>Invoices Older than {retentionMonths} Months:</span>
            </div>
            <div className="text-lg font-bold text-rose-600 dark:text-rose-400 font-mono">
              {expiredInvoices.length} Expired / Purged
            </div>
            <p className="text-[11px] text-text-muted">
              Auto-purged to keep system blazing fast.
            </p>
          </div>
        </div>

        {/* POLICY SETTING CONTROLS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs pt-2">
          <div>
            <label className="font-medium text-text-muted block mb-1">
              Invoice Retention Period
            </label>
            <select
              value={formData.retentionMonths || 6}
              onChange={e => setFormData({ ...formData, retentionMonths: parseInt(e.target.value, 10) || 6 })}
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary font-medium"
            >
              <option value="6" className="bg-surface text-text">6 Months (Standard - Default)</option>
              <option value="3" className="bg-surface text-text">3 Months (Quarterly)</option>
              <option value="12" className="bg-surface text-text">12 Months (1 Year)</option>
            </select>
          </div>

          <div>
            <label className="font-medium text-text-muted block mb-1">
              Automated Auto-Purge Routine
            </label>
            <div className="flex items-center justify-between p-2.5 bg-surface-elevated border border-border rounded-xl text-text">
              <span className="text-text-muted text-xs">Auto-delete bills older than {formData.retentionMonths || 6} months</span>
              <input
                type="checkbox"
                checked={formData.autoPurgeOldInvoices !== false}
                onChange={e => setFormData({ ...formData, autoPurgeOldInvoices: e.target.checked })}
                className="w-4 h-4 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* MANUAL PURGE BUTTON & NOTICE */}
        <div className="flex items-center justify-between pt-3 border-t border-border flex-wrap gap-3">
          <div className="text-xs text-text-muted flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Audit-ready storage with rolling deletion protocol</span>
          </div>

          <button
            type="button"
            onClick={handleManualPurge}
            className="px-4 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-500/30 rounded-2xl font-bold transition flex items-center gap-1.5 cursor-pointer text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clean Expired Invoices (&gt;{retentionMonths} Months)</span>
          </button>
        </div>

        {purgeNotice && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{purgeNotice}</span>
          </div>
        )}
      </div>

      {/* 2. STORED INVOICES ARCHIVE & DATE-WISE DOWNLOAD CENTER */}
      <div
        id="invoice-download-center-card"
        className="p-6 rounded-3xl bg-surface/90 backdrop-blur-2xl border border-border shadow-2xl space-y-5"
      >
        <div className="flex justify-between items-center border-b border-border pb-3 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary shadow-lg shadow-primary/40">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text flex items-center gap-2">
                <span>Stored Invoices Archive & Date-Wise Download Center</span>
              </h3>
              <p className="text-xs text-text-muted mt-0.5">
                Filter invoices stored in the system and download as Excel or printable PDF
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="bg-primary/20 text-primary border border-primary/30 text-xs px-3 py-1 rounded-full font-mono font-bold">
              {filteredInvoices.length} Invoices Found (₹ {filteredTotalAmt.toFixed(2)})
            </span>
          </div>
        </div>

        {/* QUICK DATE PRESET BUTTONS */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs">
          <span className="text-text-muted font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-primary" />
            <span>Quick Range:</span>
          </span>
          {[
            { key: 'all', label: 'All Stored' },
            { key: 'today', label: 'Today' },
            { key: '7days', label: 'Last 7 Days' },
            { key: '30days', label: 'Last 30 Days' },
            { key: '3months', label: 'Last 3 Months' },
            { key: '6months', label: 'Last 6 Months' },
            { key: '1year', label: 'Last 1 Year' },
          ].map(p => (
            <button
              key={p.key}
              type="button"
              onClick={() => handleApplyDatePreset(p.key)}
              className={`px-3 py-1 rounded-xl font-medium transition cursor-pointer ${
                activeDatePreset === p.key
                  ? 'bg-primary text-primary-foreground font-bold shadow-md shadow-primary/30'
                  : 'bg-surface hover:bg-border-elevated text-text-muted border border-border'
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* DATE RANGE FILTERS & SEARCH */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs items-end">
          <div>
            <label className="font-medium text-text-muted block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>From Date</span>
            </label>
            <input
              type="date"
              id="invoice-filter-from"
              value={filterFrom}
              onChange={e => {
                setFilterFrom(e.target.value);
                setActiveDatePreset('custom');
              }}
              className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-medium text-text-muted block mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              <span>To Date</span>
            </label>
            <input
              type="date"
              id="invoice-filter-to"
              value={filterTo}
              onChange={e => {
                setFilterTo(e.target.value);
                setActiveDatePreset('custom');
              }}
              className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-medium text-text-muted block mb-1 flex items-center gap-1">
              <Search className="w-3.5 h-3.5 text-text-muted" />
              <span>Search Invoices</span>
            </label>
            <input
              type="text"
              id="invoice-filter-search"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Invoice #, Patient, Phone..."
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary"
            />
          </div>

          <div>
            <button
              type="button"
              onClick={() => {
                setFilterFrom('');
                setFilterTo('');
                setSearchQuery('');
                setActiveDatePreset('all');
              }}
              className="w-full bg-surface-elevated hover:bg-surface text-text-muted border border-border font-semibold p-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer backdrop-blur-md"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
            </button>
          </div>
        </div>

        {/* BATCH DOWNLOAD ACTION BUTTONS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          <button
            type="button"
            onClick={handleDownloadExcel}
            className="bg-emerald-600 hover:bg-emerald-500 text-text font-bold p-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg transition cursor-pointer text-xs"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Excel / CSV ({filteredInvoices.length} Invoices)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadHTMLBatch}
            className="bg-primary hover:bg-primary-hover text-primary-foreground font-bold p-3 rounded-2xl flex items-center justify-center gap-2 shadow-lg shadow-primary/40 transition cursor-pointer text-xs"
          >
            <Printer className="w-4 h-4" />
            <span>Download / Print Invoices (PDF Batch)</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadJSON}
            className="bg-surface-elevated hover:bg-surface text-text-muted border border-border font-semibold p-3 rounded-2xl flex items-center justify-center gap-2 transition cursor-pointer text-xs backdrop-blur-md"
          >
            <Database className="w-4 h-4 text-primary" />
            <span>Export Invoices Data (JSON Backup)</span>
          </button>
        </div>

        {/* STORED INVOICES TABLE */}
        <div className="overflow-y-auto max-h-80 border border-border rounded-2xl bg-surface backdrop-blur-md">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-bg font-semibold text-text-muted sticky top-0 backdrop-blur-md text-[11px] uppercase">
              <tr>
                <th className="p-3">Invoice No & Date</th>
                <th className="p-3">Patient / Contact</th>
                <th className="p-3">Doctor Ref</th>
                <th className="p-3">Items & Quantity</th>
                <th className="p-3">Payment</th>
                <th className="p-3 text-right">Total (₹)</th>
                <th className="p-3 text-center">Invoice Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-text">
              {filteredInvoices.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-muted">
                    No stored invoices found matching the selected date range.
                  </td>
                </tr>
              ) : (
                filteredInvoices.map((s, idx) => {
                  const invNo = s.inv || s.invoiceNo || `INV-${s.id}`;
                  const isExp = s.date < cutoffDate;

                  return (
                    <tr key={s.id || idx} className="hover:bg-surface transition">
                      <td className="p-3">
                        <span className="font-mono font-bold text-primary block">{invNo}</span>
                        <span className="text-[10px] text-text-muted font-mono flex items-center gap-1">
                          <span>{s.date}</span>
                          {isExp && (
                            <span className="text-amber-600 dark:text-amber-400 font-bold bg-amber-400/10 px-1.5 rounded">
                              &gt;{retentionMonths}M
                            </span>
                          )}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="font-semibold text-text block">
                          {s.cust || s.patient || s.name || 'Counter Customer'}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">
                          {s.phone || 'N/A'}
                        </span>
                      </td>

                      <td className="p-3 text-text-muted">
                        {s.doctor || 'Self / OTC'}
                      </td>

                      <td className="p-3 max-w-[200px] truncate text-text-muted">
                        <span>{s.items || s.name}</span>
                        <span className="block text-[10px] text-text-muted font-mono">
                          Qty: {s.qty || 1}
                        </span>
                      </td>

                      <td className="p-3">
                        <span className="bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-[11px] font-medium">
                          {s.mode || 'Cash'}
                        </span>
                      </td>

                      <td className="p-3 text-right font-mono font-bold text-text text-sm">
                        ₹ {Number(s.total || s.amt || 0).toFixed(2)}
                      </td>

                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handlePrintSingle(s)}
                            className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30 px-2 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-1 cursor-pointer"
                            title="Print / View PDF"
                          >
                            <Printer className="w-3 h-3" />
                            <span>PDF</span>
                          </button>

                          {s.phone && s.phone !== 'N/A' && (
                            <button
                              type="button"
                              onClick={() => handleWhatsAppSingle(s)}
                              className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 p-1 rounded-lg transition cursor-pointer"
                              title="Share on WhatsApp"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. GENERAL INVOICE & SHOP DETAILS FORM */}
      <div className="p-6 rounded-3xl bg-surface/90 backdrop-blur-2xl border border-border shadow-2xl space-y-5">
        <div className="border-b border-border pb-3">
          <h3 className="text-base font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Store className="w-4 h-4" />
            </div>
            <span>Invoice & WhatsApp Settings</span>
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Configure shop name, drug license (D.L.), GSTIN tax ID, contact phone, shop address, and WhatsApp customer channel link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Shop Logo / Photo Upload Box */}
          <div className="p-4 rounded-2xl bg-surface-elevated border border-border space-y-3">
            <div className="flex justify-between items-center flex-wrap gap-2">
              <div>
                <label className="font-bold text-text flex items-center gap-2 text-xs">
                  <Camera className="w-4 h-4 text-primary" />
                  <span>Shop Logo & Storefront Photo</span>
                </label>
                <p className="text-[11px] text-text-muted mt-0.5">
                  Upload directly from your file system (PNG, JPG, SVG, WebP up to 2MB). Appears at the top of all printed invoices and PDF bills.
                </p>
              </div>

              {formData.logoUrl && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="px-3 py-1 bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove Logo</span>
                </button>
              )}
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex items-center gap-4 flex-wrap">
              {/* Preview Thumbnail */}
              <div className="w-24 h-24 rounded-2xl bg-surface border border-dashed border-border flex items-center justify-center overflow-hidden p-1.5 shrink-0">
                {formData.logoUrl ? (
                  <img
                    src={formData.logoUrl}
                    alt="Logo Preview"
                    className="w-full h-full object-contain rounded-xl bg-white/90 p-1"
                  />
                ) : (
                  <div className="text-center text-text-muted flex flex-col items-center">
                    <ImageIcon className="w-6 h-6 mb-1 text-text-muted" />
                    <span className="text-[10px]">No Logo</span>
                  </div>
                )}
              </div>

              {/* Upload Trigger and File Input */}
              <div className="flex-1 min-w-[220px] space-y-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  id="shop-logo-file-input"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                  onChange={handleLogoFileUpload}
                  className="hidden"
                />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full sm:w-auto px-4 py-2.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary rounded-xl font-bold flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-primary" />
                  <span>{formData.logoUrl ? 'Change Shop Logo File' : 'Upload Shop Photo / Logo File'}</span>
                </button>

                <p className="text-[10px] text-text-muted">
                  Recommended: High-resolution PNG or JPG with transparent or light background.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="font-medium text-text-muted block mb-1">
                Shop / Clinic Name
              </label>
              <input
                type="text"
                id="inv-cfg-name"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-bold text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg backdrop-blur-md"
                required
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">
                Drug License (D.L.) Number
              </label>
              <input
                type="text"
                id="inv-cfg-dl"
                value={formData.dl}
                onChange={e => setFormData({ ...formData, dl: e.target.value })}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg backdrop-blur-md"
                required
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">
                GSTIN / Tax ID
              </label>
              <input
                type="text"
                id="inv-cfg-gst"
                value={formData.gst}
                onChange={e => setFormData({ ...formData, gst: e.target.value })}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg backdrop-blur-md"
                required
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">
                Contact Phone
              </label>
              <input
                type="text"
                id="inv-cfg-phone"
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg backdrop-blur-md"
                required
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1 flex items-center gap-1.5">
                <Printer className="w-3.5 h-3.5 text-primary" />
                Default Receipt / Printer Format
              </label>
              <select
                id="inv-cfg-printer-type"
                value={resolvePrinterFormat(formData)}
                onChange={e => setFormData({ ...formData, printerType: e.target.value as PrinterFormat })}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary font-medium"
              >
                {PRINTER_FORMAT_OPTIONS.map(opt => (
                  <option key={opt.value} value={opt.value} className="bg-surface text-text">
                    {opt.label}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-text-muted mt-1">
                {PRINTER_FORMAT_OPTIONS.find(o => o.value === resolvePrinterFormat(formData))?.hint}
                {' '}— can be overridden per-bill from the print preview.
              </p>
            </div>

            <div className="md:col-span-2">
              <label className="font-medium text-emerald-700 dark:text-emerald-300 block mb-1 flex items-center gap-1.5">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                WhatsApp Group Invite Link
              </label>
              <input
                type="text"
                id="inv-cfg-wagroup"
                value={formData.waGroup}
                onChange={e => setFormData({ ...formData, waGroup: e.target.value })}
                className="w-full p-2.5 border border-emerald-500/30 bg-emerald-500/10 rounded-xl font-mono text-emerald-800 dark:text-emerald-200 outline-none focus:border-emerald-400 backdrop-blur-md"
                placeholder="https://chat.whatsapp.com/your-invite-code"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-medium text-text-muted block mb-1">
                Shop Address
              </label>
              <input
                type="text"
                id="inv-cfg-addr"
                value={formData.addr}
                onChange={e => setFormData({ ...formData, addr: e.target.value })}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg backdrop-blur-md"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="font-medium text-text-muted block mb-1">
                Bill Footer Terms & Conditions
              </label>
              <input
                type="text"
                id="inv-cfg-terms"
                value={formData.terms}
                onChange={e => setFormData({ ...formData, terms: e.target.value })}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg backdrop-blur-md"
                required
              />
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-border">
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-text font-bold px-6 py-2.5 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings & Retention Policy</span>
            </button>
          </div>
        </form>
      </div>

      {/* DEDICATED RESET & 5-DAY BACKUP HIGHLIGHT CARD */}
      <div className="p-6 rounded-3xl bg-danger/8 backdrop-blur-2xl border border-danger/30 shadow-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-danger/20 border border-danger/30 text-danger flex items-center justify-center shrink-0">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-text flex items-center gap-2">
              <span>Organization Handover / System Reset</span>
              <span className="bg-danger/20 text-danger text-[10px] px-2 py-0.5 rounded-full font-bold border border-danger/30">
                Admin
              </span>
            </h4>
            <p className="text-xs text-text-muted mt-0.5">
              Wipe demo/existing data, configure a fresh organization with clean forms, and manage 5-day automated safety backups.
            </p>
          </div>
        </div>

        {onNavigateToReset && (
          <button
            id="btn-goto-system-reset"
            onClick={onNavigateToReset}
            className="btn-danger px-5 py-2.5 rounded-2xl text-xs shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Open Reset & 5-Day Backup Hub</span>
          </button>
        )}
      </div>
    </div>
  );
};
