import React, { useEffect, useState } from 'react';
import { Boxes, Save, X } from 'lucide-react';
import { Medicine } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';

interface EditStockModalProps {
  isOpen: boolean;
  medicine: Medicine | null;
  invoiceCurrency?: string;
  onClose: () => void;
  onSave: (updated: Medicine) => void;
}

// Lets staff correct a stock item's own record directly — the fields most
// often wrong after a manual entry typo or a garbled OCR read (see
// InwardOCRTab): name, batch, quantity, and every price field. Distinct
// from AddStockModal (which creates a brand-new item) — this always
// updates the exact record it was opened for, keyed on its existing id, so
// a name correction can never accidentally spawn a duplicate.
export const EditStockModal: React.FC<EditStockModalProps> = ({
  isOpen,
  medicine,
  invoiceCurrency,
  onClose,
  onSave,
}) => {
  const currencySymbol = getCurrencySymbol(invoiceCurrency);
  const [form, setForm] = useState<Medicine | null>(medicine);

  useEffect(() => {
    setForm(medicine);
  }, [medicine]);

  if (!isOpen || !form) return null;

  const set = <K extends keyof Medicine>(key: K, value: Medicine[K]) => {
    setForm(prev => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      alert('Please enter medicine name');
      return;
    }
    onSave({
      ...form,
      name: form.name.trim(),
      stock: Number(form.stock) || 0,
      rate: Number(form.rate) || 0,
      omrp: Number(form.omrp) || 0,
      mrp: Number(form.mrp) || 0,
      gst: Number(form.gst) || 0,
      disc: Number(form.disc) || 0,
      tabsPerStrip: Number(form.tabsPerStrip) || 10,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs text-text max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Boxes className="w-4 h-4" />
            </div>
            <span>Edit Stock Item</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div className="col-span-2">
              <label className="font-medium text-text-muted block mb-1">Medicine Name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => set('name', e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary focus:bg-bg font-bold"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Company / Brand</label>
              <input
                type="text"
                value={form.company}
                onChange={e => set('company', e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Salt Formulation</label>
              <input
                type="text"
                value={form.salt}
                onChange={e => set('salt', e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Batch Number</label>
              <input
                type="text"
                value={form.batch}
                onChange={e => set('batch', e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">HSN Code</label>
              <input
                type="text"
                value={form.hsn}
                onChange={e => set('hsn', e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Rack / Chamber</label>
              <input
                type="text"
                value={form.rack}
                onChange={e => set('rack', e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Pack (e.g. 10*T)</label>
              <input
                type="text"
                value={form.pack}
                onChange={e => set('pack', e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Units per Pack</label>
              <input
                type="number"
                value={form.tabsPerStrip}
                onChange={e => set('tabsPerStrip', Number(e.target.value) as any)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Stock Quantity (Units)</label>
              <input
                type="number"
                step="0.1"
                value={form.stock}
                onChange={e => set('stock', Number(e.target.value) as any)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-text outline-none focus:border-primary focus:bg-bg"
                required
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Purchase / Cost ({currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                value={form.rate}
                onChange={e => set('rate', Number(e.target.value) as any)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
                required
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Old MRP (O.MRP) ({currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                value={form.omrp}
                onChange={e => set('omrp', Number(e.target.value) as any)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Current MRP ({currencySymbol})</label>
              <input
                type="number"
                step="0.01"
                value={form.mrp}
                onChange={e => set('mrp', Number(e.target.value) as any)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-text outline-none focus:border-primary focus:bg-bg"
                required
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">GST / Tax Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={form.gst}
                onChange={e => set('gst', Number(e.target.value) as any)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Discount (%)</label>
              <input
                type="number"
                step="0.01"
                value={form.disc}
                onChange={e => set('disc', Number(e.target.value) as any)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div className="col-span-2">
              <label className="font-medium text-text-muted block mb-1">Expiry Date (YYYY-MM)</label>
              <input
                type="month"
                value={form.expiry}
                onChange={e => set('expiry', e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
                required
              />
            </div>
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
              className="px-5 py-2 bg-primary hover:opacity-90 text-white font-bold rounded-2xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
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
