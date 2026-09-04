import React, { useEffect, useState, useRef } from 'react';
import {
  Building2,
  Check,
  CheckCircle2,
  FileCheck2,
  Phone,
  Pill,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { Distributor, InvoiceConfig, Medicine, NeededMedItem, NeededMedOrder, PatientRecord } from '../../types';
import { getTodayISODate } from '../../utils/dateUtils';
import { reserveNextPatientId } from '../../utils/patientUtils';
import { getCurrencySymbol } from '../../utils/currency';

interface AddNeedMedModalProps {
  isOpen: boolean;
  invoiceConfig?: InvoiceConfig;
  onClose: () => void;
  distributors: Distributor[];
  setDistributors?: React.Dispatch<React.SetStateAction<Distributor[]>>;
  patients?: PatientRecord[];
  medicines?: Medicine[];
  onSaveNeedMed: (order: NeededMedOrder) => void;
  onQuickAddPatient?: (patient: PatientRecord) => void;
  prefillMedName?: string;
  prefillPatientId?: string;
  prefillPatientName?: string;
  prefillPhone?: string;
}

const MED_ORDER_UNITS = ['Strips', 'Packs', 'Bottles', 'Vials', 'Boxes', 'Units'];

export const AddNeedMedModal: React.FC<AddNeedMedModalProps> = ({
  isOpen,
  invoiceConfig,
  onClose,
  distributors,
  setDistributors,
  patients = [],
  medicines = [],
  onSaveNeedMed,
  onQuickAddPatient,
  prefillMedName = '',
  prefillPatientId = '',
  prefillPatientName = '',
  prefillPhone = '',
}) => {
  const currencySymbol = getCurrencySymbol(invoiceConfig?.currency);

  // Multi-item list state for adding multiple medicines
  const [medItems, setMedItems] = useState<NeededMedItem[]>([
    {
      id: 'item-1',
      med: prefillMedName || '',
      qty: 2,
      unit: 'Strips',
      tabsPerStrip: 10,
    },
  ]);

  // Current item being actively edited/typed in the input field
  const [activeItemIndex, setActiveItemIndex] = useState<number>(0);
  const [activeSearchQuery, setActiveSearchQuery] = useState<string>(prefillMedName || '');
  const [isMedDropdownOpen, setIsMedDropdownOpen] = useState(false);

  // Patient Selection & Auto-fetch State
  const [selectedPatientId, setSelectedPatientId] = useState(prefillPatientId);
  const [patientSearchInput, setPatientSearchInput] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  // Fetched / Bound Patient Information
  const [patientName, setPatientName] = useState(prefillPatientName);
  const [phone, setPhone] = useState(prefillPhone);
  const [patientAddress, setPatientAddress] = useState('');
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<PatientRecord | null>(null);

  // Distributor Selection & Custom Typing State
  const [distInput, setDistInput] = useState(distributors.length > 0 ? distributors[0].name : '');
  const [isDistDropdownOpen, setIsDistDropdownOpen] = useState(false);
  const [showDistRegisterDrawer, setShowDistRegisterDrawer] = useState(false);

  // New Distributor Registration Protocol State
  const [newDistName, setNewDistName] = useState('');
  const [newDistPhone, setNewDistPhone] = useState('');
  const [newDistGstin, setNewDistGstin] = useState('');
  const [newDistDlNo, setNewDistDlNo] = useState('');
  const [newDistAddr, setNewDistAddr] = useState('');
  const [newDistContactPerson, setNewDistContactPerson] = useState('');
  const [newDistEmail, setNewDistEmail] = useState('');

  // Order Commitment Time & Notes
  const [time, setTime] = useState('Tomorrow Afternoon');
  const [notes, setNotes] = useState('');

  // Quick Register New Patient inline toggle
  const [showQuickPatientForm, setShowQuickPatientForm] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientAddr, setNewPatientAddr] = useState('');

  const medDropdownRef = useRef<HTMLDivElement>(null);
  const distDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-fill when prefill props change
  useEffect(() => {
    if (prefillMedName) {
      setMedItems([
        {
          id: 'item-' + Date.now(),
          med: prefillMedName,
          qty: 2,
          unit: 'Strips',
          tabsPerStrip: 10,
        },
      ]);
      setActiveSearchQuery(prefillMedName);
    }
    if (prefillPatientId) {
      handleSelectPatientById(prefillPatientId);
    } else if (prefillPatientName) {
      setPatientName(prefillPatientName);
      setPhone(prefillPhone);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefillMedName, prefillPatientId, prefillPatientName, prefillPhone, isOpen]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (medDropdownRef.current && !medDropdownRef.current.contains(event.target as Node)) {
        setIsMedDropdownOpen(false);
      }
      if (distDropdownRef.current && !distDropdownRef.current.contains(event.target as Node)) {
        setIsDistDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isOpen) return null;

  // Auto-fetch patient details by ID or selection
  const handleSelectPatient = (p: PatientRecord) => {
    setSelectedPatientId(p.id);
    setPatientName(p.name);
    setPhone(p.phone);
    setPatientAddress(p.addr || p.address || 'Local Area');
    setSelectedPatientRecord(p);
    setPatientSearchInput(`${p.id} - ${p.name}`);
    setIsPatientDropdownOpen(false);
  };

  const handleSelectPatientById = (idToMatch: string) => {
    const found = patients.find(
      p => p.id.toLowerCase() === idToMatch.toLowerCase().trim() || p.phone === idToMatch.trim()
    );
    if (found) {
      handleSelectPatient(found);
    } else {
      setSelectedPatientId(idToMatch);
    }
  };

  const handlePatientInputChange = (val: string) => {
    setPatientSearchInput(val);
    setIsPatientDropdownOpen(true);

    const exactMatch = patients.find(
      p => p.id.toLowerCase() === val.toLowerCase().trim() || p.phone === val.trim()
    );
    if (exactMatch) {
      setSelectedPatientId(exactMatch.id);
      setPatientName(exactMatch.name);
      setPhone(exactMatch.phone);
      setPatientAddress(exactMatch.addr || exactMatch.address || '');
      setSelectedPatientRecord(exactMatch);
    } else if (val.trim() === '') {
      setSelectedPatientId('');
      setPatientName('');
      setPhone('');
      setPatientAddress('');
      setSelectedPatientRecord(null);
    }
  };

  const handleQuickCreatePatient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      alert('Please enter Patient Name and Phone');
      return;
    }

    // Reserved atomically from the backend (falls back to a local guess if
    // offline) so two terminals quick-creating a patient at the same time
    // can never be handed the same ID — see reserveNextPatientId.
    const nextId = await reserveNextPatientId(patients);
    const createdPatient: PatientRecord = {
      id: nextId,
      name: newPatientName.trim(),
      phone: newPatientPhone.trim(),
      addr: newPatientAddr.trim() || 'Local Area',
      address: newPatientAddr.trim() || 'Local Area',
      totalDue: 0,
      dueAmount: 0,
      lastDate: new Date().toISOString().slice(0, 10),
      totalVisits: 1,
    };

    if (onQuickAddPatient) {
      onQuickAddPatient(createdPatient);
    }

    handleSelectPatient(createdPatient);
    setShowQuickPatientForm(false);
    setNewPatientName('');
    setNewPatientPhone('');
    setNewPatientAddr('');
  };

  // Medicine Item management
  const handleAddMedicineRow = () => {
    const newItem: NeededMedItem = {
      id: 'item-' + Date.now(),
      med: '',
      qty: 1,
      unit: 'Strips',
      tabsPerStrip: 10,
    };
    const nextIndex = medItems.length;
    setMedItems(prev => [...prev, newItem]);
    setActiveItemIndex(nextIndex);
    setActiveSearchQuery('');
    setIsMedDropdownOpen(true);
  };

  const handleRemoveMedicineRow = (index: number) => {
    if (medItems.length <= 1) {
      // Keep at least one row, just clear it
      setMedItems([{ id: 'item-1', med: '', qty: 1, unit: 'Strips', tabsPerStrip: 10 }]);
      setActiveItemIndex(0);
      setActiveSearchQuery('');
      return;
    }
    setMedItems(prev => prev.filter((_, idx) => idx !== index));
    if (activeItemIndex >= index && activeItemIndex > 0) {
      setActiveItemIndex(activeItemIndex - 1);
    }
  };

  const handleUpdateItemMed = (index: number, name: string) => {
    setMedItems(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, med: name } : item))
    );
    setActiveSearchQuery(name);
    setActiveItemIndex(index);
    setIsMedDropdownOpen(true);
  };

  const handleUpdateItemQty = (index: number, quantity: number) => {
    setMedItems(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, qty: Math.max(1, quantity) } : item))
    );
  };

  const handleUpdateItemUnit = (index: number, unitStr: string) => {
    setMedItems(prev =>
      prev.map((item, idx) =>
        idx === index
          ? { ...item, unit: unitStr, tabsPerStrip: unitStr === 'Strips' ? item.tabsPerStrip || 10 : item.tabsPerStrip }
          : item
      )
    );
  };

  const handleUpdateItemTabsPerStrip = (index: number, tabs: number) => {
    setMedItems(prev =>
      prev.map((item, idx) => (idx === index ? { ...item, tabsPerStrip: Math.max(1, tabs) } : item))
    );
  };

  // Medicine Selection from Autocomplete
  const handleSelectMedicineForActiveRow = (m: Medicine) => {
    setMedItems(prev =>
      prev.map((item, idx) =>
        idx === activeItemIndex
          ? {
              ...item,
              med: m.name,
              pack: m.pack,
              salt: m.salt,
              mrp: m.mrp,
              stock: m.stock,
              tabsPerStrip: item.unit === 'Strips' ? m.tabsPerStrip || item.tabsPerStrip || 10 : item.tabsPerStrip,
            }
          : item
      )
    );
    setActiveSearchQuery(m.name);
    setIsMedDropdownOpen(false);

    // If medicine has a distributor on record and none is chosen yet, recommend it
    const medDist = m.dist || m.distributor;
    if (medDist && !distInput.trim()) {
      setDistInput(medDist);
    }
  };

  // Match current typed distributor against saved registry
  const matchedDistributor: Distributor | undefined = distributors.find(
    d =>
      d.name.toLowerCase() === distInput.trim().toLowerCase() ||
      d.name.toLowerCase().includes(distInput.trim().toLowerCase()) ||
      (distInput.trim().length > 3 && distInput.toLowerCase().includes(d.name.toLowerCase()))
  );

  // Filter distributors for search suggestions
  const filteredDistributors = distributors.filter(d => {
    if (!distInput.trim()) return true;
    const q = distInput.toLowerCase().trim();
    return (
      d.name.toLowerCase().includes(q) ||
      (d.phone && d.phone.includes(q)) ||
      (d.gstin && d.gstin.toLowerCase().includes(q)) ||
      (d.addr && d.addr.toLowerCase().includes(q))
    );
  });

  // Handle Quick Register New Distributor Protocol
  const handleQuickRegisterDistributor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDistName.trim()) {
      alert('Please enter Distributor / Supplier Name');
      return;
    }

    const newDist: Distributor = {
      id: 'DIST-' + Date.now(),
      name: newDistName.trim().toUpperCase(),
      phone: newDistPhone.trim() || 'N/A',
      gstin: newDistGstin.trim() || 'N/A',
      dlNo: newDistDlNo.trim() || undefined,
      addr: newDistAddr.trim() || 'Local Pharma Market',
      contactPerson: newDistContactPerson.trim() || undefined,
      email: newDistEmail.trim() || undefined,
      registeredDate: getTodayISODate(),
      source: 'Manual Registration',
    };

    if (setDistributors) {
      setDistributors(prev => [newDist, ...prev]);
    }

    setDistInput(newDist.name);
    setShowDistRegisterDrawer(false);
    setNewDistName('');
    setNewDistPhone('');
    setNewDistGstin('');
    setNewDistDlNo('');
    setNewDistAddr('');
    setNewDistContactPerson('');
    setNewDistEmail('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Clean valid medicine items
    const validItems = medItems.filter(item => item.med.trim().length > 0);
    if (validItems.length === 0) {
      alert('Please specify at least one medicine name with required quantity');
      return;
    }

    const finalDist = distInput.trim() || 'General Supplier';

    // Auto-register distributor if not already in the registry
    if (finalDist && !matchedDistributor && setDistributors && finalDist.length > 2) {
      const autoDist: Distributor = {
        id: 'DIST-' + Date.now(),
        name: finalDist.toUpperCase(),
        phone: 'N/A',
        gstin: 'N/A',
        addr: 'Registered via Special Need Order',
        registeredDate: getTodayISODate(),
        source: 'Manual Registration',
      };
      setDistributors(prev => {
        const exists = prev.some(d => d.name.toLowerCase() === autoDist.name.toLowerCase());
        return exists ? prev : [autoDist, ...prev];
      });
    }

    // Consolidated primary medicine string for backwards compatibility
    const primaryMedTitle =
      validItems.length === 1
        ? validItems[0].med
        : `${validItems[0].med} (+${validItems.length - 1} more items)`;

    const totalCalculatedQty = validItems.reduce((sum, item) => sum + (item.qty || 1), 0);

    const newOrder: NeededMedOrder = {
      id: 'NM-' + Date.now(),
      patientId: selectedPatientId || undefined,
      med: primaryMedTitle,
      name: patientName.trim() || 'Walk-in Customer',
      phone: phone.trim() || 'N/A',
      dist: finalDist,
      time: time.trim() || 'Tomorrow Afternoon',
      qty: totalCalculatedQty,
      items: validItems,
      notes: notes.trim() || undefined,
      status: 'Distributor Ordered',
    };

    onSaveNeedMed(newOrder);
    onClose();
  };

  // Filter patients for dropdown
  const filteredPatients = patients.filter(
    p =>
      !patientSearchInput ||
      p.id.toLowerCase().includes(patientSearchInput.toLowerCase()) ||
      p.name.toLowerCase().includes(patientSearchInput.toLowerCase()) ||
      p.phone.includes(patientSearchInput)
  );

  // Filter existing medicines for active row autocomplete search
  const currentQueryToMatch = activeSearchQuery.toLowerCase().trim();
  const filteredMedicines = medicines.filter(m => {
    if (!currentQueryToMatch) return false;
    return (
      m.name.toLowerCase().includes(currentQueryToMatch) ||
      (m.generic && m.generic.toLowerCase().includes(currentQueryToMatch)) ||
      (m.company && m.company.toLowerCase().includes(currentQueryToMatch))
    );
  });

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-5">
      <div className="glass-panel rounded-3xl max-w-2xl w-full p-5 sm:p-6 space-y-4 text-xs text-text animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <span>Special Need Medicine Order</span>
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. PATIENT ID AUTO-FETCH & SELECTOR */}
          <div className="p-3.5 rounded-2xl bg-primary/10 border border-primary/30 space-y-2.5 backdrop-blur-md relative">
            <div className="flex justify-between items-center">
              <label className="font-bold text-primary flex items-center gap-1.5">
                <UserCheck className="w-4 h-4 text-primary" />
                <span>Link Registered Patient:</span>
              </label>

              <button
                type="button"
                onClick={() => setShowQuickPatientForm(!showQuickPatientForm)}
                className="text-[11px] text-teal-700 dark:text-teal-300 hover:text-teal-800 dark:hover:text-teal-200 font-semibold flex items-center gap-1 bg-teal-500/20 border border-teal-500/30 px-2 py-0.5 rounded-lg transition cursor-pointer"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Register New Patient</span>
              </button>
            </div>

            {/* Patient Search / ID Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-3" />
              <input
                type="text"
                value={patientSearchInput}
                onChange={e => handlePatientInputChange(e.target.value)}
                onFocus={() => setIsPatientDropdownOpen(true)}
                placeholder="Type Patient ID (e.g. 101) or Patient Name / Phone..."
                className="w-full pl-9 pr-3 py-2 bg-[var(--color-overlay)] border border-border rounded-xl font-bold text-text placeholder:text-text-muted outline-none focus:border-primary"
              />

              {/* Autocomplete Dropdown */}
              {isPatientDropdownOpen && filteredPatients.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 divide-y divide-border">
                  {filteredPatients.map(p => (
                    <div
                      key={p.id}
                      onClick={() => handleSelectPatient(p)}
                      className="p-2.5 hover:bg-primary/30 cursor-pointer flex justify-between items-center text-xs transition"
                    >
                      <div>
                        <span className="font-bold text-text block">
                          <span className="font-mono text-primary mr-1.5">[{p.id}]</span>
                          {p.name}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">
                          Ph: {p.phone} &bull; {p.addr || 'Local Area'}
                        </span>
                      </div>
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-md font-mono">
                        Select
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Verified Patient Profile Summary Banner */}
            {selectedPatientRecord ? (
              <div className="p-2.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-200 flex items-center justify-between text-[11px]">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-text">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>{patientName}</span>
                    <span className="font-mono text-xs text-primary bg-primary/20 px-1.5 rounded">
                      {selectedPatientId}
                    </span>
                  </div>
                  <p className="text-text-muted font-mono">
                    <b>Phone:</b> {phone} &bull; <b>Address:</b> {patientAddress || 'Local Area'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPatientRecord(null);
                    setSelectedPatientId('');
                    setPatientName('');
                    setPhone('');
                    setPatientSearchInput('');
                  }}
                  className="text-text-muted hover:text-text text-xs p-1"
                  title="Change Patient"
                >
                  ✕
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <input
                  type="text"
                  placeholder="Patient Name (e.g. Walk-in Customer)"
                  value={patientName}
                  onChange={e => setPatientName(e.target.value)}
                  className="p-2 bg-[var(--color-overlay)] border border-border rounded-xl text-text font-semibold text-xs"
                />
                <input
                  type="text"
                  placeholder="Contact Mobile Number"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="p-2 bg-[var(--color-overlay)] border border-border rounded-xl text-text font-mono text-xs"
                />
              </div>
            )}

            {/* Quick Inline Patient Creation Drawer */}
            {showQuickPatientForm && (
              <div className="p-3 rounded-xl bg-teal-500/10 border border-teal-500/30 space-y-2 mt-2">
                <p className="font-bold text-teal-800 dark:text-teal-200 text-xs">Quick Add Patient to Database:</p>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Patient Name"
                    value={newPatientName}
                    onChange={e => setNewPatientName(e.target.value)}
                    className="p-2 bg-bg border border-border rounded-lg text-text text-xs"
                  />
                  <input
                    type="text"
                    placeholder="Mobile Number"
                    value={newPatientPhone}
                    onChange={e => setNewPatientPhone(e.target.value)}
                    className="p-2 bg-bg border border-border rounded-lg text-text font-mono text-xs"
                  />
                </div>
                <input
                  type="text"
                  placeholder="Address (e.g. Negua, Medinipur)"
                  value={newPatientAddr}
                  onChange={e => setNewPatientAddr(e.target.value)}
                  className="w-full p-2 bg-bg border border-border rounded-lg text-text text-xs"
                />
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowQuickPatientForm(false)}
                    className="px-2.5 py-1 text-text-muted text-[11px]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickCreatePatient}
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-white font-bold rounded-lg text-[11px]"
                  >
                    Save & Link Patient
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. MULTIPLE MEDICINES LIST WITH NAME, QUANTITY & UNIT */}
          <div className="p-4 rounded-2xl bg-surface border border-border space-y-3 relative" ref={medDropdownRef}>
            <div className="flex justify-between items-center">
              <label className="font-bold text-text flex items-center gap-2">
                <Pill className="w-4 h-4 text-primary" />
                <span>Medicines Required List</span>
                <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <span className="text-[11px] text-text-muted font-mono">
                {medItems.length} {medItems.length === 1 ? 'Medicine' : 'Medicines'} in this requisition
              </span>
            </div>

            {/* List of Medicine Rows */}
            <div className="space-y-2.5">
              {medItems.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="p-2.5 rounded-xl bg-bg border border-border space-y-2"
                >
                  <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap">
                    <span className="w-6 h-6 rounded-lg bg-primary/20 text-primary font-mono font-bold flex items-center justify-center text-xs shrink-0">
                      {idx + 1}
                    </span>

                    {/* Medicine Name input */}
                    <div className="flex-1 min-w-[200px] relative">
                      <input
                        type="text"
                        value={item.med}
                        onChange={e => handleUpdateItemMed(idx, e.target.value)}
                        onFocus={() => {
                          setActiveItemIndex(idx);
                          setActiveSearchQuery(item.med);
                          setIsMedDropdownOpen(true);
                        }}
                        placeholder="Type medicine name or search stock..."
                        className="w-full px-3 py-2 bg-surface border border-border rounded-xl font-bold text-text placeholder:text-text-muted outline-none focus:border-primary text-xs"
                        required
                      />
                    </div>

                    {/* Quantity + Unit input */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <label className="text-[10px] text-text-muted font-medium">Qty:</label>
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={e =>
                          handleUpdateItemQty(idx, parseInt(e.target.value, 10) || 1)
                        }
                        className="w-16 p-2 bg-surface border border-border rounded-xl font-bold font-mono text-center text-text outline-none focus:border-primary text-xs"
                        required
                      />
                      <select
                        value={item.unit || 'Strips'}
                        onChange={e => handleUpdateItemUnit(idx, e.target.value)}
                        className="p-2 bg-surface border border-border rounded-xl text-text-muted text-xs font-semibold outline-none cursor-pointer"
                      >
                        {MED_ORDER_UNITS.map(u => (
                          <option key={u} value={u}>
                            {u}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Remove row button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveMedicineRow(idx)}
                      className="p-2 rounded-xl text-text-muted hover:text-rose-600 dark:hover:text-rose-300 hover:bg-rose-500/20 transition cursor-pointer shrink-0"
                      title="Remove medicine"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Tablets-per-strip → loose tablet count, only relevant when sold/ordered by Strips */}
                  {item.unit === 'Strips' && (
                    <div className="flex items-center gap-2 pl-8 text-[10px] text-text-muted">
                      <label className="font-medium">Tablets per strip:</label>
                      <input
                        type="number"
                        min="1"
                        value={item.tabsPerStrip ?? 10}
                        onChange={e =>
                          handleUpdateItemTabsPerStrip(idx, parseInt(e.target.value, 10) || 1)
                        }
                        className="w-14 p-1.5 bg-surface border border-border rounded-lg font-mono text-center text-text outline-none focus:border-primary text-[11px]"
                      />
                      <span className="font-mono text-primary">
                        = {item.qty * (item.tabsPerStrip || 10)} tablets (loose) total
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Medicine Autocomplete Suggestions for Active Row */}
            {isMedDropdownOpen && currentQueryToMatch.length > 0 && (
              <div className="absolute top-full left-4 right-4 mt-1 bg-surface border border-primary/40 rounded-2xl shadow-2xl max-h-52 overflow-y-auto z-50 divide-y divide-border backdrop-blur-xl">
                {filteredMedicines.length > 0 ? (
                  <>
                    <div className="p-2 bg-primary/10 text-[10px] text-primary font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Matching Medicines in Stock (Row #{activeItemIndex + 1})</span>
                      <span>({filteredMedicines.length} found)</span>
                    </div>
                    {filteredMedicines.map(m => (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMedicineForActiveRow(m)}
                        className="p-2.5 hover:bg-primary/30 cursor-pointer flex justify-between items-center text-xs transition"
                      >
                        <div>
                          <span className="font-bold text-text block">
                            {m.name}
                            {m.pack && <span className="text-text-muted font-normal text-[11px] ml-1.5">({m.pack})</span>}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">
                            {m.generic ? `${m.generic} • ` : ''}
                            {m.rack ? `Rack: ${m.rack} • ` : ''}
                            MRP: {currencySymbol}{m.mrp.toFixed(2)}
                          </span>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          {m.stock > 0 ? (
                            <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded-md font-mono border border-emerald-500/30 font-bold block">
                              In Stock: {m.stock}
                            </span>
                          ) : (
                            <span className="bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] px-2 py-0.5 rounded-md font-mono border border-rose-500/30 font-bold block">
                              Stock 0 (Out)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="p-2.5 text-center text-text-muted">
                    <span className="text-amber-600 dark:text-amber-300 font-semibold block">"{activeSearchQuery}"</span>
                    <span className="text-[10px]">Will be procured as custom special medicine from supplier.</span>
                  </div>
                )}
              </div>
            )}

            {/* + Add Another Medicine Button */}
            <button
              type="button"
              onClick={handleAddMedicineRow}
              className="w-full py-2.5 bg-primary/10 hover:bg-primary/20 text-primary border border-dashed border-primary/40 rounded-xl font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Another Medicine</span>
            </button>
          </div>

          {/* 3. DISTRIBUTOR / SUPPLIER SELECTION, SEARCH & QUICK REGISTRATION */}
          <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-2.5 backdrop-blur-md relative" ref={distDropdownRef}>
            <div className="flex justify-between items-center flex-wrap gap-2">
              <label className="font-bold text-text flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-primary" />
                <span>Procure From Distributor / Supplier:</span>
              </label>

              <button
                type="button"
                onClick={() => setShowDistRegisterDrawer(!showDistRegisterDrawer)}
                className="text-[11px] text-primary hover:text-text font-semibold flex items-center gap-1 bg-primary/15 hover:bg-primary/25 border border-primary/40 px-2.5 py-1 rounded-xl transition cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ Register New Supplier</span>
              </button>
            </div>

            {/* Free Typable & Searchable Distributor Input */}
            <div className="relative">
              <Truck className="w-3.5 h-3.5 text-text-muted absolute left-3 top-3" />
              <input
                type="text"
                value={distInput}
                onChange={e => {
                  setDistInput(e.target.value);
                  setIsDistDropdownOpen(true);
                }}
                onFocus={() => setIsDistDropdownOpen(true)}
                placeholder="Type or select supplier / distributor name..."
                className="w-full pl-9 pr-8 py-2.5 bg-bg border border-border rounded-xl font-bold text-text placeholder:text-text-muted outline-none focus:border-primary text-xs"
                required
              />

              {distInput && (
                <button
                  type="button"
                  onClick={() => setDistInput('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs p-1"
                >
                  ✕
                </button>
              )}

              {/* Autocomplete suggestions for saved distributors */}
              {isDistDropdownOpen && filteredDistributors.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-2xl shadow-2xl max-h-48 overflow-y-auto z-50 divide-y divide-border backdrop-blur-xl">
                  <div className="p-2 bg-bg text-[10px] text-text-muted font-bold uppercase tracking-wider flex justify-between">
                    <span>Saved Distributors in Profile & Stock ERP</span>
                    <span>({filteredDistributors.length})</span>
                  </div>
                  {filteredDistributors.map(d => (
                    <div
                      key={d.id}
                      onClick={() => {
                        setDistInput(d.name);
                        setIsDistDropdownOpen(false);
                      }}
                      className="p-2.5 hover:bg-primary/30 cursor-pointer flex justify-between items-center text-xs transition"
                    >
                      <div>
                        <span className="font-bold text-text block">{d.name}</span>
                        <span className="text-[10px] text-text-muted font-mono">
                          {d.phone && d.phone !== 'N/A' ? `Ph: ${d.phone} • ` : ''}
                          {d.gstin && d.gstin !== 'N/A' ? `GST: ${d.gstin} • ` : ''}
                          {d.addr || 'Registered Supplier'}
                        </span>
                      </div>
                      <span className="text-[10px] bg-primary/20 text-primary px-2 py-0.5 rounded-md font-mono">
                        Select
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Active Verified Distributor Information Card */}
            {matchedDistributor ? (
              <div className="p-2.5 rounded-xl bg-primary/15 border border-primary/30 text-text flex items-center justify-between text-[11px] animate-in fade-in">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 font-bold text-text">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    <span>{matchedDistributor.name}</span>
                    <span className="text-[10px] bg-primary/25 text-primary px-1.5 py-0.2 rounded font-mono">
                      Registered Supplier
                    </span>
                  </div>
                  <div className="text-[10px] text-text-muted font-mono flex flex-wrap gap-x-3 gap-y-0.5">
                    {matchedDistributor.phone && matchedDistributor.phone !== 'N/A' && (
                      <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-300 font-bold">
                        <Phone className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        <span>{matchedDistributor.phone}</span>
                      </span>
                    )}
                    {matchedDistributor.gstin && matchedDistributor.gstin !== 'N/A' && (
                      <span>GST: {matchedDistributor.gstin}</span>
                    )}
                    {matchedDistributor.dlNo && <span>DL: {matchedDistributor.dlNo}</span>}
                    {matchedDistributor.addr && <span>{matchedDistributor.addr}</span>}
                  </div>
                </div>
              </div>
            ) : distInput.trim() ? (
              <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-amber-700 dark:text-amber-200 flex items-center justify-between">
                <span>
                  Custom Supplier: <b>{distInput}</b> (Not in registry)
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setNewDistName(distInput);
                    setShowDistRegisterDrawer(true);
                  }}
                  className="text-[10px] text-amber-700 dark:text-amber-300 hover:text-text underline font-bold"
                >
                  + Add to Registry
                </button>
              </div>
            ) : null}

            {/* Quick Supplier / Distributor Registration Protocol Drawer */}
            {showDistRegisterDrawer && (
              <div className="p-3.5 rounded-2xl bg-bg border border-primary/40 space-y-2.5 mt-2 animate-in fade-in">
                <div className="flex justify-between items-center border-b border-border pb-1.5">
                  <div className="flex items-center gap-1.5 font-bold text-xs text-text">
                    <Building2 className="w-4 h-4 text-primary" />
                    <span>Register New Distributor / Supplier</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowDistRegisterDrawer(false)}
                    className="text-text-muted hover:text-text text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="text-[10px] text-text-muted block mb-0.5">
                      Distributor / Agency Name <span className="text-rose-600 dark:text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. M/S BLAIR REMEDIES / NEW UMA MEDICINE"
                      value={newDistName}
                      onChange={e => setNewDistName(e.target.value)}
                      className="w-full p-2 bg-surface border border-border rounded-lg text-text text-xs font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">
                      Mobile / WhatsApp Phone
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 9876543210"
                      value={newDistPhone}
                      onChange={e => setNewDistPhone(e.target.value)}
                      className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">GSTIN Number</label>
                    <input
                      type="text"
                      placeholder="19ABCDE1234F1Z5"
                      value={newDistGstin}
                      onChange={e => setNewDistGstin(e.target.value)}
                      className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">Drug License (DL No)</label>
                    <input
                      type="text"
                      placeholder="e.g. WB-MED-2024-9988"
                      value={newDistDlNo}
                      onChange={e => setNewDistDlNo(e.target.value)}
                      className="w-full p-2 bg-surface border border-border rounded-lg text-text font-mono text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-text-muted block mb-0.5">Contact Person / Agent</label>
                    <input
                      type="text"
                      placeholder="e.g. Mr. Ramesh Ghosh"
                      value={newDistContactPerson}
                      onChange={e => setNewDistContactPerson(e.target.value)}
                      className="w-full p-2 bg-surface border border-border rounded-lg text-text text-xs"
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="text-[10px] text-text-muted block mb-0.5">Address / City</label>
                    <input
                      type="text"
                      placeholder="e.g. Kharagpur / Medinipur, West Bengal"
                      value={newDistAddr}
                      onChange={e => setNewDistAddr(e.target.value)}
                      className="w-full p-2 bg-surface border border-border rounded-lg text-text text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-1.5 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowDistRegisterDrawer(false)}
                    className="px-3 py-1.5 text-text-muted hover:text-text text-xs rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleQuickRegisterDistributor}
                    className="px-4 py-1.5 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl text-xs flex items-center gap-1 shadow-md shadow-primary/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save & Link Distributor</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 4. PROMISE DELIVERY TIME & OPTIONAL NOTES */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-text-muted block mb-1">
                Promise Delivery Time
              </label>
              <input
                type="text"
                value={time}
                onChange={e => setTime(e.target.value)}
                placeholder="e.g. Tomorrow Afternoon"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary text-xs"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-text-muted block mb-1">
                Prescription / Remarks Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Urgent heart patient prescription"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary text-xs"
              />
            </div>
          </div>

          {/* ACTIONS */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-muted hover:text-text bg-surface hover:bg-bg rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/40 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save Special Need Order ({medItems.filter(i => i.med.trim()).length} Items)</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
