import React, { useState } from 'react';
import {
  AlertCircle,
  CheckCircle2,
  CreditCard,
  DollarSign,
  FileText,
  MessageCircle,
  Minus,
  PackagePlus,
  Percent,
  Phone,
  Plus,
  Printer,
  RotateCcw,
  Search,
  Send,
  Sparkles,
  Stethoscope,
  Trash2,
  Undo2,
  UserCheck,
  Wallet,
  Zap,
} from 'lucide-react';
import {
  CartItem,
  DailyRegister,
  InvoiceConfig,
  InvoicePrintData,
  LabTest,
  Medicine,
  PatientRecord,
  SalesRecord,
} from '../../types';
import { initialLabTests } from '../../data/initialData';
import { formatWhatsAppPhone } from '../../utils/exportCsv';
import { getTodayISODate } from '../../utils/dateUtils';

export interface POSTabProps {
  medicines: Medicine[];
  setMedicines?: React.Dispatch<React.SetStateAction<Medicine[]>>;
  labTests?: LabTest[];
  cart: CartItem[];
  setCart: React.Dispatch<React.SetStateAction<CartItem[]>>;
  invoiceConfig: InvoiceConfig;
  salesHistory?: SalesRecord[];
  setSalesHistory?: React.Dispatch<React.SetStateAction<SalesRecord[]>>;
  dailyRegister?: DailyRegister;
  setDailyRegister?: React.Dispatch<React.SetStateAction<DailyRegister>>;
  patientsDue?: PatientRecord[];
  setPatientsDue?: React.Dispatch<React.SetStateAction<PatientRecord[]>>;
  patients?: PatientRecord[];
  setPatients?: React.Dispatch<React.SetStateAction<PatientRecord[]>>;
  onPrintInvoice: (data: InvoicePrintData) => void;
  onOpenAIFinder?: (prefillQuery?: string) => void;
  onOpenAIFinderWithQuery?: (prefillQuery?: string) => void;
  onOrderSpecialMed?: (medName: string) => void;
}

export const POSTab: React.FC<POSTabProps> = ({
  medicines,
  setMedicines,
  labTests = initialLabTests,
  cart,
  setCart,
  invoiceConfig,
  salesHistory = [],
  setSalesHistory,
  dailyRegister,
  setDailyRegister,
  patientsDue = [],
  setPatientsDue,
  patients = [],
  setPatients,
  onPrintInvoice,
  onOpenAIFinder,
  onOpenAIFinderWithQuery,
  onOrderSpecialMed,
}) => {
  // Discount percentage state (0% to 100%)
  const [discountPercent, setDiscountPercent] = useState<number>(0);

  // Patient Form States
  const [phone, setPhone] = useState('');
  const [patientId, setPatientId] = useState(() => getNextPatientId(patientsDue));
  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [address, setAddress] = useState('');
  const [docSelect, setDocSelect] = useState('Self Prescribed / OTC');
  const [customDoc, setCustomDoc] = useState('');

  // POS Filter States
  const [billingMode, setBillingMode] = useState<'med' | 'lab'>('med');
  const [searchQuery, setSearchQuery] = useState('');
  const [doctorGroupFilter, setDoctorGroupFilter] = useState('all');

  // Payment states
  const [payMode, setPayMode] = useState<string>('Cash');
  const [customPayMode, setCustomPayMode] = useState('');
  const [paidAmt, setPaidAmt] = useState<number | ''>('');
  const [lastGeneratedInvoice, setLastGeneratedInvoice] = useState<InvoicePrintData | null>(null);
  const [checkoutSuccessMsg, setCheckoutSuccessMsg] = useState<string | null>(null);

  // Helper for sequential patient ID
  function getNextPatientId(list: PatientRecord[]): string {
    let maxNum = 100;
    list.forEach(p => {
      if (p.id && p.id.startsWith('P/')) {
        const num = parseInt(p.id.replace('P/', ''), 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    });
    return `P/${maxNum + 1}`;
  }

  // Auto match patient by phone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);
    const cleaned = val.replace(/[^0-9]/g, '');

    if (cleaned.length >= 7) {
      const matched =
        patientsDue.find(p => p.phone && p.phone.replace(/[^0-9]/g, '') === cleaned) ||
        patients.find(p => p.phone && p.phone.replace(/[^0-9]/g, '') === cleaned);

      if (matched) {
        setPatientId(matched.id || getNextPatientId(patientsDue));
        setPatientName(matched.name || '');
        if (matched.addr || matched.address) setAddress(matched.addr || matched.address || '');
        if (matched.age) setAge(String(matched.age));
        if (matched.gender) setGender(matched.gender);
        if (matched.doc || matched.doctor) setDocSelect(matched.doc || matched.doctor || 'Self Prescribed / OTC');
      }
    }
  };

  // Auto match patient by Patient ID
  const handlePatientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPatientId(val);

    if (val.trim().length >= 2) {
      const matched =
        patientsDue.find(p => p.id.toLowerCase() === val.toLowerCase().trim()) ||
        patients.find(p => p.id.toLowerCase() === val.toLowerCase().trim());

      if (matched) {
        setPatientName(matched.name || '');
        if (matched.phone) setPhone(matched.phone);
        if (matched.addr || matched.address) setAddress(matched.addr || matched.address || '');
        if (matched.age) setAge(String(matched.age));
        if (matched.gender) setGender(matched.gender);
        if (matched.doc || matched.doctor) setDocSelect(matched.doc || matched.doctor || 'Self Prescribed / OTC');
      }
    }
  };

  const handleStartNewBill = () => {
    setCart([]);
    setPhone('');
    setPatientName('');
    setAge('');
    setAddress('');
    setDocSelect('Self Prescribed / OTC');
    setCustomDoc('');
    setPayMode('Cash');
    setCustomPayMode('');
    setPaidAmt('');
    setDiscountPercent(0);
    setPatientId(getNextPatientId(patientsDue));
    setLastGeneratedInvoice(null);
    setCheckoutSuccessMsg(null);
  };

  // Robust Add Item to cart
  const handleAddToCart = (
    item: Medicine | LabTest,
    unitType: 'strip' | 'loose' | 'return',
    customQty?: number
  ) => {
    const isLoose = unitType === 'loose';
    const isReturn = unitType === 'return';
    const tabs = 'tabsPerStrip' in item ? Number(item.tabsPerStrip) || 10 : 1;
    const baseMrp = Number(item.mrp) || 0;

    let unitPrice = baseMrp;
    let displayName = item.name;

    if (isLoose) {
      unitPrice = tabs > 0 ? Number((baseMrp / tabs).toFixed(2)) : baseMrp;
      displayName = `${item.name} (Loose × ${customQty || 1})`;
    } else if (isReturn) {
      unitPrice = -Math.abs(baseMrp);
      displayName = `[RETURN] ${item.name}`;
    }

    const qty = customQty !== undefined ? customQty : 1;

    // Check if matching item already exists in cart with same unitType
    const existingIndex = cart.findIndex(
      c => (c.itemId === item.id || c.medicineId === item.id) && c.unitType === (isLoose ? 'loose' : isReturn ? 'return' : 'strip')
    );

    if (existingIndex >= 0 && !isLoose) {
      setCart(prev =>
        prev.map((c, idx) => {
          if (idx === existingIndex) {
            const nextQty = (c.qty || 1) + qty;
            return {
              ...c,
              qty: nextQty,
              quantity: nextQty,
              totalPrice: Number((nextQty * c.price).toFixed(2)),
            };
          }
          return c;
        })
      );
    } else {
      const newItem: CartItem = {
        cartId: `${item.id}-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        id: item.id,
        itemId: item.id,
        medicineId: item.id,
        name: displayName,
        batch: 'batch' in item ? item.batch : 'LAB-01',
        expiry: 'expiry' in item ? item.expiry : '2027-12',
        qty: isReturn ? -Math.abs(qty) : qty,
        quantity: isReturn ? -Math.abs(qty) : qty,
        unitType: isLoose ? 'loose' : isReturn ? 'return' : 'strip',
        price: unitPrice,
        unitPrice: unitPrice,
        mrp: baseMrp,
        tabsPerStrip: tabs,
        rack: item.rack,
        gst: 'gst' in item ? Number(item.gst) || 0 : 0,
        totalPrice: Number((qty * unitPrice).toFixed(2)),
      };

      setCart(prev => [...prev, newItem]);
    }
  };

  // Quantity modification handlers
  const handleUpdateQty = (cartId: string, newQty: number) => {
    if (newQty <= 0) {
      handleRemoveItem(cartId);
      return;
    }
    setCart(prev =>
      prev.map(c =>
        c.cartId === cartId
          ? {
              ...c,
              qty: newQty,
              quantity: newQty,
              totalPrice: Number((newQty * c.price).toFixed(2)),
            }
          : c
      )
    );
  };

  const handleRemoveItem = (cartId: string) => {
    setCart(prev => prev.filter(c => c.cartId !== cartId));
  };

  // Prompt for loose units
  const handlePromptLoose = (med: Medicine) => {
    const tabs = med.tabsPerStrip || 10;
    const input = window.prompt(`How many loose tablets for ${med.name}? (Max per strip: ${tabs})`, '2');
    if (!input) return;
    const count = parseInt(input, 10);
    if (!isNaN(count) && count > 0) {
      handleAddToCart(med, 'loose', count);
    }
  };

  // 100% Robust Cart & Totals Calculations
  const subtotal = cart.reduce((sum, item) => {
    const itemPrice = Number(item.price ?? item.mrp ?? 0);
    const itemQty = Number(item.qty ?? item.quantity ?? 1);
    return sum + (itemPrice * itemQty);
  }, 0);

  const safeDiscountPercent = Math.min(100, Math.max(0, Number(discountPercent) || 0));
  const discountAmount = Number(((subtotal * safeDiscountPercent) / 100).toFixed(2));
  const grandTotal = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  // Effective Paid & Due calculation
  const effectivePaid =
    paidAmt === ''
      ? payMode === 'Due'
        ? 0
        : grandTotal
      : typeof paidAmt === 'number'
      ? Math.max(0, paidAmt)
      : 0;

  const effectiveDue = Math.max(0, Number((grandTotal - effectivePaid).toFixed(2)));

  const handlePayModeChange = (mode: string) => {
    setPayMode(mode);
    if (mode === 'Cash' || mode === 'PhonePe' || mode === 'Card') {
      setPaidAmt(grandTotal);
    } else if (mode === 'Due') {
      setPaidAmt(0);
    } else if (mode === 'Partial' || mode === 'PartialOnline') {
      setPaidAmt(Number((grandTotal / 2).toFixed(2)));
    }
  };

  // GENERATE BILL & PRINT PDF
  const handleGenerateBill = () => {
    if (cart.length === 0) {
      alert('Your cart is empty. Please add medicines or lab tests before generating a bill.');
      return;
    }

    const finalDocName = docSelect === 'CUSTOM' ? customDoc.trim() || 'Other Doctor' : docSelect;
    const finalPayMode = payMode === 'CUSTOM' ? customPayMode.trim() || 'Other' : payMode;
    const dateStr = getTodayISODate();
    const invNumber = `INV-${dateStr.replace(/-/g, '').slice(2)}-${String(Math.floor(100 + Math.random() * 900))}`;

    const formattedAgeGender = `${age ? age + ' Yrs' : '--'} / ${gender}`;

    // Itemized invoice lines
    const invoiceItems = cart.map(c => {
      const p = Number(c.price ?? c.mrp ?? 0);
      const q = Number(c.qty ?? c.quantity ?? 1);
      return {
        name: c.name,
        qty: q,
        price: p,
        total: Number((p * q).toFixed(2)),
      };
    });

    const invoiceData: InvoicePrintData = {
      invNo: invNumber,
      date: dateStr,
      patientId: patientId || 'P/101',
      patientName: patientName.trim() || 'Counter Customer',
      phone: phone.trim() || 'N/A',
      ageGender: formattedAgeGender,
      address: address.trim() || 'Local Counter',
      doctor: finalDocName,
      items: invoiceItems,
      subtotal: Number(subtotal.toFixed(2)),
      discountPercent: safeDiscountPercent,
      grandTotal: Number(grandTotal.toFixed(2)),
      paidAmount: Number(effectivePaid.toFixed(2)),
      dueAmount: Number(effectiveDue.toFixed(2)),
      paymentMode: finalPayMode,
    };

    // 1. Deduct Stock from medicines
    if (setMedicines) {
      setMedicines(prev =>
        prev.map(med => {
          // If lab test with no physical stock tracking, do not reduce physical stock count
          if (med.isLabTest && !med.trackStock) {
            return med;
          }

          const cartMatches = cart.filter(c => c.itemId === med.id || c.medicineId === med.id);
          if (cartMatches.length === 0) return med;

          let stockReduction = 0;
          cartMatches.forEach(c => {
            if (c.unitType === 'strip') {
              stockReduction += c.qty;
            } else if (c.unitType === 'loose') {
              const tabs = med.tabsPerStrip || 10;
              stockReduction += (c.qty / tabs);
            } else if (c.unitType === 'return') {
              stockReduction -= Math.abs(c.qty);
            }
          });

          return {
            ...med,
            stock: Math.max(0, Math.round((med.stock - stockReduction) * 10) / 10),
          };
        })
      );
    }

    // 2. Append to Sales History (Store Invoice in system)
    if (setSalesHistory) {
      const newSaleRecord: SalesRecord = {
        id: `S-${Date.now()}`,
        inv: invNumber,
        invoiceNo: invNumber,
        date: dateStr,
        name: cart.map(c => `${c.name} (${c.qty})`).join(', '),
        cust: patientName.trim() || 'Counter Customer',
        patient: patientName.trim() || 'Counter Customer',
        patientId: patientId || 'P/101',
        phone: phone.trim() || 'N/A',
        items: cart.map(c => `${c.name} (x${c.qty})`).join(', '),
        qty: `${cart.reduce((s, c) => s + Math.abs(c.qty), 0)} Items`,
        amt: grandTotal,
        total: grandTotal,
        mode: finalPayMode,
        itemsDetail: invoiceItems,
        subtotal: Number(subtotal.toFixed(2)),
        discountPercent: safeDiscountPercent,
        doctor: finalDocName,
        address: address.trim() || 'Local Counter',
        ageGender: formattedAgeGender,
        paidAmount: Number(effectivePaid.toFixed(2)),
        dueAmount: Number(effectiveDue.toFixed(2)),
      };
      setSalesHistory(prev => [newSaleRecord, ...prev]);
    }

    // 3. Update Daily Register
    if (setDailyRegister && dailyRegister) {
      setDailyRegister(prev => ({
        ...prev,
        todaySell: Number((prev.todaySell + effectivePaid).toFixed(2)),
        totalSales: Number(((prev.totalSales || 0) + grandTotal).toFixed(2)),
        cashSales:
          finalPayMode === 'Cash' || finalPayMode.includes('Cash')
            ? Number(((prev.cashSales || 0) + effectivePaid).toFixed(2))
            : prev.cashSales || 0,
        phonePe:
          finalPayMode === 'PhonePe' || finalPayMode.includes('Online') || finalPayMode.includes('UPI')
            ? Number(((prev.phonePe || 0) + effectivePaid).toFixed(2))
            : prev.phonePe || 0,
        upiSales:
          finalPayMode === 'PhonePe' || finalPayMode.includes('UPI')
            ? Number(((prev.upiSales || 0) + effectivePaid).toFixed(2))
            : prev.upiSales || 0,
      }));
    }

    // 4. Update Due Khata if due exists
    if (effectiveDue > 0 && setPatientsDue) {
      setPatientsDue(prev => {
        const existingIdx = prev.findIndex(p => p.id === patientId || (p.phone && p.phone === phone));
        if (existingIdx >= 0) {
          const updated = [...prev];
          const cur = updated[existingIdx];
          const newDue = (cur.dueAmount || cur.totalDue || 0) + effectiveDue;
          updated[existingIdx] = {
            ...cur,
            totalDue: newDue,
            dueAmount: newDue,
            lastDate: dateStr,
            lastVisitDate: dateStr,
            totalVisits: (cur.totalVisits || 1) + 1,
            reason: `Bill #${invNumber} Pending Dues`,
          };
          return updated;
        } else {
          const newDuePatient: PatientRecord = {
            id: patientId || `P/${Date.now()}`,
            name: patientName.trim() || 'Counter Customer',
            phone: phone.trim() || 'N/A',
            age: age.trim() || '30',
            gender,
            ageGender: formattedAgeGender,
            addr: address.trim() || 'Local Area',
            address: address.trim() || 'Local Area',
            doc: finalDocName,
            doctor: finalDocName,
            reason: `Bill #${invNumber} Pending Dues`,
            totalDue: effectiveDue,
            dueAmount: effectiveDue,
            lastDate: dateStr,
            lastVisitDate: dateStr,
            totalVisits: 1,
          };
          return [newDuePatient, ...prev];
        }
      });
    }

    // 5. Update Master Patient Database with visit & purchase history
    if (setPatients && (patientName.trim() || phone.trim())) {
      setPatients(prev => {
        const existingIdx = prev.findIndex(
          p => p.id.toLowerCase() === (patientId || '').toLowerCase() || (p.phone && p.phone === phone)
        );
        if (existingIdx >= 0) {
          const updated = [...prev];
          const cur = updated[existingIdx];
          const newDue = (cur.totalDue || 0) + effectiveDue;
          updated[existingIdx] = {
            ...cur,
            name: patientName.trim() || cur.name,
            phone: phone.trim() || cur.phone,
            age: age.trim() ? age.trim() : cur.age,
            gender: gender || cur.gender,
            ageGender: formattedAgeGender,
            addr: address.trim() || cur.addr,
            address: address.trim() || cur.address,
            doc: finalDocName || cur.doc,
            doctor: finalDocName || cur.doctor,
            totalDue: newDue,
            dueAmount: newDue,
            lastDate: dateStr,
            lastVisitDate: dateStr,
            totalVisits: (cur.totalVisits || 1) + 1,
            purchaseHistory: [
              {
                date: dateStr,
                items: cart.map(c => `${c.name} (${c.qty})`).join(', '),
                amount: grandTotal,
              },
              ...(cur.purchaseHistory || []),
            ],
          };
          return updated;
        } else {
          const newPatientRec: PatientRecord = {
            id: patientId || `P/${Date.now()}`,
            name: patientName.trim() || 'Counter Customer',
            phone: phone.trim() || 'N/A',
            age: age.trim() ? age.trim() : '30',
            gender,
            ageGender: formattedAgeGender,
            addr: address.trim() || 'Local Area',
            address: address.trim() || 'Local Area',
            doc: finalDocName,
            doctor: finalDocName,
            reason: effectiveDue > 0 ? `Bill #${invNumber} Pending Dues` : 'Regular Counter Purchase',
            totalDue: effectiveDue,
            dueAmount: effectiveDue,
            lastDate: dateStr,
            lastVisitDate: dateStr,
            totalVisits: 1,
            purchaseHistory: [
              {
                date: dateStr,
                items: cart.map(c => `${c.name} (${c.qty})`).join(', '),
                amount: grandTotal,
              },
            ],
          };
          return [newPatientRec, ...prev];
        }
      });
    }

    // Save active invoice state and trigger PDF Print Modal
    setLastGeneratedInvoice(invoiceData);
    setCheckoutSuccessMsg(`Invoice #${invNumber} generated successfully for ₹ ${grandTotal.toFixed(2)}!`);

    // Launch PDF Print Modal
    onPrintInvoice(invoiceData);
  };

  // Instant WhatsApp Bill Share
  const handleSendWhatsAppBill = () => {
    if (!phone || phone.length < 7) {
      alert('Please enter patient mobile number to send WhatsApp invoice!');
      return;
    }
    const formatted = formatWhatsAppPhone(phone);
    if (!formatted || formatted.length < 10) {
      alert('Please enter a valid 10-digit mobile number!');
      return;
    }

    const itemsSummary = cart.map(c => `• ${c.name} × ${c.qty} = ₹${(c.price * c.qty).toFixed(2)}`).join('\n');
    const msg = `🧾 *TAX INVOICE / CASH MEMO*\n🏥 *${invoiceConfig.name}*\n📍 ${invoiceConfig.addr}\n📞 Ph: ${invoiceConfig.phone}\n${invoiceConfig.dl ? `📜 DL: ${invoiceConfig.dl}\n` : ''}${invoiceConfig.gst ? `🆔 GSTIN: ${invoiceConfig.gst}\n` : ''}\n----------------------------------\n👤 *Patient:* ${patientName || 'Customer'} (ID: ${patientId})\n👨‍⚕️ *Doctor:* ${docSelect === 'CUSTOM' ? customDoc : docSelect}\n📅 *Date:* ${new Date().toISOString().slice(0, 10)}\n----------------------------------\n*ITEMS BILLED:*\n${itemsSummary}\n----------------------------------\n*Sub-Total:* ₹${subtotal.toFixed(2)}\n*Discount (${safeDiscountPercent}%):* -₹${discountAmount.toFixed(2)}\n*GRAND TOTAL:* ₹${grandTotal.toFixed(2)}\n*Paid (${payMode}):* ₹${effectivePaid.toFixed(2)}\n${effectiveDue > 0 ? `*DUE BALANCE:* ₹${effectiveDue.toFixed(2)}\n` : ''}\n${invoiceConfig.terms}\n\n👉 Join WhatsApp Updates: ${invoiceConfig.waGroup}\n_Thank you for choosing ${invoiceConfig.name}!_`;

    const url = `https://api.whatsapp.com/send?phone=${formatted}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleSendWhatsAppInvite = () => {
    if (!phone) {
      alert('Please enter patient mobile number first!');
      return;
    }
    const formatted = formatWhatsAppPhone(phone);
    if (!formatted || formatted.length < 10) {
      alert('Please enter a valid 10-digit phone number!');
      return;
    }
    const msg = `Hello ${patientName || 'Customer'},\nJoin our official WhatsApp channel for health updates, doctor schedules, and medicine discounts at ${invoiceConfig.name}:\n👉 ${invoiceConfig.waGroup}\nThank you for choosing us!`;
    const url = `https://api.whatsapp.com/send?phone=${formatted}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const triggerAIFinder = (q?: string) => {
    if (onOpenAIFinderWithQuery) {
      onOpenAIFinderWithQuery(q || searchQuery);
    } else if (onOpenAIFinder) {
      onOpenAIFinder(q || searchQuery);
    }
  };

  // Filter items list
  const labStockItems = medicines.filter(m => m.isLabTest || m.itemType === 'lab_test');
  const currentList = billingMode === 'med' ? medicines : [...labTests, ...labStockItems];
  const filteredItems = currentList.filter(item => {
    const q = searchQuery.toLowerCase();
    const matchQuery =
      item.name.toLowerCase().includes(q) ||
      (item.salt && item.salt.toLowerCase().includes(q)) ||
      (item.company && item.company.toLowerCase().includes(q));
    const matchDoctorGroup =
      doctorGroupFilter === 'all' ||
      (doctorGroupFilter === 'sayan' &&
        'group' in item &&
        item.group === 'Dr. Sayan Majumdar');
    return matchQuery && matchDoctorGroup;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* LEFT 2 COLS: PATIENT INFO & PRODUCT SELECTOR */}
      <div className="lg:col-span-2 space-y-5">
        {/* PATIENT & DOCTOR INFO CARD */}
        <div className="p-5 rounded-3xl bg-surface/90 backdrop-blur-2xl border border-border shadow-2xl space-y-4 text-xs text-text">
          <div className="flex justify-between items-center flex-wrap gap-2">
            <h4 className="font-bold text-text uppercase flex items-center gap-2 text-sm tracking-wide">
              <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                <UserCheck className="w-4 h-4" />
              </div>
              <span>Patient & Doctor Information</span>
            </h4>
            <div className="flex items-center gap-2">
              <button
                id="btn-new-bill-reset"
                type="button"
                onClick={handleStartNewBill}
                className="text-primary bg-primary/20 border border-primary/30 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-primary/30 flex items-center gap-1.5 transition backdrop-blur-md cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5 text-primary" /> + New Bill
              </button>
              <button
                id="btn-pos-wa-invite"
                type="button"
                onClick={handleSendWhatsAppInvite}
                className="text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold hover:bg-emerald-500/30 flex items-center gap-1.5 transition backdrop-blur-md cursor-pointer"
              >
                <MessageCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> WhatsApp Channel
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div className="lg:col-span-2">
              <label className="font-medium text-text-muted block mb-1 text-xs">
                1. Mobile Number
              </label>
              <input
                type="text"
                id="pos-phone"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="10-digit mobile..."
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-text placeholder:text-text-muted focus:bg-bg focus:border-primary focus:outline-hidden backdrop-blur-md"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1 text-xs">
                2. Patient ID
              </label>
              <input
                type="text"
                id="pos-pid"
                value={patientId}
                onChange={handlePatientIdChange}
                placeholder="P/101"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-primary placeholder:text-text-muted focus:bg-bg focus:border-primary outline-none backdrop-blur-md"
                title="Type registered Patient ID to auto-populate details"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="font-medium text-text-muted block mb-1 text-xs">
                3. Patient Name
              </label>
              <input
                type="text"
                id="pos-pname"
                value={patientName}
                onChange={e => setPatientName(e.target.value)}
                placeholder="Enter patient name..."
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted focus:bg-bg focus:border-primary focus:outline-hidden backdrop-blur-md"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1 text-xs">Age</label>
              <input
                type="number"
                id="pos-age"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="e.g. 45"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted focus:bg-bg focus:border-primary focus:outline-hidden backdrop-blur-md"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1 text-xs">Gender</label>
              <select
                id="pos-gender"
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary backdrop-blur-md"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="font-medium text-text-muted block mb-1 text-xs">
                Address
              </label>
              <input
                type="text"
                id="pos-paddr"
                value={address}
                onChange={e => setAddress(e.target.value)}
                placeholder="Village / Location..."
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted focus:bg-bg focus:border-primary focus:outline-hidden backdrop-blur-md"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="font-medium text-text-muted block mb-1 text-xs">
                Doctor Reference
              </label>
              <div className="flex gap-2">
                <select
                  id="pos-doc"
                  value={docSelect}
                  onChange={e => setDocSelect(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary backdrop-blur-md"
                >
                  <option value="Self Prescribed / OTC">Self Prescribed / OTC</option>
                  <option value="Dr. Sayan Majumdar">Dr. Sayan Majumdar (General Medicine)</option>
                  <option value="Dr. T.K. Khan">Dr. T.K. Khan (Cardiologist)</option>
                  <option value="Dr. Subhash Bose">Dr. Subhash Bose (Pediatrician)</option>
                  <option value="CUSTOM">-- Type Custom Doctor Name --</option>
                </select>
                {docSelect === 'CUSTOM' && (
                  <input
                    type="text"
                    id="pos-custom-doc"
                    value={customDoc}
                    onChange={e => setCustomDoc(e.target.value)}
                    placeholder="Doctor name..."
                    className="w-full p-2.5 bg-surface border border-primary/50 rounded-xl text-text placeholder:text-text-muted focus:bg-bg focus:border-primary focus:outline-hidden backdrop-blur-md"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ITEMS & BILLING SELECTOR CARD */}
        <div className="p-5 rounded-3xl bg-surface/90 backdrop-blur-2xl border border-border shadow-2xl space-y-4">
          <div className="flex flex-wrap justify-between items-center gap-3 border-b border-border pb-3">
            {/* Mode toggle */}
            <div className="flex gap-1 p-1 bg-surface border border-border rounded-2xl backdrop-blur-md">
              <button
                id="bill-type-med"
                type="button"
                onClick={() => setBillingMode('med')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  billingMode === 'med'
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Medicines
              </button>
              <button
                id="bill-type-lab"
                type="button"
                onClick={() => setBillingMode('lab')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                  billingMode === 'lab'
                    ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                    : 'text-text-muted hover:text-text'
                }`}
              >
                Lab Tests
              </button>
            </div>

            {/* Filter & AI Search bar */}
            <div className="flex items-center gap-2 flex-wrap">
              {billingMode === 'med' && (
                <select
                  id="pos-filter-group"
                  value={doctorGroupFilter}
                  onChange={e => setDoctorGroupFilter(e.target.value)}
                  className="p-2 bg-surface border border-border rounded-xl text-xs text-text outline-none focus:border-primary"
                >
                  <option value="all">All Medicines</option>
                  <option value="sayan">Dr. Sayan Majumdar Group</option>
                </select>
              )}

              <div className="relative">
                <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-3" />
                <input
                  type="text"
                  id="pos-search-input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search brand, salt..."
                  className="pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-xs w-48 sm:w-56 text-text placeholder:text-text-muted focus:bg-bg focus:border-primary focus:outline-hidden backdrop-blur-md"
                />
              </div>

              <button
                id="btn-open-ai-finder"
                type="button"
                onClick={() => triggerAIFinder(searchQuery)}
                className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md transition backdrop-blur-md cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>AI Salt Finder</span>
              </button>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-y-auto max-h-80 border border-border rounded-2xl bg-surface backdrop-blur-md">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-bg text-[11px] font-semibold text-text-muted uppercase sticky top-0 backdrop-blur-md">
                <tr>
                  <th className="p-3">Item Name & Brand</th>
                  <th className="p-3">Salt Composition</th>
                  <th className="p-3">Stock & Rack</th>
                  <th className="p-3 font-mono">MRP (₹)</th>
                  <th className="p-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-text-muted">
                      No medicines or tests found matching "{searchQuery}". Click{' '}
                      <button
                        type="button"
                        onClick={() => triggerAIFinder(searchQuery)}
                        className="text-primary underline font-bold"
                      >
                        AI Salt Finder
                      </button>{' '}
                      to look up generic equivalents.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => {
                    const isMed = 'tabsPerStrip' in item && item.tabsPerStrip > 1;
                    const isLowStock = item.stock <= 5;
                    const isExpiring = 'expiry' in item && item.expiry <= '2026-12';

                    return (
                      <tr key={item.id} className="hover:bg-surface transition text-text">
                        <td className="p-3">
                          <span className="font-bold text-text block">{item.name}</span>
                          <span className="text-[10px] text-text-muted">
                            {item.company} | {'pack' in item ? item.pack : 'Diagnostic Lab'}
                          </span>
                        </td>
                        <td className="p-3">
                          <span className="font-medium text-text-muted block">{item.salt}</span>
                          {'group' in item && (
                            <span className="text-[10px] text-primary font-semibold">
                              {item.group}
                            </span>
                          )}
                        </td>
                        <td className="p-3">
                          <span
                            className={`font-bold ${
                              isLowStock ? 'text-rose-600 dark:text-rose-400' : 'text-text'
                            }`}
                          >
                            {item.stock} Strips
                          </span>
                          <span className="block text-[10px] text-text-muted">
                            Rack: <b className="text-text">{item.rack}</b>
                            {isExpiring && (
                              <span className="text-amber-600 dark:text-amber-400 font-bold ml-1.5">
                                • Exp: {'expiry' in item ? item.expiry : ''}
                              </span>
                            )}
                          </span>
                        </td>
                        <td className="p-3 font-bold font-mono text-text">
                          ₹ {item.mrp.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              onClick={() => handleAddToCart(item, 'strip', 1)}
                              className="bg-primary/20 hover:bg-primary/30 text-primary border border-primary/40 px-2.5 py-1 rounded-lg text-[11px] font-bold transition flex items-center gap-0.5 cursor-pointer backdrop-blur-sm"
                            >
                              <Plus className="w-3 h-3" /> Strip
                            </button>
                            {isMed && (
                              <button
                                type="button"
                                onClick={() => handlePromptLoose(item as Medicine)}
                                className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-700 dark:text-emerald-300 border border-emerald-500/40 px-2 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer backdrop-blur-sm"
                              >
                                + Loose
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleAddToCart(item, 'return', 1)}
                              className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-700 dark:text-rose-300 border border-rose-500/40 px-1.5 py-1 rounded-lg text-[10px] font-semibold transition flex items-center gap-0.5 cursor-pointer backdrop-blur-sm"
                            >
                              <Undo2 className="w-3 h-3" /> Return
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
        </div>
      </div>

      {/* RIGHT COL: CART & PAYMENT PANEL */}
      <div className="p-5 rounded-3xl bg-surface/90 backdrop-blur-2xl border border-border shadow-2xl flex flex-col justify-between min-h-[580px] text-text space-y-4">
        <div className="space-y-4">
          <div className="flex justify-between items-center pb-3 border-b border-border">
            <h3 className="font-bold text-text text-base flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Zap className="w-4 h-4" />
              </div>
              <span>Cart Items</span>
            </h3>
            <span
              id="cart-item-count"
              className="bg-primary/20 border border-primary/30 text-primary text-xs px-3 py-0.5 rounded-full font-bold font-mono"
            >
              {cart.length} {cart.length === 1 ? 'Item' : 'Items'}
            </span>
          </div>

          {/* Cart item list */}
          <div
            id="cart-items-wrapper"
            className="py-1 space-y-2 overflow-y-auto max-h-60 text-xs pr-1"
          >
            {cart.length === 0 ? (
              <div className="text-center py-10 text-text-muted space-y-2 border border-dashed border-border rounded-2xl bg-surface">
                <PackagePlus className="w-8 h-8 mx-auto text-text-muted" />
                <p className="font-medium text-text-muted">Your cart is empty</p>
                <p className="text-[11px] text-text-muted">Click "+ Strip" or "+ Loose" to add medicines</p>
              </div>
            ) : (
              cart.map((c) => {
                const itemPrice = Number(c.price ?? c.mrp ?? 0);
                const itemQty = Number(c.qty ?? c.quantity ?? 1);
                const rowTotal = Number((itemPrice * itemQty).toFixed(2));
                const isReturn = rowTotal < 0;

                return (
                  <div
                    key={c.cartId}
                    className="p-3 rounded-2xl bg-surface border border-border backdrop-blur-md space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div className="space-y-0.5">
                        <p className={`font-semibold text-xs ${isReturn ? 'text-rose-600 dark:text-rose-400' : 'text-text'}`}>
                          {c.name}
                        </p>
                        <div className="flex items-center gap-2 text-[10px] text-text-muted font-mono">
                          <span>Unit: ₹ {Math.abs(itemPrice).toFixed(2)}</span>
                          {c.batch && <span>• B: {c.batch}</span>}
                          {c.rack && <span>• {c.rack}</span>}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(c.cartId)}
                        className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 p-1 rounded-lg hover:bg-rose-500/20 transition cursor-pointer"
                        title="Remove Item"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Quantity Selector & Row Total */}
                    <div className="flex justify-between items-center pt-1 border-t border-border">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(c.cartId, itemQty - 1)}
                          className="w-6 h-6 rounded-lg bg-bg hover:bg-border text-text flex items-center justify-center font-bold text-xs transition cursor-pointer"
                          title="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={itemQty}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10);
                            handleUpdateQty(c.cartId, isNaN(val) ? 1 : val);
                          }}
                          className="w-12 text-center p-1 bg-surface border border-border rounded-lg text-text font-mono font-bold text-xs outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateQty(c.cartId, itemQty + 1)}
                          className="w-6 h-6 rounded-lg bg-bg hover:bg-border text-text flex items-center justify-center font-bold text-xs transition cursor-pointer"
                          title="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <span className="text-[10px] text-text-muted uppercase font-mono ml-1">
                          {c.unitType || 'Strip'}
                        </span>
                      </div>

                      <div className="text-right">
                        <span
                          className={`font-bold font-mono text-xs ${
                            isReturn ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          ₹ {rowTotal.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Totals, Discounts & Payment section */}
        <div className="border-t border-border pt-3 space-y-3 text-xs">
          {/* Subtotal */}
          <div className="flex justify-between items-center text-text-muted">
            <span className="font-medium">Sub-Total:</span>
            <span className="font-bold font-mono text-text text-sm">₹ {subtotal.toFixed(2)}</span>
          </div>

          {/* Discount Selector */}
          <div className="p-2.5 rounded-2xl bg-surface border border-border space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-text-muted flex items-center gap-1 font-medium">
                <Percent className="w-3.5 h-3.5 text-primary" />
                <span>Discount:</span>
              </span>
              <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                - ₹ {discountAmount.toFixed(2)}
              </span>
            </div>

            {/* Quick discount buttons & manual input */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {[0, 5, 10, 15, 20].map(pct => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setDiscountPercent(pct)}
                  className={`px-2 py-1 rounded-lg font-mono text-[11px] font-bold transition cursor-pointer ${
                    safeDiscountPercent === pct
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-surface hover:bg-bg text-text-muted border border-border'
                  }`}
                >
                  {pct}%
                </button>
              ))}
              <div className="flex items-center gap-1 ml-auto">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={discountPercent}
                  onChange={e => setDiscountPercent(parseFloat(e.target.value) || 0)}
                  placeholder="Custom %"
                  className="w-16 p-1 bg-surface border border-primary/50 rounded-lg text-xs font-bold font-mono text-center text-text outline-none"
                />
                <span className="text-text-muted font-bold">%</span>
              </div>
            </div>
          </div>

          {/* Grand Total Box */}
          <div className="flex justify-between items-center bg-primary/12 p-3.5 rounded-2xl border border-primary/30 backdrop-blur-md">
            <span className="font-extrabold text-text text-xs uppercase tracking-wide">
              Grand Total:
            </span>
            <span
              id="pos-grandtotal"
              className="font-black text-success text-xl font-mono"
            >
              ₹ {grandTotal.toFixed(2)}
            </span>
          </div>

          {/* Payment Mode Selector */}
          <div>
            <label className="font-medium text-text-muted block mb-1 text-xs">
              Payment Mode
            </label>
            <div className="space-y-1.5">
              <select
                id="pos-pay-mode"
                value={payMode}
                onChange={e => handlePayModeChange(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-medium text-text outline-none focus:border-primary"
              >
                <option value="Cash">💵 Cash</option>
                <option value="PhonePe">📱 PhonePe / UPI</option>
                <option value="Card">💳 Debit / Credit Card</option>
                <option value="Due">📋 Full Due</option>
                <option value="Partial">⚖️ Partial Cash + Partial Due</option>
                <option value="PartialOnline">🔀 Partial Cash + Partial Online</option>
                <option value="CUSTOM">✏️ Custom Payment Mode</option>
              </select>

              {payMode === 'CUSTOM' && (
                <input
                  type="text"
                  id="pos-custom-pay-mode"
                  value={customPayMode}
                  onChange={e => setCustomPayMode(e.target.value)}
                  placeholder="Type payment mode..."
                  className="w-full p-2.5 bg-surface border border-primary/50 rounded-xl text-xs text-text outline-none"
                />
              )}
            </div>
          </div>

          {/* Paid & Due Breakdown */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] text-emerald-600 dark:text-emerald-400 font-bold mb-1">Paid</label>
              <input
                type="number"
                id="pos-paid-amt"
                value={paidAmt === '' ? '' : paidAmt}
                onChange={e =>
                  setPaidAmt(e.target.value === '' ? '' : parseFloat(e.target.value) || 0)
                }
                placeholder={grandTotal.toFixed(2)}
                className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-bold font-mono text-text placeholder:text-text-muted outline-none focus:border-emerald-400"
              />
            </div>

            <div>
              <label className="block text-[10px] text-rose-600 dark:text-rose-400 font-bold mb-1">Due</label>
              <input
                type="text"
                id="pos-due-amt"
                readOnly
                value={`₹ ${effectiveDue.toFixed(2)}`}
                className={`w-full p-2 border font-bold rounded-xl text-xs font-mono outline-none ${
                  effectiveDue > 0
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300'
                    : 'bg-surface border-border text-text-muted'
                }`}
              />
            </div>
          </div>

          {/* SUCCESS MESSAGE IF INVOICE GENERATED */}
          {checkoutSuccessMsg && (
            <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-xs flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{checkoutSuccessMsg}</span>
              </span>
              {lastGeneratedInvoice && (
                <button
                  type="button"
                  onClick={() => onPrintInvoice(lastGeneratedInvoice)}
                  className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-text rounded font-bold text-[10px]"
                >
                  Print PDF
                </button>
              )}
            </div>
          )}

          {/* ACTION BUTTONS: PRINT PDF & WHATSAPP BILL */}
          <div className="space-y-2 pt-1">
            <button
              id="btn-checkout-print"
              type="button"
              onClick={handleGenerateBill}
              className="w-full btn text-primary-foreground bg-success border border-success hover:brightness-105 py-3 rounded-2xl text-xs shadow-lg"
            >
              <Printer className="w-4 h-4" />
              <span>Generate Bill & Print PDF</span>
            </button>

            <button
              id="btn-whatsapp-bill"
              type="button"
              onClick={handleSendWhatsAppBill}
              className="w-full bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 font-semibold py-2.5 rounded-2xl text-xs transition flex items-center justify-center gap-2 cursor-pointer backdrop-blur-md"
            >
              <Send className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>Send WhatsApp Receipt</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
