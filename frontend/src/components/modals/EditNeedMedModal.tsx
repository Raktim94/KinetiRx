import React, { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';
import { Distributor, NeededMedOrder } from '../../types';

interface EditNeedMedModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: NeededMedOrder | null;
  distributors: Distributor[];
  onUpdateNeedMed: (order: NeededMedOrder) => void;
}

const STATUS_OPTIONS: NeededMedOrder['status'][] = [
  'Pending',
  'Distributor Ordered',
  'Processing',
  'Delivered',
  'Cancelled',
];

export const EditNeedMedModal: React.FC<EditNeedMedModalProps> = ({
  isOpen,
  onClose,
  order,
  distributors,
  onUpdateNeedMed,
}) => {
  const [med, setMed] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [dist, setDist] = useState('');
  const [qty, setQty] = useState('1');
  const [status, setStatus] = useState<NeededMedOrder['status']>('Pending');

  useEffect(() => {
    if (order) {
      setMed(order.med);
      setName(order.name);
      setPhone(order.phone);
      setDist(order.dist);
      setQty(String(order.qty));
      setStatus(order.status);
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!med.trim()) {
      alert('Please enter the medicine name.');
      return;
    }
    onUpdateNeedMed({
      ...order,
      med: med.trim(),
      name: name.trim() || 'Walk-in Customer',
      phone: phone.trim() || 'N/A',
      dist: dist.trim() || 'Unassigned',
      qty: Math.max(1, Number(qty) || 1),
      status,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-md w-full p-6 space-y-4 text-xs text-text animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <Save className="w-4 h-4" />
            </div>
            <span>Edit Medicine Order</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="font-semibold text-text-muted block mb-1">Medicine Name *</label>
            <input
              type="text"
              value={med}
              onChange={e => setMed(e.target.value)}
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text font-bold outline-none focus:border-primary"
              required
              autoFocus
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-text-muted block mb-1">Patient / Customer</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="font-semibold text-text-muted block mb-1">Phone</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-text-muted block mb-1">Distributor</label>
              <select
                value={dist}
                onChange={e => setDist(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
              >
                <option value="">Unassigned</option>
                {distributors.map(d => (
                  <option key={d.id} value={d.name}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="font-semibold text-text-muted block mb-1">Quantity</label>
              <input
                type="number"
                min={1}
                value={qty}
                onChange={e => setQty(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary"
              />
            </div>
          </div>

          <div>
            <label className="font-semibold text-text-muted block mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as NeededMedOrder['status'])}
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
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
              className="px-5 py-2 bg-sky-600 hover:bg-sky-500 text-text font-bold rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
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
