import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  Building2,
  Calendar,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clipboard,
  Coins,
  Copy,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  Eye,
  FileCheck,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Layers,
  Loader2,
  Package,
  PackageCheck,
  PackagePlus,
  Percent,
  Phone,
  Plus,
  Printer,
  RefreshCw,
  RotateCcw,
  Save,
  Scan,
  ScanLine,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Store,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  Upload,
  UploadCloud,
  X,
  Zap,
} from 'lucide-react';
import { Distributor, ExpenseRecord, InvoiceConfig, Medicine } from '../../types';
import { exportToCSV } from '../../utils/exportCsv';
import { formatFullDateWithDay, getTodayISODate } from '../../utils/dateUtils';
import { ocrApi } from '../../lib/api';

interface ScannedInvoiceItem {
  id?: string;
  name: string;
  company: string;
  salt: string;
  pack: string;
  hsn: string;
  batch: string;
  exp: string; // YYYY-MM
  qty: number;
  rate: number;
  dmrp?: number;
  mrp: number;
  scheme?: string;
  disc?: number;
  gst: number;
  rack?: string;
  tabsPerStrip?: number;
  isNewMedicine?: boolean;
}

interface ScannedInvoiceData {
  distributor: string;
  gstin: string;
  phone: string;
  address: string;
  invNo: string;
  invDate: string;
  totalCost: number;
  items: ScannedInvoiceItem[];
  isNewDistributor?: boolean;
}

interface InwardOCRTabProps {
  distributors: Distributor[];
  setDistributors: React.Dispatch<React.SetStateAction<Distributor[]>>;
  medicines: Medicine[];
  setMedicines: React.Dispatch<React.SetStateAction<Medicine[]>>;
  invoiceConfig: InvoiceConfig;
  expenses?: ExpenseRecord[];
  setExpenses?: React.Dispatch<React.SetStateAction<ExpenseRecord[]>>;
}

export const InwardOCRTab: React.FC<InwardOCRTabProps> = ({
  distributors,
  setDistributors,
  medicines,
  setMedicines,
  invoiceConfig,
  expenses,
  setExpenses,
}) => {
  // Current UI state
  const [activeInputMethod, setActiveInputMethod] = useState<'upload' | 'camera' | 'paste'>('upload');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Active scanned result workspace
  const [scannedResult, setScannedResult] = useState<ScannedInvoiceData | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isCommitted, setIsCommitted] = useState<boolean>(false);
  const [logAsExpense, setLogAsExpense] = useState<boolean>(false);

  // Edit modal / inline edit state
  const [editingItemIdx, setEditingItemIdx] = useState<number | null>(null);
  const [editFormData, setEditFormData] = useState<ScannedInvoiceItem | null>(null);
  const [searchFilter, setSearchFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'new' | 'existing'>('all');

  // Past Inward Log History (session memory)
  const [inwardHistory, setInwardHistory] = useState<
    Array<{
      id: string;
      date: string;
      distributor: string;
      invNo: string;
      itemCount: number;
      newMedsCount: number;
      totalCost: number;
      timestamp: string;
    }>
  >([]);

  // Camera state
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Paste Text state
  const [pastedText, setPastedText] = useState('');

  // -------------------------------------------------------------
  // HELPER: Local smart text parser for raw pasted invoice text
  // -------------------------------------------------------------
  const parseInvoiceTextLocally = (text: string): ScannedInvoiceData | null => {
    const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length === 0) return null;

    let distributor = 'SUPPLIER DISTRIBUTOR';
    let gstin = 'N/A';
    let phone = 'N/A';
    let address = 'N/A';
    let invNo = 'INV-' + Math.floor(100000 + Math.random() * 900000);
    let invDate = getTodayISODate();
    const items: ScannedInvoiceItem[] = [];

    lines.forEach(line => {
      const lower = line.toLowerCase();
      if (lower.startsWith('distributor:') || lower.startsWith('supplier:') || lower.startsWith('agency:')) {
        distributor = line.split(':')[1]?.trim() || distributor;
      } else if (lower.includes('gstin:') || lower.includes('gst:')) {
        const match = line.match(/gstin?:\s*([A-Za-z0-9]+)/i);
        if (match) gstin = match[1];
      } else if (lower.includes('phone:') || lower.includes('mobile:') || lower.includes('tel:')) {
        const match = line.match(/(?:phone|mobile|tel):\s*([\+0-9\s-]+)/i);
        if (match) phone = match[1].trim();
      } else if (lower.includes('inv no:') || lower.includes('invoice:')) {
        const match = line.match(/(?:inv no|invoice):\s*([A-Za-z0-9-]+)/i);
        if (match) invNo = match[1].trim();
      } else {
        const parts = line.split(/[,\t|]/).map(p => p.trim());
        if (parts.length >= 2) {
          const rawName = parts[0].replace(/^[0-9]+[\.\)]\s*/, '').trim();
          if (rawName && !rawName.toLowerCase().startsWith('total') && !rawName.toLowerCase().startsWith('date') && !rawName.toLowerCase().startsWith('grand')) {
            let qty = 10;
            let rate = 50;
            let mrp = 75;
            let batch = 'B-' + Math.floor(1000 + Math.random() * 9000);
            let exp = '2028-12';
            let pack = '10*T';

            parts.slice(1).forEach(p => {
              const pLower = p.toLowerCase();
              if (pLower.includes('qty:')) qty = parseFloat(p.split(':')[1]) || qty;
              else if (pLower.includes('rate:')) rate = parseFloat(p.split(':')[1]) || rate;
              else if (pLower.includes('mrp:')) mrp = parseFloat(p.split(':')[1]) || mrp;
              else if (pLower.includes('batch:')) batch = p.split(':')[1]?.trim() || batch;
              else if (pLower.includes('exp:')) exp = p.split(':')[1]?.trim() || exp;
              else if (pLower.includes('pack:')) pack = p.split(':')[1]?.trim() || pack;
              else if (!isNaN(parseFloat(p))) {
                if (qty === 10) qty = parseFloat(p);
                else if (rate === 50) rate = parseFloat(p);
                else if (mrp === 75) mrp = parseFloat(p);
              }
            });

            items.push({
              name: rawName.toUpperCase(),
              pack,
              hsn: '300490',
              dmrp: 0,
              batch,
              exp,
              mrp,
              rate,
              disc: 0,
              scheme: '0.00',
              gst: 12,
              qty,
              salt: 'Pharma Formulation',
              company: distributor.split(' ')[0] || 'Pharma',
              rack: 'RACK-GEN',
              tabsPerStrip: 10,
            });
          }
        }
      }
    });

    if (items.length === 0) return null;

    const totalCost = items.reduce((acc, i) => acc + (i.rate * i.qty), 0);

    return {
      distributor,
      gstin,
      phone,
      address,
      invNo,
      invDate,
      totalCost,
      items,
    };
  };

  // -------------------------------------------------------------
  // RECONCILIATION HELPER: Check which items exist or are missing
  // -------------------------------------------------------------
  const reconcileScannedItems = (items: ScannedInvoiceItem[]): ScannedInvoiceItem[] => {
    return items.map(item => {
      const exists = medicines.some(
        m =>
          m.name.trim().toLowerCase() === item.name.trim().toLowerCase() ||
          (item.batch && m.batch && m.batch.trim().toLowerCase() === item.batch.trim().toLowerCase())
      );
      return {
        ...item,
        isNewMedicine: !exists,
      };
    });
  };

  // -------------------------------------------------------------
  // COMMIT INWARD INVOICE TO INVENTORY & DISTRIBUTORS
  // -------------------------------------------------------------
  const handleCommitToStock = (invoiceDataToCommit?: ScannedInvoiceData) => {
    const data = invoiceDataToCommit || scannedResult;
    if (!data) return;

    // 1. REGISTER OR UPDATE DISTRIBUTOR
    let isNewDist = false;
    setDistributors(prev => {
      const existingIdx = prev.findIndex(
        d =>
          d.name.trim().toLowerCase() === data.distributor.trim().toLowerCase() ||
          (data.gstin && data.gstin !== 'N/A' && d.gstin && d.gstin.trim().toLowerCase() === data.gstin.trim().toLowerCase())
      );

      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = {
          ...updated[existingIdx],
          phone: data.phone && data.phone !== 'N/A' ? data.phone : updated[existingIdx].phone,
          addr: data.address && data.address !== 'N/A' ? data.address : updated[existingIdx].addr,
          gstin: data.gstin && data.gstin !== 'N/A' ? data.gstin : updated[existingIdx].gstin,
        };
        return updated;
      } else {
        isNewDist = true;
        const newDistributor: Distributor = {
          id: 'DIST-' + Date.now(),
          name: data.distributor.trim().toUpperCase(),
          gstin: data.gstin || 'N/A',
          phone: data.phone || 'N/A',
          addr: data.address || 'N/A',
          registeredDate: getTodayISODate(),
          source: 'OCR Purchase Bill',
        };
        return [newDistributor, ...prev];
      }
    });

    // 2. MERGE / ADD MEDICINES INTO LIVE STOCK
    let newMedsAddedCount = 0;
    let existingMedsUpdatedCount = 0;

    setMedicines(prev => {
      const nextList = [...prev];

      data.items.forEach((item, idx) => {
        const existingIdx = nextList.findIndex(
          m =>
            m.name.trim().toLowerCase() === item.name.trim().toLowerCase() ||
            (item.batch && m.batch && m.batch.trim().toLowerCase() === item.batch.trim().toLowerCase())
        );

        if (existingIdx >= 0) {
          // UPDATE EXISTING MEDICINE STOCK
          existingMedsUpdatedCount++;
          const current = nextList[existingIdx];
          nextList[existingIdx] = {
            ...current,
            stock: Number((current.stock + Number(item.qty || 0)).toFixed(1)),
            rate: Number(item.rate) || current.rate,
            mrp: Number(item.mrp) || current.mrp,
            omrp: item.dmrp !== undefined && item.dmrp > 0 ? item.dmrp : current.omrp,
            batch: item.batch || current.batch,
            expiry: item.exp || current.expiry,
            hsn: item.hsn || current.hsn,
            pack: item.pack || current.pack,
            dist: data.distributor,
            scheme: item.scheme || current.scheme,
            disc: item.disc !== undefined ? item.disc : current.disc,
            gst: item.gst || current.gst,
            salt: item.salt || current.salt,
            company: item.company || current.company,
          };
        } else {
          // AUTOMATICALLY CREATE MISSING MEDICINE
          newMedsAddedCount++;
          const newMedicine: Medicine = {
            id: 'MED-OCR-' + (Date.now() + idx),
            name: item.name.trim(),
            company: item.company || 'Standard Pharma',
            dist: data.distributor,
            salt: item.salt || 'Pharmaceutical Formulation',
            hsn: item.hsn || '300490',
            batch: item.batch || `B-${Math.floor(1000 + Math.random() * 9000)}`,
            pack: item.pack || '10*10',
            group: 'General Inward',
            rack: item.rack || 'RACK-A1',
            stock: Number(item.qty || 0),
            rate: Number(item.rate || 0),
            omrp: Number(item.dmrp || 0),
            mrp: Number(item.mrp || 0),
            scheme: item.scheme || '0.00',
            gst: Number(item.gst || 12),
            disc: Number(item.disc || 0),
            tabsPerStrip: item.tabsPerStrip || 10,
            expiry: item.exp || '2028-12',
          };
          nextList.unshift(newMedicine);
        }
      });

      return nextList;
    });

    // 3. OPTIONALLY LOG INWARD EXPENSE IN LEDGER
    if (logAsExpense && setExpenses) {
      const newExpense: ExpenseRecord = {
        id: `EXP-INW-${Date.now()}`,
        date: data.invDate || getTodayISODate(),
        cat: 'Medicine Purchase (Stock Inward)',
        desc: `Inward purchase from ${data.distributor} (Bill: ${data.invNo})`,
        amt: Number(data.totalCost || 0),
      };
      setExpenses(prev => [newExpense, ...(prev || [])]);
    }

    // 4. RECORD IN LOCAL SESSION HISTORY
    setInwardHistory(prev => [
      {
        id: 'INW-' + Date.now(),
        date: data.invDate || getTodayISODate(),
        distributor: data.distributor,
        invNo: data.invNo,
        itemCount: data.items.length,
        newMedsCount: newMedsAddedCount,
        totalCost: data.totalCost,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
      ...prev,
    ]);

    setIsCommitted(true);
    setSuccessNotice(
      `✓ Inward Stock Integrated Successfully! Added ${newMedsAddedCount} missing medicines to catalog, updated stock on ${existingMedsUpdatedCount} existing items, and registered distributor "${data.distributor}".`
    );
    setTimeout(() => setSuccessNotice(null), 6000);
  };

  // -------------------------------------------------------------
  // SERVER AI OCR PIPELINE WITH GENUINE BILL EXTRACTION
  // -------------------------------------------------------------
  const processInvoicePayload = async (payload: { imageBase64?: string; textContent?: string }) => {
    setIsProcessing(true);
    setErrorNotice(null);
    setStatusMessage('Reading invoice format and parsing distributor information...');

    try {
      let extractedData: ScannedInvoiceData | null = null;

      // 1. Try server Gemini API endpoint (authenticated — requires the
      // `inward-ocr` permission, enforced server-side)
      if (payload.imageBase64 || payload.textContent) {
        try {
          const json = await ocrApi.parseBill({
            imageBase64: payload.imageBase64,
            textContent: payload.textContent,
          });
          if (json.success && json.data && json.data.items && json.data.items.length > 0) {
            extractedData = json.data as unknown as ScannedInvoiceData;
          } else if (json.fallback) {
            setStatusMessage(json.message || 'Server AI OCR is offline — falling back to local text parsing.');
          }
        } catch (serverErr) {
          console.warn('Backend OCR call failed, switching to local text parser if available:', serverErr);
        }
      }

      // 2. If no server response and textContent provided, try local text parser
      if (!extractedData && payload.textContent) {
        extractedData = parseInvoiceTextLocally(payload.textContent);
      }

      if (!extractedData || !extractedData.items || extractedData.items.length === 0) {
        throw new Error('Could not detect medicine items in the provided purchase bill. Please verify the image or paste invoice text.');
      }

      // 3. Mark which items are new vs existing in our medicine catalog
      const reconciledItems = reconcileScannedItems(extractedData.items);
      const isNewDist = !distributors.some(
        d => d.name.trim().toLowerCase() === extractedData!.distributor.trim().toLowerCase()
      );

      const finalInvoiceData: ScannedInvoiceData = {
        ...extractedData,
        items: reconciledItems,
        isNewDistributor: isNewDist,
      };

      setScannedResult(finalInvoiceData);
      setIsCommitted(false);

      // Auto-commit immediately to provide instant real-time sync
      handleCommitToStock(finalInvoiceData);
    } catch (err: any) {
      console.error('Invoice processing failed:', err);
      setErrorNotice(err.message || 'Failed to extract invoice data. Please ensure the bill is legible.');
    } finally {
      setIsProcessing(false);
      setStatusMessage(null);
    }
  };

  // -------------------------------------------------------------
  // HANDLERS FOR FILE UPLOAD, CAMERA, AND PASTE
  // -------------------------------------------------------------
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = event => {
      const base64 = event.target?.result as string;
      setPreviewImage(base64);
      processInvoicePayload({
        imageBase64: base64,
      });
    };
    reader.readAsDataURL(file);
  };

  const handleStartCamera = async () => {
    try {
      setIsCameraActive(true);
      setErrorNotice(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error('Camera access denied or unavailable:', err);
      setErrorNotice('Camera access unavailable. Please use file upload or paste bill text.');
      setIsCameraActive(false);
    }
  };

  const handleStopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setIsCameraActive(false);
  };

  const handleCaptureSnapshot = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement('canvas');
    canvas.width = videoRef.current.videoWidth || 640;
    canvas.height = videoRef.current.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      const base64 = canvas.toDataURL('image/jpeg');
      setPreviewImage(base64);
      handleStopCamera();
      processInvoicePayload({
        imageBase64: base64,
      });
    }
  };

  const handlePasteProcess = () => {
    if (!pastedText.trim()) {
      setErrorNotice('Please paste bill text or table content into the box.');
      return;
    }
    processInvoicePayload({
      textContent: pastedText,
    });
  };

  // Clipboard image paste listener on window
  useEffect(() => {
    const handleWindowPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = event => {
              const base64 = event.target?.result as string;
              setPreviewImage(base64);
              setActiveInputMethod('upload');
              processInvoicePayload({ imageBase64: base64 });
            };
            reader.readAsDataURL(blob);
          }
        }
      }
    };
    window.addEventListener('paste', handleWindowPaste);
    return () => {
      window.removeEventListener('paste', handleWindowPaste);
      handleStopCamera();
    };
  }, []);

  // -------------------------------------------------------------
  // INLINE ROW EDITING & RECONCILIATION HANDLERS
  // -------------------------------------------------------------
  const handleOpenEditRow = (index: number) => {
    if (!scannedResult) return;
    setEditingItemIdx(index);
    setEditFormData({ ...scannedResult.items[index] });
  };

  const handleSaveEditRow = () => {
    if (editingItemIdx === null || !editFormData || !scannedResult) return;

    const oldItem = scannedResult.items[editingItemIdx];
    const qtyDiff = Number(editFormData.qty || 0) - Number(oldItem.qty || 0);

    const updatedItems = [...scannedResult.items];
    updatedItems[editingItemIdx] = editFormData;

    // Recalculate total
    const newTotal = updatedItems.reduce((sum, it) => sum + Number(it.rate || 0) * Number(it.qty || 0), 0);

    const updatedScanned = {
      ...scannedResult,
      items: updatedItems,
      totalCost: Number(newTotal.toFixed(2)),
    };

    setScannedResult(updatedScanned);
    setEditingItemIdx(null);
    setEditFormData(null);

    // Apply granular updates to live medicine catalog without touching other items
    setMedicines(prev =>
      prev.map(m => {
        if (
          m.name.trim().toLowerCase() === editFormData.name.trim().toLowerCase() ||
          (editFormData.batch && m.batch && m.batch.trim().toLowerCase() === editFormData.batch.trim().toLowerCase())
        ) {
          return {
            ...m,
            name: editFormData.name,
            company: editFormData.company || m.company,
            salt: editFormData.salt || m.salt,
            rate: Number(editFormData.rate) || m.rate,
            mrp: Number(editFormData.mrp) || m.mrp,
            batch: editFormData.batch || m.batch,
            expiry: editFormData.exp || m.expiry,
            rack: editFormData.rack || m.rack,
            stock: Math.max(0, Number((m.stock + qtyDiff).toFixed(1))),
          };
        }
        return m;
      })
    );
  };

  const handleDeleteRow = (index: number) => {
    if (!scannedResult) return;
    const itemToDelete = scannedResult.items[index];
    const updatedItems = scannedResult.items.filter((_, idx) => idx !== index);
    const newTotal = updatedItems.reduce((sum, it) => sum + Number(it.rate || 0) * Number(it.qty || 0), 0);

    const updatedScanned = {
      ...scannedResult,
      items: updatedItems,
      totalCost: Number(newTotal.toFixed(2)),
    };

    setScannedResult(updatedScanned);

    // Deduct stock for deleted row only
    if (itemToDelete) {
      setMedicines(prev =>
        prev.map(m => {
          if (
            m.name.trim().toLowerCase() === itemToDelete.name.trim().toLowerCase() ||
            (itemToDelete.batch && m.batch && m.batch.trim().toLowerCase() === itemToDelete.batch.trim().toLowerCase())
          ) {
            return {
              ...m,
              stock: Math.max(0, Number((m.stock - Number(itemToDelete.qty || 0)).toFixed(1))),
            };
          }
          return m;
        })
      );
    }
  };

  const handleAddNewManualItem = () => {
    if (!scannedResult) return;
    const newItem: ScannedInvoiceItem = {
      name: 'NEW MEDICINE ITEM',
      company: 'Standard Pharma',
      salt: 'Active Molecule',
      pack: '10*10',
      hsn: '300490',
      batch: `BN-${Math.floor(100 + Math.random() * 900)}`,
      exp: '2028-12',
      qty: 10,
      rate: 50.0,
      dmrp: 0.0,
      mrp: 75.0,
      scheme: '0.00',
      disc: 0.0,
      gst: 12.0,
      rack: 'RACK-A1',
      tabsPerStrip: 10,
      isNewMedicine: true,
    };

    const updatedItems = [newItem, ...scannedResult.items];
    const newTotal = updatedItems.reduce((sum, it) => sum + Number(it.rate || 0) * Number(it.qty || 0), 0);

    const updatedScanned = {
      ...scannedResult,
      items: updatedItems,
      totalCost: Number(newTotal.toFixed(2)),
    };

    setScannedResult(updatedScanned);

    // Add only this new single medicine to inventory
    const newMedRecord: Medicine = {
      id: 'MED-OCR-' + Date.now(),
      name: newItem.name.trim(),
      company: newItem.company,
      dist: scannedResult.distributor,
      salt: newItem.salt,
      hsn: newItem.hsn,
      batch: newItem.batch,
      pack: newItem.pack,
      group: 'General Inward',
      rack: newItem.rack || 'RACK-A1',
      stock: Number(newItem.qty || 0),
      rate: Number(newItem.rate || 0),
      omrp: 0,
      mrp: Number(newItem.mrp || 0),
      scheme: '0.00',
      gst: Number(newItem.gst || 12),
      disc: 0,
      tabsPerStrip: 10,
      expiry: newItem.exp,
    };
    setMedicines(prev => [newMedRecord, ...prev]);
  };

  // Export Inward Report to CSV
  const handleExportCSV = () => {
    if (!scannedResult) return;
    const headers = [
      'Item Description',
      'Company',
      'Salt Composition',
      'Pack',
      'HSN Code',
      'Batch No',
      'Expiry',
      'Quantity',
      'Purchase Rate (INR)',
      'MRP (INR)',
      'GST (%)',
      'Total Net Cost (INR)',
      'Status in Inventory',
    ];

    const rows = scannedResult.items.map(item => [
      item.name,
      item.company,
      item.salt,
      item.pack,
      item.hsn,
      item.batch,
      item.exp,
      item.qty,
      item.rate.toFixed(2),
      item.mrp.toFixed(2),
      item.gst,
      (item.rate * item.qty).toFixed(2),
      item.isNewMedicine ? 'NEW MEDICINE ADDED' : 'EXISTING STOCK UPDATED',
    ]);

    exportToCSV(`Inward_Bill_${scannedResult.distributor.replace(/\s+/g, '_')}_${scannedResult.invNo}`, headers, rows);
  };

  // Filter items in active scanned result
  const filteredItems = scannedResult
    ? scannedResult.items.filter(it => {
        const matchesSearch =
          !searchFilter ||
          it.name.toLowerCase().includes(searchFilter.toLowerCase()) ||
          it.salt.toLowerCase().includes(searchFilter.toLowerCase()) ||
          it.batch.toLowerCase().includes(searchFilter.toLowerCase()) ||
          it.company.toLowerCase().includes(searchFilter.toLowerCase());

        const matchesStatus =
          statusFilter === 'all' ||
          (statusFilter === 'new' && it.isNewMedicine) ||
          (statusFilter === 'existing' && !it.isNewMedicine);

        return matchesSearch && matchesStatus;
      })
    : [];

  const newMedsCount = scannedResult ? scannedResult.items.filter(it => it.isNewMedicine).length : 0;
  const existingMedsCount = scannedResult ? scannedResult.items.filter(it => !it.isNewMedicine).length : 0;

  return (
    <div className="space-y-6">
      {/* 1. TOP HEADER & INWARD CAPABILITIES BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text flex items-center gap-2.5">
              <span>Universal Supplier Purchase Bill Auto-Scan (OCR)</span>
            </h1>
            <span className="bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Multi-Format Distributor AI</span>
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1 max-w-3xl leading-relaxed">
            Upload ANY distributor purchase invoice (PDF, photo, scan, camera, or text). The system automatically registers the distributor's name, phone, address, and GSTIN, auto-adds missing medicines into the catalog layout, and updates existing stock balances.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-surface border border-border px-3 py-1.5 rounded-xl text-text-muted font-mono flex items-center gap-1.5">
            <PackageCheck className="w-4 h-4 text-emerald-400" />
            <span>Live Inventory: {medicines.length} SKUs</span>
          </span>
          <span className="text-xs bg-surface border border-border px-3 py-1.5 rounded-xl text-text-muted font-mono flex items-center gap-1.5">
            <Truck className="w-4 h-4 text-primary" />
            <span>Distributors: {distributors.length} Registered</span>
          </span>
        </div>
      </div>

      {/* NOTIFICATIONS */}
      {successNotice && (
        <div className="p-4 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center justify-between backdrop-blur-xl shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-400 hover:text-text p-1">
            ✕
          </button>
        </div>
      )}

      {errorNotice && (
        <div className="p-4 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between backdrop-blur-xl shadow-lg animate-in fade-in">
          <div className="flex items-center gap-2 font-semibold">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="text-rose-400 hover:text-text p-1">
            ✕
          </button>
        </div>
      )}

      {/* 2. INGESTION HUB & METHOD SELECTOR */}
      <div className="p-6 rounded-3xl bg-surface/90 backdrop-blur-2xl border border-border shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-4 flex-wrap gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <ScanLine className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">Select Purchase Invoice Input Method</h3>
              <p className="text-[11px] text-text-muted">Supports diverse Indian pharma formats, multi-page PDFs, and receipts</p>
            </div>
          </div>

          {/* Mode Switcher Pills */}
          <div className="flex items-center gap-1.5 bg-surface p-1 rounded-2xl border border-border text-xs font-semibold">
            <button
              onClick={() => {
                handleStopCamera();
                setActiveInputMethod('upload');
              }}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeInputMethod === 'upload' ? 'bg-primary text-primary-foreground shadow-md' : 'text-text-muted hover:text-text'
              }`}
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>File Upload</span>
            </button>

            <button
              onClick={() => {
                setActiveInputMethod('camera');
                handleStartCamera();
              }}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeInputMethod === 'camera' ? 'bg-primary text-primary-foreground shadow-md' : 'text-text-muted hover:text-text'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Camera Scan</span>
            </button>

            <button
              onClick={() => {
                handleStopCamera();
                setActiveInputMethod('paste');
              }}
              className={`px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                activeInputMethod === 'paste' ? 'bg-primary text-primary-foreground shadow-md' : 'text-text-muted hover:text-text'
              }`}
            >
              <Clipboard className="w-3.5 h-3.5" />
              <span>Paste Text / Clipboard</span>
            </button>
          </div>
        </div>

        {/* METHOD 1: FILE DRAG & DROP UPLOADER */}
        {activeInputMethod === 'upload' && (
          <div className="border-2 border-dashed border-primary/40 hover:border-primary/70 p-8 rounded-3xl bg-primary/5 hover:bg-primary/10 transition-all text-center space-y-3 relative backdrop-blur-md">
            <input
              type="file"
              id="purchase-bill-file-input"
              accept="image/png,image/jpeg,image/jpg,image/webp,application/pdf"
              onChange={handleFileUpload}
              className="hidden"
            />
            <label htmlFor="purchase-bill-file-input" className="cursor-pointer space-y-3 block">
              <div className="w-14 h-14 rounded-2xl bg-primary/20 border border-primary/30 text-primary flex items-center justify-center mx-auto shadow-inner">
                <UploadCloud className="w-7 h-7" />
              </div>
              <div>
                <p className="text-sm font-bold text-text">
                  Click to Upload or Drag & Drop Supplier Purchase Bill
                </p>
                <p className="text-xs text-text-muted mt-1">
                  Supports Multi-page PDF, PNG, JPG, WebP from any medicine distributor (Blair, Abbott, Sun Pharma, Cipla, New Uma, etc.)
                </p>
              </div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-surface border border-border rounded-full text-[11px] text-primary font-mono">
                <Sparkles className="w-3 h-3 text-amber-400" />
                <span>Auto-detects distributor format, updates stock & creates missing medicines</span>
              </div>
            </label>
          </div>
        )}

        {/* METHOD 2: LIVE CAMERA SCANNER */}
        {activeInputMethod === 'camera' && (
          <div className="p-6 rounded-3xl bg-surface border border-border text-center space-y-4">
            <div className="relative max-w-md mx-auto aspect-video rounded-2xl overflow-hidden bg-bg border border-border shadow-2xl flex items-center justify-center">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              <div className="absolute inset-0 border-2 border-primary/60 rounded-2xl pointer-events-none animate-pulse m-3" />
              <div className="absolute top-4 left-4 bg-black/70 backdrop-blur-md px-2.5 py-1 rounded-full text-[10px] font-mono text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Live Camera Active</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleCaptureSnapshot}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-2xl text-xs font-bold flex items-center gap-2 shadow-lg shadow-primary/30 transition cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Capture & Scan Invoice</span>
              </button>

              <button
                type="button"
                onClick={handleStopCamera}
                className="px-4 py-2.5 bg-surface-elevated hover:bg-border text-text-muted rounded-2xl text-xs font-medium transition cursor-pointer"
              >
                Close Camera
              </button>
            </div>
          </div>
        )}

        {/* METHOD 3: PASTE TEXT / RAW INVOICE DATA */}
        {activeInputMethod === 'paste' && (
          <div className="space-y-3">
            <label className="text-xs font-bold text-text-muted flex items-center gap-1.5">
              <Clipboard className="w-3.5 h-3.5 text-primary" />
              <span>Paste OCR Text, Tabular CSV, or Wholesale Email Bill</span>
            </label>
            <textarea
              rows={4}
              value={pastedText}
              onChange={e => setPastedText(e.target.value)}
              placeholder={`Example text:
DISTRIBUTOR: BLAIR REMEDIES PVT. LTD.
GSTIN: 06AAGCB6632E1ZX, Phone: +91 9728712333, Ambala Cantt
INV NO: A002223, Date: 2026-08-19
1. ASHTER LOTION 60ML, Qty: 2, Rate: 32.0, MRP: 220, Batch: GED048A, Exp: 2028-04
2. DOLO 650MG 15*T, Qty: 20, Rate: 21.5, MRP: 30, Batch: DL-9941, Exp: 2027-10`}
              className="w-full p-3 bg-surface border border-border rounded-2xl text-text font-mono text-xs outline-none focus:border-primary placeholder:text-text-muted backdrop-blur-md"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handlePasteProcess}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Parse & Extract Lines</span>
              </button>
            </div>
          </div>
        )}

        {/* Processing Indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-3 text-amber-300 font-bold text-xs py-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 backdrop-blur-md animate-pulse">
            <Loader2 className="w-5 h-5 animate-spin text-amber-400" />
            <span>{statusMessage || 'Scanning distributor bill with AI & updating medicine stock...'}</span>
          </div>
        )}
      </div>

      {/* 3. ACTIVE INVOICE RECONCILIATION & STOCK INGESTION WORKSPACE */}
      {scannedResult && (
        <div className="p-6 rounded-3xl bg-surface/90 backdrop-blur-2xl border border-border shadow-2xl space-y-6 animate-in fade-in">
          {/* Header & Status Badges */}
          <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Invoice Ingested & Synced</span>
                </span>
                <span className="font-mono text-xs text-text-muted bg-surface border border-border px-3 py-1 rounded-full">
                  INV: <b className="text-text">{scannedResult.invNo}</b> ({scannedResult.invDate})
                </span>
              </div>
              <h2 className="text-lg font-bold text-text mt-1">
                Purchase Inward Reconciliation Workspace
              </h2>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddNewManualItem}
                className="px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/40 text-primary rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Add any missing line manually"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Extra Medicine</span>
              </button>

              <button
                type="button"
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-surface hover:bg-border-elevated border border-border text-text-muted rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                title="Download CSV report"
              >
                <Download className="w-3.5 h-3.5 text-primary" />
                <span>Export CSV</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setScannedResult(null);
                  setPreviewImage(null);
                }}
                className="px-4 py-1.5 bg-surface-elevated hover:bg-border text-text rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
                title="Close invoice workspace"
              >
                <X className="w-3.5 h-3.5" />
                <span>Close Workspace / Next Bill</span>
              </button>
            </div>
          </div>

          {/* DISTRIBUTOR AUTO-REGISTERED CARD */}
          <div className="p-4 rounded-2xl bg-surface border border-border grid grid-cols-1 md:grid-cols-2 gap-4 text-xs backdrop-blur-md">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">
                  Distributor Registration Details:
                </span>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] px-2 py-0.5 rounded-full font-semibold">
                  ✓ Registered in Master Directory
                </span>
              </div>
              <h4 className="text-sm font-bold text-text flex items-center gap-2">
                <Truck className="w-4 h-4 text-primary" />
                <span>{scannedResult.distributor}</span>
              </h4>
              <p className="text-text-muted font-mono mt-1">
                <b>GSTIN:</b> <span className="text-primary font-bold">{scannedResult.gstin}</span>
              </p>
              <p className="text-text-muted font-mono mt-0.5">
                <b>Phone:</b> <span className="text-text">{scannedResult.phone}</span>
              </p>
              <p className="text-text-muted mt-0.5">
                <b>Address:</b> {scannedResult.address}
              </p>
            </div>

            <div className="space-y-2 bg-bg/60 p-3.5 rounded-xl border border-border">
              <div className="flex justify-between items-center">
                <span className="text-text-muted">Billed Recipient:</span>
                <span className="font-bold text-text">{invoiceConfig.name}</span>
              </div>
              <div className="flex justify-between items-center text-text-muted font-mono text-[11px]">
                <span>Recipient Drug License:</span>
                <span className="text-text">{invoiceConfig.dl}</span>
              </div>
              <div className="flex justify-between items-center text-text-muted font-mono text-[11px]">
                <span>Recipient GSTIN:</span>
                <span className="text-text">{invoiceConfig.gst}</span>
              </div>

              <div className="pt-2 border-t border-border flex items-center justify-between">
                <label className="text-[11px] text-text-muted flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={logAsExpense}
                    onChange={e => {
                      const isChecked = e.target.checked;
                      setLogAsExpense(isChecked);
                      if (isChecked && setExpenses && scannedResult) {
                        const newExpense: ExpenseRecord = {
                          id: `EXP-INW-${Date.now()}`,
                          date: scannedResult.invDate || getTodayISODate(),
                          cat: 'Medicine Purchase (Stock Inward)',
                          desc: `Inward purchase from ${scannedResult.distributor} (Bill: ${scannedResult.invNo})`,
                          amt: Number(scannedResult.totalCost || 0),
                        };
                        setExpenses(prev => [newExpense, ...(prev || [])]);
                      }
                    }}
                    className="w-3.5 h-3.5 rounded text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Record ₹{scannedResult.totalCost.toFixed(2)} in Daily Expense Ledger</span>
                </label>
              </div>
            </div>
          </div>

          {/* RECONCILIATION SUMMARY KPIS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1">
              <p className="text-text-muted">Total Purchase Cost</p>
              <h4 className="text-lg font-bold text-emerald-400 font-mono">
                ₹ {scannedResult.totalCost.toFixed(2)}
              </h4>
            </div>

            <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-1">
              <p className="text-text-muted">Total Scanned Items</p>
              <h4 className="text-lg font-bold text-text font-mono">
                {scannedResult.items.length} Medicines
              </h4>
            </div>

            <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-1">
              <p className="text-emerald-300 font-semibold flex items-center gap-1">
                <PackagePlus className="w-3.5 h-3.5" />
                <span>New Medicines Added</span>
              </p>
              <h4 className="text-lg font-bold text-emerald-300 font-mono">
                {newMedsCount} Missing SKUs Created
              </h4>
            </div>

            <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/20 space-y-1">
              <p className="text-primary font-semibold flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>Stock Incremented</span>
              </p>
              <h4 className="text-lg font-bold text-primary font-mono">
                {existingMedsCount} Existing Medicines
              </h4>
            </div>
          </div>

          {/* FILTER & SEARCH BAR FOR SCANNED ITEMS */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search scanned medicines, salts, or batches..."
                value={searchFilter}
                onChange={e => setSearchFilter(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-xs text-text placeholder:text-text-muted outline-none focus:border-primary"
              />
            </div>

            <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border text-xs">
              <button
                type="button"
                onClick={() => setStatusFilter('all')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  statusFilter === 'all' ? 'bg-surface-elevated text-text font-bold' : 'text-text-muted hover:text-text'
                }`}
              >
                All ({scannedResult.items.length})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('new')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  statusFilter === 'new' ? 'bg-emerald-600 text-text font-bold' : 'text-emerald-400 hover:text-text'
                }`}
              >
                New Added ({newMedsCount})
              </button>
              <button
                type="button"
                onClick={() => setStatusFilter('existing')}
                className={`px-2.5 py-1 rounded-lg transition ${
                  statusFilter === 'existing' ? 'bg-primary text-primary-foreground font-bold' : 'text-primary hover:text-text'
                }`}
              >
                Updated ({existingMedsCount})
              </button>
            </div>
          </div>

          {/* SCANNED ITEMS RECONCILIATION TABLE */}
          <div className="overflow-x-auto border border-border rounded-2xl bg-surface backdrop-blur-md">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-surface-elevated text-text-muted font-bold border-b border-border text-[11px]">
                <tr>
                  <th className="p-3">Item Name & Salt</th>
                  <th className="p-3">Inventory Status</th>
                  <th className="p-3">Pack & Qty</th>
                  <th className="p-3">Batch / Expiry</th>
                  <th className="p-3">HSN</th>
                  <th className="p-3">Purchase Rate</th>
                  <th className="p-3">MRP (₹)</th>
                  <th className="p-3">GST% / Disc</th>
                  <th className="p-3 text-right font-bold">Line Cost (₹)</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-6 text-center text-text-muted text-xs">
                      No medicines match the selected filter.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item, idx) => {
                    const rowCost = item.rate * item.qty;
                    const marginPercent = item.mrp > 0 ? (((item.mrp - item.rate) / item.mrp) * 100).toFixed(0) : '0';

                    return (
                      <tr key={idx} className="hover:bg-surface transition group">
                        <td className="p-3">
                          <span className="font-bold text-text block">{item.name}</span>
                          <span className="text-[10px] text-text-muted block">{item.salt}</span>
                          <span className="text-[10px] text-primary font-medium">Mfg: {item.company}</span>
                        </td>

                        <td className="p-3">
                          {item.isNewMedicine ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-bold">
                              <PackagePlus className="w-3 h-3" />
                              <span>New Stock Added</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-[10px] font-medium">
                              <Check className="w-3 h-3" />
                              <span>Stock Updated (+{item.qty})</span>
                            </span>
                          )}
                        </td>

                        <td className="p-3 font-mono">
                          <span className="font-bold text-text block">{item.pack}</span>
                          <span className="text-emerald-400 font-bold">Qty: {item.qty} units</span>
                        </td>

                        <td className="p-3 font-mono text-[11px]">
                          <span className="font-bold text-primary block">{item.batch}</span>
                          <span className="text-text-muted block">Exp: {item.exp}</span>
                        </td>

                        <td className="p-3 font-mono text-text-muted text-[11px]">{item.hsn}</td>

                        <td className="p-3 font-mono font-bold text-emerald-400 text-sm">
                          ₹ {item.rate.toFixed(2)}
                        </td>

                        <td className="p-3 font-mono">
                          <span className="font-bold text-text block">₹ {item.mrp.toFixed(2)}</span>
                          <span className="text-[10px] text-emerald-400 font-semibold">{marginPercent}% Margin</span>
                        </td>

                        <td className="p-3 font-mono text-[11px] text-text-muted">
                          <span>{item.gst}% GST</span>
                          {item.disc !== undefined && item.disc > 0 && (
                            <span className="block text-primary">{item.disc}% Disc</span>
                          )}
                        </td>

                        <td className="p-3 text-right font-mono font-bold text-text text-sm">
                          ₹ {rowCost.toFixed(2)}
                        </td>

                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditRow(idx)}
                              className="p-1.5 hover:bg-surface-elevated text-text-muted hover:text-text rounded-lg transition"
                              title="Edit rate, batch, or quantity"
                            >
                              <Edit3 className="w-3.5 h-3.5 text-primary" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(idx)}
                              className="p-1.5 hover:bg-rose-500/20 text-text-muted hover:text-rose-300 rounded-lg transition"
                              title="Remove item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* TOTAL FOOTER BAR */}
          <div className="flex justify-between items-center p-4 bg-success/10 border border-success/30 rounded-2xl text-xs font-bold text-success backdrop-blur-md flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <PackageCheck className="w-5 h-5 text-success" />
              <span>Total Inward Purchase Value:</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-xs text-text-muted font-normal">
                {scannedResult.items.length} Line Items &bull; {newMedsCount} New Medicines Added
              </span>
              <span className="text-xl font-mono font-black text-emerald-300">
                ₹ {scannedResult.totalCost.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. MODAL: EDIT SCANNED MEDICINE ROW */}
      {editingItemIdx !== null && editFormData && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-surface-elevated backdrop-blur-2xl rounded-3xl shadow-2xl max-w-lg w-full p-6 space-y-4 border border-border text-xs text-text animate-in zoom-in-95">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h3 className="text-sm font-bold text-text flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary" />
                <span>Edit Inward Medicine Line</span>
              </h3>
              <button
                onClick={() => setEditingItemIdx(null)}
                className="text-text-muted hover:text-text p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="font-semibold text-text-muted block mb-1">Medicine Name</label>
                <input
                  type="text"
                  value={editFormData.name}
                  onChange={e => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-text font-bold outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-text-muted block mb-1">Salt / Molecule</label>
                <input
                  type="text"
                  value={editFormData.salt}
                  onChange={e => setEditFormData({ ...editFormData, salt: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-text-muted block mb-1">Mfg Company</label>
                <input
                  type="text"
                  value={editFormData.company}
                  onChange={e => setEditFormData({ ...editFormData, company: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-text-muted block mb-1">Purchased Quantity</label>
                <input
                  type="number"
                  value={editFormData.qty}
                  onChange={e => setEditFormData({ ...editFormData, qty: Number(e.target.value) || 1 })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-text font-mono font-bold outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-text-muted block mb-1">Purchase Rate (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.rate}
                  onChange={e => setEditFormData({ ...editFormData, rate: Number(e.target.value) || 0 })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-emerald-400 font-mono font-bold outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-text-muted block mb-1">Retail MRP (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editFormData.mrp}
                  onChange={e => setEditFormData({ ...editFormData, mrp: Number(e.target.value) || 0 })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-text font-mono font-bold outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-text-muted block mb-1">Batch Number</label>
                <input
                  type="text"
                  value={editFormData.batch}
                  onChange={e => setEditFormData({ ...editFormData, batch: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-text font-mono outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-text-muted block mb-1">Expiry Date (YYYY-MM)</label>
                <input
                  type="text"
                  value={editFormData.exp}
                  onChange={e => setEditFormData({ ...editFormData, exp: e.target.value })}
                  placeholder="2028-06"
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-text font-mono outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-semibold text-text-muted block mb-1">Rack Location</label>
                <input
                  type="text"
                  value={editFormData.rack || 'RACK-A1'}
                  onChange={e => setEditFormData({ ...editFormData, rack: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setEditingItemIdx(null)}
                className="px-4 py-2 bg-surface hover:bg-border-elevated text-text-muted rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveEditRow}
                className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl shadow-lg transition cursor-pointer"
              >
                Save & Update Stock
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. RECENT INWARD HISTORY LOG (Session Track) */}
      {inwardHistory.length > 0 && (
        <div className="p-6 rounded-3xl bg-surface/90 backdrop-blur-2xl border border-border shadow-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-border pb-3">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              <span>Recent Inward Invoices Processed</span>
            </h3>
            <span className="text-xs text-text-muted font-mono">
              {inwardHistory.length} Inward Records
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
            {inwardHistory.map(entry => (
              <div
                key={entry.id}
                className="p-3.5 rounded-2xl bg-surface border border-border space-y-1.5 backdrop-blur-md"
              >
                <div className="flex justify-between items-center text-text-muted text-[11px]">
                  <span>{entry.date} at {entry.timestamp}</span>
                  <span className="font-mono text-primary font-bold">INV: {entry.invNo}</span>
                </div>
                <h4 className="font-bold text-text truncate">{entry.distributor}</h4>
                <div className="flex justify-between items-center pt-1 border-t border-border">
                  <span className="text-[11px] text-emerald-400">
                    {entry.itemCount} Items ({entry.newMedsCount} new added)
                  </span>
                  <span className="font-mono font-bold text-text">₹ {entry.totalCost.toFixed(2)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
