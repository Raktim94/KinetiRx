import React, { useEffect, useState, useRef } from 'react';
import {
  Check,
  CheckCircle2,
  FileCheck2,
  MapPin,
  Package,
  Pill,
  Phone,
  Plus,
  Search,
  Sparkles,
  Truck,
  User,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import { Distributor, Medicine, NeededMedOrder, PatientRecord } from '../../types';

interface AddNeedMedModalProps {
  isOpen: boolean;
  onClose: () => void;
  distributors: Distributor[];
  patients?: PatientRecord[];
  medicines?: Medicine[];
  onSaveNeedMed: (order: NeededMedOrder) => void;
  onQuickAddPatient?: (patient: PatientRecord) => void;
  prefillMedName?: string;
  prefillPatientId?: string;
  prefillPatientName?: string;
  prefillPhone?: string;
}

export const AddNeedMedModal: React.FC<AddNeedMedModalProps> = ({
  isOpen,
  onClose,
  distributors,
  patients = [],
  medicines = [],
  onSaveNeedMed,
  onQuickAddPatient,
  prefillMedName = '',
  prefillPatientId = '',
  prefillPatientName = '',
  prefillPhone = '',
}) => {
  const [med, setMed] = useState(prefillMedName);
  const [isMedDropdownOpen, setIsMedDropdownOpen] = useState(false);
  const [selectedMedicineItem, setSelectedMedicineItem] = useState<Medicine | null>(null);

  // Patient Selection & Auto-fetch State
  const [selectedPatientId, setSelectedPatientId] = useState(prefillPatientId);
  const [patientSearchInput, setPatientSearchInput] = useState('');
  const [isPatientDropdownOpen, setIsPatientDropdownOpen] = useState(false);

  // Fetched / Bound Patient Information
  const [patientName, setPatientName] = useState(prefillPatientName);
  const [phone, setPhone] = useState(prefillPhone);
  const [patientAddress, setPatientAddress] = useState('');
  const [selectedPatientRecord, setSelectedPatientRecord] = useState<PatientRecord | null>(null);

  // Order Details
  const [distSelect, setDistSelect] = useState(
    distributors.length > 0 ? distributors[0].name : 'BLAIR REMEDIES PVT. LTD.'
  );
  const [distCustom, setDistCustom] = useState('');
  const [qty, setQty] = useState('2');
  const [time, setTime] = useState('Tomorrow Afternoon');

  // Quick Register New Patient inline toggle
  const [showQuickPatientForm, setShowQuickPatientForm] = useState(false);
  const [newPatientName, setNewPatientName] = useState('');
  const [newPatientPhone, setNewPatientPhone] = useState('');
  const [newPatientAddr, setNewPatientAddr] = useState('');

  const medDropdownRef = useRef<HTMLDivElement>(null);

  // Auto-fill when prefill props change
  useEffect(() => {
    if (prefillMedName) setMed(prefillMedName);
    if (prefillPatientId) {
      handleSelectPatientById(prefillPatientId);
    } else if (prefillPatientName) {
      setPatientName(prefillPatientName);
      setPhone(prefillPhone);
    }
  }, [prefillMedName, prefillPatientId, prefillPatientName, prefillPhone, isOpen]);

  // Click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (medDropdownRef.current && !medDropdownRef.current.contains(event.target as Node)) {
        setIsMedDropdownOpen(false);
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

  const handleQuickCreatePatient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPatientName.trim() || !newPatientPhone.trim()) {
      alert('Please enter Patient Name and Phone');
      return;
    }

    const nextId = `P/${Math.floor(100 + Math.random() * 900)}`;
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

  // Medicine Selection from Autocomplete
  const handleSelectMedicine = (m: Medicine) => {
    setMed(m.name);
    setSelectedMedicineItem(m);
    setIsMedDropdownOpen(false);

    // If medicine has distributor or company, try to match
    const medDist = m.dist || m.distributor;
    if (medDist) {
      const matchDist = distributors.find(
        d => d.name.toLowerCase() === medDist.toLowerCase()
      );
      if (matchDist) {
        setDistSelect(matchDist.name);
      } else {
        setDistSelect('CUSTOM');
        setDistCustom(medDist);
      }
    }
  };

  const handleMedInputChange = (val: string) => {
    setMed(val);
    setSelectedMedicineItem(null);
    setIsMedDropdownOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!med.trim()) {
      alert('Please enter medicine name');
      return;
    }

    const finalDist = distSelect === 'CUSTOM' ? distCustom.trim() || 'General Distributor' : distSelect;

    const newOrder: NeededMedOrder = {
      id: 'NM-' + Date.now(),
      patientId: selectedPatientId || undefined,
      med: med.trim(),
      name: patientName.trim() || 'Walk-in Customer',
      phone: phone.trim() || 'N/A',
      dist: finalDist,
      time: time.trim() || 'Tomorrow Afternoon',
      qty: parseInt(qty, 10) || 1,
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

  // Filter existing medicines for autocomplete search
  const filteredMedicines = medicines.filter(m => {
    if (!med.trim()) return false;
    const q = med.toLowerCase().trim();
    return (
      m.name.toLowerCase().includes(q) ||
      (m.generic && m.generic.toLowerCase().includes(q)) ||
      (m.company && m.company.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs text-text animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
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
                placeholder="Type Patient ID (e.g. P/101) or Patient Name..."
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
            ) : patientName ? (
              <div className="text-[11px] text-text-muted flex items-center gap-2">
                <span>Patient: <b>{patientName}</b> ({phone})</span>
              </div>
            ) : null}

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
                    className="px-3 py-1 bg-teal-600 hover:bg-teal-500 text-text font-bold rounded-lg text-[11px]"
                  >
                    Save & Link Patient
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* 2. MEDICINE REQUIRED WITH SEARCH & AUTO-SUGGEST FROM INVENTORY */}
          <div className="space-y-1.5 relative" ref={medDropdownRef}>
            <div className="flex justify-between items-center">
              <label className="font-semibold text-text-muted block">
                Medicine Required <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              {selectedMedicineItem && (
                <span className="text-[10px] bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 px-2 py-0.5 rounded-full font-mono flex items-center gap-1 border border-emerald-500/30">
                  <Check className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Linked from Stock</span>
                </span>
              )}
            </div>

            <div className="relative">
              <Pill className="w-4 h-4 text-text-muted absolute left-3 top-3" />
              <input
                type="text"
                id="input-special-need-med"
                value={med}
                onChange={e => handleMedInputChange(e.target.value)}
                onFocus={() => setIsMedDropdownOpen(true)}
                placeholder="Search stock or type any medicine name..."
                className="w-full pl-9 pr-8 py-2.5 bg-bg border border-border rounded-xl font-bold text-text placeholder:text-text-muted outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 text-xs"
                required
              />
              {med && (
                <button
                  type="button"
                  onClick={() => {
                    setMed('');
                    setSelectedMedicineItem(null);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-text text-xs p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Medicine Autocomplete Suggestions Dropdown */}
            {isMedDropdownOpen && med.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-primary/30 rounded-2xl shadow-2xl max-h-52 overflow-y-auto z-50 divide-y divide-border backdrop-blur-xl">
                {filteredMedicines.length > 0 ? (
                  <>
                    <div className="p-2 bg-primary/10 text-[10px] text-primary font-bold uppercase tracking-wider flex items-center justify-between">
                      <span>Matching Medicines in Stock / System</span>
                      <span>({filteredMedicines.length} found)</span>
                    </div>
                    {filteredMedicines.map(m => (
                      <div
                        key={m.id}
                        onClick={() => handleSelectMedicine(m)}
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
                            MRP: ₹{m.mrp.toFixed(2)}
                          </span>
                        </div>

                        <div className="text-right shrink-0 ml-2">
                          {m.stock > 0 ? (
                            <span className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-[10px] px-2 py-0.5 rounded-md font-mono border border-emerald-500/30 font-bold block">
                              In Stock: {m.stock}
                            </span>
                          ) : (
                            <span className="bg-rose-500/20 text-rose-700 dark:text-rose-300 text-[10px] px-2 py-0.5 rounded-md font-mono border border-rose-500/30 font-bold block">
                              Out of Stock (0)
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="p-3 text-center space-y-1">
                    <p className="text-xs text-amber-700 dark:text-amber-300 font-semibold flex items-center justify-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
                      <span>Not found in current inventory</span>
                    </p>
                    <p className="text-[10px] text-text-muted">
                      "{med}" will be ordered directly from supplier as a special order.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Selected Medicine Info Banner */}
            {selectedMedicineItem && (
              <div className="p-2 rounded-xl bg-primary/15 border border-primary/30 text-[11px] text-primary flex items-center justify-between font-mono">
                <span>
                  <b>Current Stock:</b> {selectedMedicineItem.stock} • <b>MRP:</b> ₹{selectedMedicineItem.mrp.toFixed(2)} • <b>Rack:</b> {selectedMedicineItem.rack || 'N/A'}
                </span>
                <span className="text-[10px] text-text-muted">
                  {selectedMedicineItem.company || ''}
                </span>
              </div>
            )}
          </div>

          {/* 3. DISTRIBUTOR / SUPPLIER */}
          <div>
            <label className="font-semibold text-text-muted block mb-1">
              Procure From Distributor
            </label>
            <div className="flex gap-2">
              <select
                value={distSelect}
                onChange={e => setDistSelect(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary text-xs"
              >
                {distributors.map(d => (
                  <option key={d.id} value={d.name} className="bg-surface text-text">
                    {d.name}
                  </option>
                ))}
                <option value="CUSTOM" className="bg-surface text-primary">
                  -- Type Custom Distributor --
                </option>
              </select>
              {distSelect === 'CUSTOM' && (
                <input
                  type="text"
                  value={distCustom}
                  onChange={e => setDistCustom(e.target.value)}
                  placeholder="Type distributor..."
                  className="w-full p-2.5 bg-primary/10 border border-primary/30 rounded-xl text-text placeholder:text-text-muted outline-none text-xs"
                  required
                />
              )}
            </div>
          </div>

          {/* 4. QUANTITY & COMMITMENT TIME */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-text-muted block mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary text-xs"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-text-muted block mb-1">
                Promise Delivery Time
              </label>
              <input
                type="text"
                value={time}
                onChange={e => setTime(e.target.value)}
                placeholder="e.g. Tomorrow 5 PM"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary text-xs"
                required
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
              <span>Save Special Order</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
