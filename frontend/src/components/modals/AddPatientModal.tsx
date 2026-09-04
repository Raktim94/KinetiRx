import React, { useEffect, useRef, useState } from 'react';
import {
  HeartPulse,
  MapPin,
  Phone,
  Plus,
  Stethoscope,
  User,
  UserPlus,
  X,
} from 'lucide-react';
import { PatientRecord } from '../../types';
import { getTodayISODate } from '../../utils/dateUtils';
import { loadDoctors } from '../../data/doctors';
import { nextPatientIdApi } from '../../lib/api';

interface AddPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSavePatient: (patient: PatientRecord) => void;
  existingPatients: PatientRecord[];
}

export const AddPatientModal: React.FC<AddPatientModalProps> = ({
  isOpen,
  onClose,
  onSavePatient,
  existingPatients,
}) => {
  const doctorList = loadDoctors();

  // Local-only fallback used for the instant initial suggestion and if the
  // server reservation below fails (e.g. offline) — never the value actually
  // submitted once a server-reserved ID has landed, since two terminals
  // scanning their own locally loaded `existingPatients` list can compute
  // the same "next" number and collide on patients.id (see AddPatientModal
  // fix notes / migration 0009_patient_id_sequence).
  const getLocalFallbackId = () => {
    let maxNum = 100;
    existingPatients.forEach(p => {
      const match = p.id.match(/P\/(\d+)/i) || p.id.match(/PAT-(\d+)/i);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > maxNum) maxNum = num;
      }
    });
    return `P/${maxNum + 1}`;
  };

  const [patientId, setPatientId] = useState(getLocalFallbackId());
  // Tracks the last value we auto-filled, so a background server reservation
  // never clobbers an ID the pharmacist has already started editing by hand.
  const autoFilledIdRef = useRef(patientId);

  // Shows a fresh local guess whenever the modal opens — deliberately no
  // server call here. The real, collision-safe ID from patient_id_seq is
  // only reserved once, in handleSubmit, right before a new patient is
  // actually saved. Reserving eagerly on every open (the old behavior)
  // burned a real sequence number even when the modal was opened and then
  // cancelled, which is why the suggested ID kept changing across opens.
  useEffect(() => {
    if (!isOpen) return;
    const fallback = getLocalFallbackId();
    setPatientId(fallback);
    autoFilledIdRef.current = fallback;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [addr, setAddr] = useState('');
  const [docSelect, setDocSelect] = useState('Self Prescribed / OTC');
  const [customDoc, setCustomDoc] = useState('');
  const [reason, setReason] = useState('');
  const [initialDue, setInitialDue] = useState('0');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter patient name');
      return;
    }
    if (!phone.trim()) {
      alert('Please enter patient mobile number');
      return;
    }

    // Field is still on our own unconfirmed guess — reserve the real,
    // collision-safe ID now, right before it's actually persisted.
    let finalId = patientId.trim() || getLocalFallbackId();
    if (patientId === autoFilledIdRef.current) {
      try {
        const { id } = await nextPatientIdApi.reserve();
        finalId = `P/${id}`;
        setPatientId(finalId);
        autoFilledIdRef.current = finalId;
      } catch (err) {
        console.warn('Could not reserve a server-assigned patient ID, using local fallback:', err);
      }
    }

    const finalDoc = docSelect === 'CUSTOM' ? customDoc.trim() || 'Other Doctor' : docSelect;
    const today = getTodayISODate();
    const parsedDue = parseFloat(initialDue) || 0;
    const formattedAgeGender = `${age ? age + ' Yrs' : '--'} / ${gender}`;

    const newPatient: PatientRecord = {
      id: finalId,
      name: name.trim(),
      phone: phone.trim(),
      age: age.trim() ? age.trim() : '35',
      gender,
      ageGender: formattedAgeGender,
      addr: addr.trim() || 'Local Area',
      address: addr.trim() || 'Local Area',
      doc: finalDoc,
      doctor: finalDoc,
      reason: reason.trim() || 'General Consultation / Regular Patient',
      totalDue: parsedDue,
      dueAmount: parsedDue,
      lastDate: today,
      lastVisitDate: today,
      totalVisits: 1,
      purchaseHistory: [],
    };

    onSavePatient(newPatient);
    onClose();

    // Reset form
    setName('');
    setPhone('');
    setAge('');
    setGender('Male');
    setAddr('');
    setReason('');
    setInitialDue('0');
    setDocSelect('Self Prescribed / OTC');
    setCustomDoc('');
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs text-text animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <UserPlus className="w-4 h-4" />
            </div>
            <span>Register New Patient Profile</span>
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-text-muted block mb-1">
                Patient ID
              </label>
              <input
                type="text"
                value={patientId}
                onChange={e => setPatientId(e.target.value)}
                placeholder="P/107"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-primary outline-none focus:border-primary"
                required
              />
            </div>

            <div className="col-span-2">
              <label className="font-semibold text-text-muted block mb-1">
                Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Animesh Maity"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text font-bold placeholder:text-text-muted outline-none focus:border-primary"
                required
                autoFocus
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-text-muted block mb-1">
                Mobile Number *
              </label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="10-digit mobile"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-text-muted block mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
                placeholder="e.g. 48"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-text-muted block mb-1">Gender</label>
              <select
                value={gender}
                onChange={e => setGender(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-text-muted block mb-1">
              Full Address
            </label>
            <input
              type="text"
              value={addr}
              onChange={e => setAddr(e.target.value)}
              placeholder="e.g. 119 Negua, Egara, Purba Medinipur"
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-semibold text-text-muted block mb-1">
              Assigned / Consulting Doctor
            </label>
            <div className="flex gap-2">
              <select
                value={docSelect}
                onChange={e => setDocSelect(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
              >
                <option value="Self Prescribed / OTC">Self Prescribed / OTC</option>
                {doctorList.map((d, idx) => (
                  <option key={idx} value={d}>
                    {d}
                  </option>
                ))}
                <option value="CUSTOM">-- Type Custom Doctor --</option>
              </select>
              {docSelect === 'CUSTOM' && (
                <input
                  type="text"
                  value={customDoc}
                  onChange={e => setCustomDoc(e.target.value)}
                  placeholder="Doctor name..."
                  className="w-full p-2.5 bg-primary/10 border border-primary/30 rounded-xl text-text outline-none"
                  required
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-text-muted block mb-1">
                Medical Notes / Reason
              </label>
              <input
                type="text"
                value={reason}
                onChange={e => setReason(e.target.value)}
                placeholder="e.g. Hypertension / Diabetes"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="font-semibold text-text-muted block mb-1">
                Initial Due Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={initialDue}
                onChange={e => setInitialDue(e.target.value)}
                placeholder="0.00"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-rose-600 dark:text-rose-400 font-bold outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface hover:bg-bg text-text-muted rounded-xl transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-teal-600 hover:bg-teal-500 text-text font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save Patient Profile</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
