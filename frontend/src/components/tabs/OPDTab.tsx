import React from 'react';
import {
  Calendar,
  Download,
  PhoneCall,
  Plus,
  Send,
  Stethoscope,
  TestTube2,
  UserCheck,
} from 'lucide-react';
import { OPDVisit } from '../../types';
import { exportToCSV } from '../../utils/exportCsv';

interface OPDTabProps {
  opdVisits: OPDVisit[];
  onOpenAddOPDModal: () => void;
  shopName: string;
  shopPhone: string;
}

export const OPDTab: React.FC<OPDTabProps> = ({
  opdVisits,
  onOpenAddOPDModal,
  shopName,
  shopPhone,
}) => {
  const handleDirectSMS = (o: OPDVisit) => {
    const msg = `Dear ${o.name}, your follow-up doctor appointment with ${o.doc} at ${shopName} is scheduled for: ${o.rvdate}. Contact: ${shopPhone}`;
    const smsUrl = `sms:${o.phone}?body=${encodeURIComponent(msg)}`;
    window.location.href = smsUrl;
  };

  const handleExportCSV = () => {
    exportToCSV(
      'opd_revisit_register',
      ['Patient Name', 'Phone', 'Age & Sex', 'Assigned Doctor', 'Visit Date', 'Next Re-visit Date', 'Blood / Lab Tests Advised', 'Status Alert'],
      opdVisits.map(o => [
        o.name,
        o.phone,
        o.ageSex,
        o.doc,
        o.vdate,
        o.rvdate,
        o.btest,
        o.reminder,
      ])
    );
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl flex justify-between items-center flex-wrap gap-4 text-text">
        <div>
          <h3 className="text-base font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Stethoscope className="w-4 h-4" />
            </div>
            <span>OPD & Lab Clinical Re-visit Register</span>
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Doctor consultation logs and automatic 3-4 days advance follow-up revisit reminders with direct SMS & Call triggers.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="bg-emerald-600 hover:bg-emerald-500 text-text font-bold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <button
            id="btn-add-opd-patient"
            onClick={onOpenAddOPDModal}
            className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-primary/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add OPD Patient</span>
          </button>
        </div>
      </div>

      <div className="bg-surface backdrop-blur-xl border border-border rounded-3xl shadow-xl overflow-hidden text-xs text-text">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-elevated border-b border-border text-[11px] font-semibold text-text-muted uppercase backdrop-blur-md">
              <tr>
                <th className="p-3.5">Patient Details</th>
                <th className="p-3.5">Doctor Assigned</th>
                <th className="p-3.5">Visit Date</th>
                <th className="p-3.5 text-primary font-bold">Next Re-Visit Date</th>
                <th className="p-3.5 text-rose-400 font-bold">Tests Advised</th>
                <th className="p-3.5">Alert Status</th>
                <th className="p-3.5 text-center">SMS & Phone Call</th>
              </tr>
            </thead>
            <tbody id="opd-table-rows" className="divide-y divide-border text-text">
              {opdVisits.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-text-muted">
                    No OPD consultation visits recorded.
                  </td>
                </tr>
              ) : (
                opdVisits.map(o => (
                  <tr key={o.id} className="hover:bg-surface transition">
                    <td className="p-3.5">
                      <span className="font-bold text-text block">{o.name}</span>
                      <span className="text-[10px] text-text-muted font-mono">
                        {o.ageSex} • {o.phone}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-text flex items-center gap-1.5 mt-1">
                      <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                      <span>{o.doc}</span>
                    </td>
                    <td className="p-3.5 font-mono text-text-muted">{o.vdate}</td>
                    <td className="p-3.5 font-bold text-primary font-mono">
                      {o.rvdate || 'N/A'}
                    </td>
                    <td className="p-3.5 text-rose-300 font-semibold flex items-center gap-1 mt-1">
                      <TestTube2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>{o.btest}</span>
                    </td>
                    <td className="p-3.5">
                      <span className="bg-primary/20 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                        3-4 Days Advance
                      </span>
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDirectSMS(o)}
                          className="px-3 py-1.5 bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition backdrop-blur-sm cursor-pointer"
                        >
                          <Send className="w-3 h-3" /> Auto SMS
                        </button>
                        <a
                          href={`tel:${o.phone}`}
                          className="px-3 py-1.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-semibold flex items-center gap-1 transition backdrop-blur-sm"
                        >
                          <PhoneCall className="w-3 h-3" /> Call
                        </a>
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
