import React, { useEffect, useState } from 'react';
import { Plus, Stethoscope, Trash2, X } from 'lucide-react';
import { OPDVisit, PatientRecord } from '../../types';
import { defaultDoctors, loadDoctors, saveDoctors } from '../../data/doctors';
import {
  findPatientById,
  findPatientByPhone,
  getNextSequentialPatientId,
} from '../../utils/patientUtils';

interface AddOPDModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveOPD: (visit: OPDVisit) => void;
  patients?: PatientRecord[];
  onQuickAddPatient?: (patient: PatientRecord) => void;
}

export const AddOPDModal: React.FC<AddOPDModalProps> = ({
  isOpen,
  onClose,
  onSaveOPD,
  patients = [],
  onQuickAddPatient,
}) => {
  const [patientId, setPatientId] = useState(() => getNextSequentialPatientId(patients));
  const [name, setName] = useState('');
  const [ageSex, setAgeSex] = useState('');
  const [phone, setPhone] = useState('');
  const [doctorList, setDoctorList] = useState<string[]>(() => loadDoctors());
  const [isManagingDoctors, setIsManagingDoctors] = useState(false);
  const [newDocInput, setNewDocInput] = useState('');
  const [docSelect, setDocSelect] = useState<string>(() => {
    const list = loadDoctors();
    return list.length > 0 ? list[0] : 'CUSTOM';
  });
  const [customDoc, setCustomDoc] = useState('');
  const [vdate, setVdate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rvdate, setRvdate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [btest, setBtest] = useState('');
  const [matchedPatient, setMatchedPatient] = useState<PatientRecord | null>(null);

  // Sync next sequential patient ID and fresh doctor list whenever the modal opens
  useEffect(() => {
    if (isOpen) {
      const freshDocs = loadDoctors();
      setDoctorList(freshDocs);
      if (!docSelect || (!freshDocs.includes(docSelect) && docSelect !== 'CUSTOM')) {
        setDocSelect(freshDocs.length > 0 ? freshDocs[0] : 'CUSTOM');
      }
      if (!phone.trim() && !matchedPatient) {
        setPatientId(getNextSequentialPatientId(patients));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, patients]);

  if (!isOpen) return null;

  const handleDeleteDoctor = (docToRemove: string) => {
    const updated = doctorList.filter(d => d !== docToRemove);
    setDoctorList(updated);
    saveDoctors(updated);
    if (docSelect === docToRemove) {
      setDocSelect(updated.length > 0 ? updated[0] : 'CUSTOM');
    }
  };

  const handleAddDoctor = (docNameToAdd?: string) => {
    const target = (docNameToAdd || newDocInput).trim();
    if (!target) return;
    if (!doctorList.includes(target)) {
      const updated = [...doctorList, target];
      setDoctorList(updated);
      saveDoctors(updated);
      setDocSelect(target);
      setNewDocInput('');
      setCustomDoc('');
    }
  };

  // Auto-fetch patient info when mobile number changes
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPhone(val);

    const match = findPatientByPhone(val, patients);
    if (match) {
      setMatchedPatient(match);
      setPatientId(match.id || getNextSequentialPatientId(patients));
      setName(match.name || '');
      if (match.age || match.gender) {
        setAgeSex(`${match.age || 45} / ${match.gender || 'Male'}`);
      } else if (match.ageGender) {
        setAgeSex(match.ageGender);
      }
      const d = match.doc || match.doctor;
      if (d) {
        if (doctorList.includes(d)) {
          setDocSelect(d);
          setCustomDoc('');
        } else {
          setDocSelect('CUSTOM');
          setCustomDoc(d);
        }
      }
    } else {
      setMatchedPatient(null);
      // Automatically assign next sequential series ID for new mobile
      setPatientId(getNextSequentialPatientId(patients));
    }
  };

  // Auto-fetch patient info if Patient ID is entered or altered
  const handlePatientIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setPatientId(val);

    const match = findPatientById(val, patients);
    if (match) {
      setMatchedPatient(match);
      setName(match.name || '');
      if (match.phone && match.phone !== 'N/A') setPhone(match.phone);
      if (match.age || match.gender) {
        setAgeSex(`${match.age || 45} / ${match.gender || 'Male'}`);
      } else if (match.ageGender) {
        setAgeSex(match.ageGender);
      }
      const d = match.doc || match.doctor;
      if (d) {
        if (doctorList.includes(d)) {
          setDocSelect(d);
          setCustomDoc('');
        } else {
          setDocSelect('CUSTOM');
          setCustomDoc(d);
        }
      }
    } else {
      setMatchedPatient(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter patient name');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter patient mobile number');
      return;
    }

    const finalDoctor = docSelect === 'CUSTOM' ? (customDoc.trim() || 'Consultant Doctor') : docSelect;
    const finalPatientId = patientId.trim() || getNextSequentialPatientId(patients);

    const newVisit: OPDVisit = {
      id: 'OPD-' + Date.now(),
      patientId: finalPatientId,
      name: name.trim(),
      phone: phone.trim(),
      ageSex: ageSex.trim(),
      doc: finalDoctor,
      vdate,
      rvdate,
      btest: btest.trim() || 'None',
      reminder: '3-4 Days Advance',
    };

    // If this patient isn't already in the master registry, register it
    if (!matchedPatient && onQuickAddPatient) {
      // Only record age/gender if the pharmacist actually entered them —
      // fabricating "45 / Male" for a patient whose age is genuinely unknown
      // would silently record fake demographic data as if it were real.
      const parts = ageSex.trim() ? ageSex.split('/') : [];
      const parsedAgeNum = parts[0] ? parseInt(parts[0], 10) : NaN;
      const parsedAge = !isNaN(parsedAgeNum) ? String(parsedAgeNum) : undefined;
      const parsedGender = parts[1] ? parts[1].trim() : undefined;

      const newPatientRec: PatientRecord = {
        id: finalPatientId,
        name: name.trim(),
        phone: phone.trim(),
        age: parsedAge,
        gender: parsedGender,
        ageGender: ageSex.trim() || undefined,
        addr: 'Local Area',
        address: 'Local Area',
        doc: finalDoctor,
        doctor: finalDoctor,
        reason: `OPD Consultation: ${finalDoctor} (${vdate})`,
        totalDue: 0,
        dueAmount: 0,
        lastDate: vdate,
        lastVisitDate: vdate,
        totalVisits: 1,
      };

      onQuickAddPatient(newPatientRec);
    }

    onSaveOPD(newVisit);
    onClose();
    setName('');
    setPhone('');
    setCustomDoc('');
    setIsManagingDoctors(false);
    setMatchedPatient(null);
    setPatientId(getNextSequentialPatientId(patients));
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs text-text animate-in zoom-in-95 max-h-[92vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Stethoscope className="w-4 h-4" />
            </div>
            <span>Record OPD Patient Consultation</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Row 1: Mobile & Patient ID (Auto-Sequential & Auto-Fetch) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-medium text-text-muted block mb-1">
                Patient Mobile Number *
              </label>
              <input
                type="text"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="10-digit mobile number"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">
                Patient ID <span className="text-text-muted font-normal">(Auto)</span>
              </label>
              <input
                type="text"
                value={patientId}
                onChange={handlePatientIdChange}
                placeholder="1"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-teal-600 dark:text-teal-300 placeholder:text-text-muted outline-none focus:border-teal-400 focus:bg-bg"
                title="Auto-generated sequential Patient ID — always unique across patients"
              />
            </div>
          </div>

          {/* Row 2: Name & Age/Gender */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="font-medium text-text-muted block mb-1">
                Patient Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Kasida Bibi"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg font-medium"
                required
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Age & Sex</label>
              <input
                type="text"
                value={ageSex}
                onChange={e => setAgeSex(e.target.value)}
                placeholder="e.g. 45 / Male"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
            </div>
          </div>

          {/* Row 3: Assigned Doctor with Custom Doctor Support & Remove/Delete Management */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <label className="font-medium text-text-muted block">
                Assigned Doctor *
              </label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsManagingDoctors(prev => !prev)}
                  className={`text-[11px] px-2 py-1 rounded-lg border transition cursor-pointer font-medium flex items-center gap-1 ${
                    isManagingDoctors
                      ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border-rose-500/40 shadow-sm'
                      : 'bg-surface text-text-muted hover:text-text border-border hover:border-text-muted'
                  }`}
                  title="Remove or add doctors in preset list"
                >
                  <Trash2 className="w-3 h-3 text-rose-600 dark:text-rose-400" />
                  <span>{isManagingDoctors ? 'Close Manager' : 'Manage / Remove'}</span>
                </button>

                {docSelect === 'CUSTOM' ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (doctorList.length > 0) {
                        setDocSelect(doctorList[0]);
                        setCustomDoc('');
                      }
                    }}
                    className="text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition cursor-pointer font-medium"
                  >
                    ← List
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setDocSelect('CUSTOM');
                      setCustomDoc('');
                    }}
                    className="text-[11px] text-sky-600 dark:text-sky-400 hover:text-sky-700 dark:hover:text-sky-300 transition cursor-pointer font-medium flex items-center gap-1"
                  >
                    <span>+ Custom</span>
                  </button>
                )}
              </div>
            </div>

            {/* Doctor Management Drawer / Card */}
            {isManagingDoctors && (
              <div className="p-3 bg-bg rounded-2xl border border-rose-500/30 space-y-2.5 shadow-xl animate-in fade-in zoom-in-95">
                <div className="flex items-center justify-between text-[11px] text-text-muted font-semibold border-b border-border pb-1.5">
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-300">
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Click Remove to Delete:</span>
                  </span>
                  <span className="text-[10px] text-text-muted font-normal">
                    {doctorList.length} Doctors
                  </span>
                </div>

                {doctorList.length === 0 ? (
                  <div className="p-3 text-center text-text-muted bg-surface rounded-xl text-[11px]">
                    No doctors saved yet. Add a new doctor below.
                  </div>
                ) : (
                  <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                    {doctorList.map((docItem, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-2 rounded-xl bg-surface border border-border hover:border-text-muted transition"
                      >
                        <span className="font-medium text-text text-[11px] truncate flex-1 pr-2">
                          {docItem}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleDeleteDoctor(docItem)}
                          className="px-2 py-1 bg-rose-500/20 hover:bg-rose-600 border border-rose-500/40 hover:border-rose-600 text-rose-700 dark:text-rose-300 hover:text-white rounded-lg transition text-[11px] font-medium flex items-center gap-1 cursor-pointer"
                          title={`Delete ${docItem} from list`}
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Remove</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new doctor input inside manager */}
                <div className="flex gap-1.5 pt-1.5 border-t border-border">
                  <input
                    type="text"
                    value={newDocInput}
                    onChange={e => setNewDocInput(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddDoctor();
                      }
                    }}
                    placeholder="Type doctor name & degree (e.g. Dr. A. K. Roy, MD)..."
                    className="flex-1 p-2 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted text-[11px] outline-none focus:border-sky-400"
                  />
                  <button
                    type="button"
                    onClick={() => handleAddDoctor()}
                    disabled={!newDocInput.trim()}
                    className="px-3 py-2 bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white rounded-xl font-medium text-[11px] transition cursor-pointer flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>+ Add</span>
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <select
                value={docSelect}
                onChange={e => {
                  setDocSelect(e.target.value);
                  if (e.target.value !== 'CUSTOM') {
                    setCustomDoc('');
                  }
                }}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary font-medium cursor-pointer"
              >
                {doctorList.map((d, idx) => (
                  <option key={idx} value={d} className="bg-surface text-text">
                    {d}
                  </option>
                ))}
                {doctorList.length === 0 && (
                  <option disabled value="">
                    (No doctors yet — type a custom doctor below)
                  </option>
                )}
                <option value="CUSTOM" className="bg-surface text-text">
                  + Type Custom Doctor
                </option>
              </select>

              {docSelect === 'CUSTOM' && (
                <div className="space-y-1.5">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={customDoc}
                      onChange={e => setCustomDoc(e.target.value)}
                      placeholder="Enter doctor's full name & degree (e.g. Dr. A. K. Roy, MBBS, MD)"
                      className="flex-1 p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl text-text placeholder:text-text-muted outline-none focus:border-sky-400 font-medium"
                      required
                      autoFocus
                    />
                    {customDoc.trim() && (
                      <button
                        type="button"
                        onClick={() => handleAddDoctor(customDoc.trim())}
                        className="px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 hover:text-white rounded-xl text-[11px] font-medium transition cursor-pointer whitespace-nowrap flex items-center gap-1"
                        title="Save this doctor permanently to list"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Save to List</span>
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-sky-700/80 dark:text-sky-300/80 pl-1">
                    ✓ This custom doctor's name will be saved to the OPD register, prescriptions, and SMS reminders.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Consultation Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-text-muted block mb-1">Visit Date</label>
              <input
                type="date"
                value={vdate}
                onChange={e => setVdate(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
                required
              />
            </div>
            <div>
              <label className="font-medium text-text-muted block mb-1">Next Re-visit Date</label>
              <input
                type="date"
                value={rvdate}
                onChange={e => setRvdate(e.target.value)}
                className="w-full p-2.5 bg-sky-500/10 border border-sky-500/30 rounded-xl font-mono font-bold text-sky-700 dark:text-sky-300 outline-none focus:border-primary"
                required
              />
            </div>
          </div>

          {/* Row 5: Tests Advised */}
          <div>
            <label className="font-medium text-text-muted block mb-1">Blood / Lab Tests Advised</label>
            <input
              type="text"
              value={btest}
              onChange={e => setBtest(e.target.value)}
              placeholder="e.g. CBC, Sugar Fasting/PP, Lipid Profile"
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-muted hover:text-text bg-surface hover:bg-bg rounded-2xl font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-2xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save OPD Patient</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
