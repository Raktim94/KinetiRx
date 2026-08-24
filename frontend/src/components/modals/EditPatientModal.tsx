import React, { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { PatientRecord } from '../../types';

interface EditPatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientRecord | null;
  onUpdatePatient: (patient: PatientRecord) => void;
}

export const EditPatientModal: React.FC<EditPatientModalProps> = ({
  isOpen,
  onClose,
  patient,
  onUpdatePatient,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [addr, setAddr] = useState('');
  const [docSelect, setDocSelect] = useState('Self Prescribed / OTC');
  const [customDoc, setCustomDoc] = useState('');
  const [reason, setReason] = useState('');

  const knownDoctors = [
    'Self Prescribed / OTC',
    'Dr. Sayan Majumdar (Cardio)',
    'Dr. T.K. Khan (Chest/Pulmo)',
    'Dr. P. Sen (General Phys)',
    'Dr. R. Mishra (Gynae)',
  ];

  useEffect(() => {
    if (patient) {
      setName(patient.name);
      setPhone(patient.phone);
      setAge(patient.age != null ? String(patient.age) : '');
      setGender(patient.gender || 'Male');
      setAddr(patient.addr || patient.address || '');
      const doc = patient.doc || patient.doctor || 'Self Prescribed / OTC';
      if (knownDoctors.includes(doc)) {
        setDocSelect(doc);
        setCustomDoc('');
      } else {
        setDocSelect('CUSTOM');
        setCustomDoc(doc);
      }
      setReason(patient.reason || '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient, isOpen]);

  if (!isOpen || !patient) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Name and mobile number are required.');
      return;
    }
    const finalDoc = docSelect === 'CUSTOM' ? customDoc.trim() || 'Other Doctor' : docSelect;
    const formattedAgeGender = `${age ? age + ' Yrs' : '--'} / ${gender}`;

    onUpdatePatient({
      ...patient,
      name: name.trim(),
      phone: phone.trim(),
      age: age ? parseInt(age, 10) : patient.age,
      gender,
      ageGender: formattedAgeGender,
      addr: addr.trim(),
      address: addr.trim(),
      doc: finalDoc,
      doctor: finalDoc,
      reason: reason.trim(),
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs text-text animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <Save className="w-4 h-4" />
            </div>
            <span>Edit Patient Profile</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="font-semibold text-text-muted block mb-1">Full Name *</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text font-bold outline-none focus:border-primary"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="font-semibold text-text-muted block mb-1">Mobile Number *</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="font-semibold text-text-muted block mb-1">Age</label>
              <input
                type="number"
                value={age}
                onChange={e => setAge(e.target.value)}
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
            <label className="font-semibold text-text-muted block mb-1">Full Address</label>
            <input
              type="text"
              value={addr}
              onChange={e => setAddr(e.target.value)}
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
            />
          </div>

          <div>
            <label className="font-semibold text-text-muted block mb-1">Assigned / Consulting Doctor</label>
            <div className="flex gap-2">
              <select
                value={docSelect}
                onChange={e => setDocSelect(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
              >
                {knownDoctors.map(d => (
                  <option key={d} value={d}>
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

          <div>
            <label className="font-semibold text-text-muted block mb-1">Medical Notes / Reason</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
            />
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
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-text font-bold rounded-xl shadow-lg shadow-sky-950/40 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
