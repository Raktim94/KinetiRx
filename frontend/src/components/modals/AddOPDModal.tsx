import React, { useState } from 'react';
import { Plus, Stethoscope, X } from 'lucide-react';
import { OPDVisit } from '../../types';

interface AddOPDModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveOPD: (visit: OPDVisit) => void;
}

export const AddOPDModal: React.FC<AddOPDModalProps> = ({
  isOpen,
  onClose,
  onSaveOPD,
}) => {
  const [name, setName] = useState('');
  const [ageSex, setAgeSex] = useState('52 / Female');
  const [phone, setPhone] = useState('');
  const [doc, setDoc] = useState('Dr. Sayan Majumdar');
  const [vdate, setVdate] = useState('2026-08-17');
  const [rvdate, setRvdate] = useState('2026-08-24');
  const [btest, setBtest] = useState('CBC + Blood Sugar (F/PP)');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter patient name');
      return;
    }

    const newVisit: OPDVisit = {
      id: 'OPD-' + Date.now(),
      name: name.trim(),
      phone: phone.trim() || 'N/A',
      ageSex: ageSex.trim(),
      doc,
      vdate,
      rvdate,
      btest: btest.trim() || 'None',
      reminder: 'Active Alert',
    };

    onSaveOPD(newVisit);
    onClose();
    setName('');
    setPhone('');
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-md w-full p-6 space-y-4 text-xs text-text animate-in zoom-in-95">
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-medium text-text-muted block mb-1">Patient Full Name</label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Kasida Bibi"
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg font-medium"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-medium text-text-muted block mb-1">Age & Sex</label>
              <input
                type="text"
                value={ageSex}
                onChange={e => setAgeSex(e.target.value)}
                placeholder="e.g. 52 / Female"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
            </div>
            <div>
              <label className="font-medium text-text-muted block mb-1">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="Mobile number"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
                required
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-text-muted block mb-1">Assigned Doctor</label>
            <select
              value={doc}
              onChange={e => setDoc(e.target.value)}
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary font-medium"
            >
              <option value="Dr. Sayan Majumdar" className="bg-surface text-text">Dr. Sayan Majumdar</option>
              <option value="Dr. T.K. Khan" className="bg-surface text-text">Dr. T.K. Khan</option>
              <option value="Dr. Subhash Bose" className="bg-surface text-text">Dr. Subhash Bose</option>
            </select>
          </div>

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
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-text font-bold rounded-2xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
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
