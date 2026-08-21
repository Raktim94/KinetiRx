import React, { useState } from 'react';
import { Calendar, DollarSign, Plus, Wallet, X } from 'lucide-react';
import { ExpenseRecord } from '../../types';
import { getTodayISODate } from '../../utils/dateUtils';

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveExpense: (expense: ExpenseRecord) => void;
  defaultDate?: string;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSaveExpense,
  defaultDate,
}) => {
  const today = getTodayISODate();
  const [date, setDate] = useState(defaultDate || today);
  const [cat, setCat] = useState('Sample Transport');
  const [customCat, setCustomCat] = useState('');
  const [desc, setDesc] = useState('');
  const [amt, setAmt] = useState('');
  const [paymentSource, setPaymentSource] = useState<'Cash' | 'PhonePe' | 'Bank'>('Cash');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) {
      alert('Please enter expense description / remarks');
      return;
    }
    const val = parseFloat(amt);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid expense amount');
      return;
    }

    const finalCat = cat === 'CUSTOM' ? customCat.trim() || 'General Expense' : cat;

    const newExpense: ExpenseRecord = {
      id: 'E-' + Date.now(),
      date: date || today,
      cat: finalCat,
      desc: desc.trim(),
      amt: val,
    };

    onSaveExpense(newExpense);
    onClose();
    setDesc('');
    setAmt('');
    setCustomCat('');
    setCat('Sample Transport');
    setPaymentSource('Cash');
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface-elevated backdrop-blur-2xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-border text-xs text-text animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Wallet className="w-4 h-4" />
            </div>
            <span>Log Daily Expenditure</span>
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="font-semibold text-text-muted block mb-1">
                Expense Date
              </label>
              <input
                type="date"
                value={date}
                onChange={e => setDate(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text font-mono outline-none focus:border-orange-400"
                required
              />
            </div>

            <div>
              <label className="font-semibold text-text-muted block mb-1">
                Payment Source
              </label>
              <select
                value={paymentSource}
                onChange={e => setPaymentSource(e.target.value as any)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-orange-400"
              >
                <option value="Cash">Cash from Drawer</option>
                <option value="PhonePe">UPI / Online / PhonePe</option>
                <option value="Bank">Direct Bank Outflow</option>
              </select>
            </div>
          </div>

          <div>
            <label className="font-semibold text-text-muted block mb-1">
              Expense Category
            </label>
            <div className="space-y-2">
              <select
                value={cat}
                onChange={e => setCat(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-orange-400 font-medium"
              >
                <option value="Sample Transport">Sample Transport / Bus Fare</option>
                <option value="Maintenance / Repairs">Maintenance & Repairs</option>
                <option value="Bank Deposit Cash">Bank Deposit / Cash Out</option>
                <option value="Staff Daily Wage">Staff Daily Wage / Salary Advance</option>
                <option value="Tea & Miscellaneous">Tea & Snacks / Refreshments</option>
                <option value="Electricity & Utility">Electricity & Utility Bills</option>
                <option value="Distributor Cash Paid">Distributor Cash Payment</option>
                <option value="CUSTOM">-- Type Custom Category --</option>
              </select>
              {cat === 'CUSTOM' && (
                <input
                  type="text"
                  value={customCat}
                  onChange={e => setCustomCat(e.target.value)}
                  placeholder="Enter category name..."
                  className="w-full p-2.5 bg-orange-500/10 border border-orange-500/30 rounded-xl text-text outline-none"
                  required
                />
              )}
            </div>
          </div>

          <div>
            <label className="font-semibold text-text-muted block mb-1">
              Description / Remarks *
            </label>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="e.g. Transport fare for diagnostic sample delivery to Contai"
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-orange-400 focus:bg-bg"
              required
              autoFocus
            />
          </div>

          <div>
            <label className="font-semibold text-text-muted block mb-1">
              Amount *
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.01"
                value={amt}
                onChange={e => setAmt(e.target.value)}
                placeholder="0.00"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-orange-300 placeholder:text-text-muted outline-none focus:border-orange-400 focus:bg-bg text-base"
                required
              />
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-300 text-[11px]">
            💡 This expenditure will be automatically recorded in the <b>Daily Sales Register</b> and deducted from the Physical Cash Drawer balance.
          </div>

          <div className="flex justify-end gap-2.5 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-text-muted hover:text-text bg-surface hover:bg-bg rounded-xl font-medium transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-orange-600 hover:bg-orange-500 text-text font-bold rounded-xl shadow-lg shadow-orange-950/40 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save & Update Daily Register</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
