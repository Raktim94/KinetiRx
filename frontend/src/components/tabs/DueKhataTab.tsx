import React, { useState } from 'react';
import {
  CreditCard,
  Download,
  HandCoins,
  MessageCircle,
  Phone,
  Search,
  User,
} from 'lucide-react';
import { PatientRecord } from '../../types';
import { exportToCSV, formatWhatsAppPhone } from '../../utils/exportCsv';

interface DueKhataTabProps {
  patientsDue: PatientRecord[];
  setPatientsDue: React.Dispatch<React.SetStateAction<PatientRecord[]>>;
  shopName: string;
  shopPhone: string;
}

export const DueKhataTab: React.FC<DueKhataTabProps> = ({
  patientsDue,
  setPatientsDue,
  shopName,
  shopPhone,
}) => {
  const [search, setSearch] = useState('');

  const filtered = patientsDue.filter(
    p =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase()) ||
      p.phone.includes(search)
  );

  const totalDueSum = patientsDue.reduce((sum, p) => sum + p.totalDue, 0);

  const handleSendWhatsAppReminder = (p: PatientRecord) => {
    const formatted = formatWhatsAppPhone(p.phone);
    if (!formatted || formatted.length < 10) {
      alert(`Invalid phone number for ${p.name}`);
      return;
    }
    const msg = `Dear ${p.name},\nThis is a gentle payment reminder from ${shopName} that your pending account due balance is ₹${p.totalDue.toFixed(2)} (Ref: ${p.id}).\nKindly clear your dues at your convenience.\nHelpline: ${shopPhone}\nThank you!`;
    const url = `https://api.whatsapp.com/send?phone=${formatted}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleCollectDue = (patientId: string) => {
    const p = patientsDue.find(item => item.id === patientId);
    if (!p) return;

    const collectedInput = prompt(
      `Collect due payment for ${p.name} (Current Outstanding: ₹${p.totalDue.toFixed(2)}):`,
      p.totalDue.toString()
    );

    if (collectedInput !== null) {
      const amount = parseFloat(collectedInput);
      if (!isNaN(amount) && amount > 0) {
        setPatientsDue(prev =>
          prev
            .map(item => {
              if (item.id === patientId) {
                const newDue = Math.max(0, item.totalDue - amount);
                return { ...item, totalDue: newDue, lastDate: '2026-08-17' };
              }
              return item;
            })
            .filter(item => item.totalDue > 0)
        );
        alert(`Collected ₹${amount.toFixed(2)} from ${p.name}. Balance updated!`);
      }
    }
  };

  const handleExportCSV = () => {
    exportToCSV(
      'patient_due_register',
      ['Patient ID', 'Patient Name', 'Phone', 'Address', 'Doctor Reference', 'Reason', 'Last Date', 'Total Due (INR)'],
      patientsDue.map(p => [
        p.id,
        p.name,
        p.phone,
        p.addr || '',
        p.doc || '',
        p.reason,
        p.lastDate,
        p.totalDue.toFixed(2),
      ])
    );
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="p-6 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl flex justify-between items-center flex-wrap gap-4 text-text">
        <div>
          <h3 className="text-base font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <CreditCard className="w-4 h-4" />
            </div>
            <span>Patient Due Register</span>
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Track customer credit balances, send instant WhatsApp reminders, and collect settlements.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="bg-rose-500/20 border border-rose-500/30 px-3.5 py-2 rounded-2xl text-xs font-bold text-rose-300 backdrop-blur-md">
            Total Outstanding: <span className="font-mono text-sm text-rose-200">₹ {totalDueSum.toFixed(2)}</span>
          </div>

          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-text font-bold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-3" />
            <input
              type="text"
              id="due-search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name, ID, phone..."
              className="pl-9 pr-3 py-2 bg-surface border border-border rounded-2xl text-xs w-56 text-text placeholder:text-text-muted outline-none focus:border-primary backdrop-blur-md"
            />
          </div>
        </div>
      </div>

      {/* Due table */}
      <div className="bg-surface backdrop-blur-xl border border-border rounded-3xl shadow-xl overflow-hidden text-xs text-text">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-elevated border-b border-border text-[11px] font-semibold text-text-muted uppercase backdrop-blur-md">
              <tr>
                <th className="p-3.5">Patient Name & ID</th>
                <th className="p-3.5">Phone & Address</th>
                <th className="p-3.5">Doctor / Reference</th>
                <th className="p-3.5">Reason For Due</th>
                <th className="p-3.5">Last Transaction</th>
                <th className="p-3.5 text-rose-400 font-bold">Total Due (₹)</th>
                <th className="p-3.5 text-center">Fast Actions</th>
              </tr>
            </thead>
            <tbody id="due-khata-rows" className="divide-y divide-border text-text">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-muted">
                    No pending due records found.
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-surface transition">
                    <td className="p-3.5">
                      <span className="font-bold text-text block">{p.name}</span>
                      <span className="text-[10px] text-primary font-mono font-bold">{p.id}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="font-mono block text-text-muted font-semibold">{p.phone}</span>
                      <span className="text-[10px] text-text-muted">{p.addr || 'Local Area'}</span>
                    </td>
                    <td className="p-3.5 text-text-muted font-medium">{p.doc || 'Self Prescribed'}</td>
                    <td className="p-3.5 text-text-muted">{p.reason}</td>
                    <td className="p-3.5 text-text-muted font-mono">{p.lastDate}</td>
                    <td className="p-3.5 font-extrabold text-rose-400 font-mono text-sm">
                      ₹ {p.totalDue.toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleSendWhatsAppReminder(p)}
                          className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition backdrop-blur-sm cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" /> Remind
                        </button>
                        <button
                          onClick={() => handleCollectDue(p.id)}
                          className="bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition backdrop-blur-sm cursor-pointer"
                        >
                          <HandCoins className="w-3.5 h-3.5" /> Collect
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
