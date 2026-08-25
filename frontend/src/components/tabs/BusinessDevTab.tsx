import React from 'react';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit3,
  Megaphone,
  Plus,
  Stethoscope,
  Wrench,
} from 'lucide-react';
import { MarketingCampaign, WorksheetTask } from '../../types';

interface BusinessDevTabProps {
  marketingCampaigns: MarketingCampaign[];
  worksheetTasks: WorksheetTask[];
  onOpenMarketingModal: (campaign?: MarketingCampaign) => void;
  onOpenWorksheetModal: (task?: WorksheetTask) => void;
}

export const BusinessDevTab: React.FC<BusinessDevTabProps> = ({
  marketingCampaigns,
  worksheetTasks,
  onOpenMarketingModal,
  onOpenWorksheetModal,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* DOCTOR CAMPAIGN & MARKETING CARD */}
        <div className="p-6 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl space-y-5 text-xs text-text">
          <div className="flex justify-between items-center border-b border-border pb-3 flex-wrap gap-2">
            <div>
              <h4 className="font-bold text-text text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                  <Megaphone className="w-4 h-4" />
                </div>
                <span>Doctor Campaign & Marketing</span>
              </h4>
              <p className="text-text-muted text-xs mt-1">
                Publicity, miking and leafleting schedule (7 Days Advance Alert)
              </p>
            </div>
            <button
              onClick={() => onOpenMarketingModal()}
              className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-text font-bold rounded-2xl shadow-lg transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Campaign
            </button>
          </div>

          <div id="marketing-campaign-list" className="space-y-3">
            {marketingCampaigns.length === 0 ? (
              <p className="text-center py-6 text-text-muted">No active marketing campaigns.</p>
            ) : (
              marketingCampaigns.map(m => (
                <div
                  key={m.id}
                  className="p-4 bg-surface border border-border rounded-2xl flex justify-between items-start backdrop-blur-md"
                >
                  <div className="space-y-1.5">
                    <h5 className="font-bold text-text flex items-center gap-1.5 text-xs">
                      <Stethoscope className="w-3.5 h-3.5 text-purple-400" />
                      {m.doc}
                    </h5>
                    <p className="text-text-muted text-xs leading-relaxed">{m.action}</p>
                    <span className="text-[10px] text-purple-300 font-mono font-semibold flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-purple-400" /> Visit Date: {m.date}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        m.status === '7-Day Alert Active'
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                          : m.status === 'Completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-surface-elevated text-text border border-border'
                      }`}
                    >
                      {m.status}
                    </span>
                    <button
                      onClick={() => onOpenMarketingModal(m)}
                      className="text-xs text-primary font-semibold hover:text-text flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* MONTHLY TASKS & MAINTENANCE WORKSHEET */}
        <div className="p-6 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl space-y-5 text-xs text-text">
          <div className="flex justify-between items-center border-b border-border pb-3 flex-wrap gap-2">
            <div>
              <h4 className="font-bold text-text text-sm flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                  <Wrench className="w-4 h-4" />
                </div>
                <span>Monthly Tasks & Maintenance</span>
              </h4>
              <p className="text-text-muted text-xs mt-1">
                Hardware repairs, PC service, staff meetings, equipment checks
              </p>
            </div>
            <button
              onClick={() => onOpenWorksheetModal()}
              className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/30 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> + Add Task
            </button>
          </div>

          <div id="worksheet-task-list" className="space-y-3">
            {worksheetTasks.length === 0 ? (
              <p className="text-center py-6 text-text-muted">No maintenance tasks logged.</p>
            ) : (
              worksheetTasks.map(w => (
                <div
                  key={w.id}
                  className="p-4 bg-surface border border-border rounded-2xl flex justify-between items-start backdrop-blur-md"
                >
                  <div className="space-y-1.5">
                    <span className="bg-surface-elevated text-text-muted border border-border px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider">
                      {w.cat}
                    </span>
                    <h5 className="font-bold text-text mt-1 text-xs">{w.desc}</h5>
                    <span className="text-[10px] text-text-muted font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-text-muted" /> Target: {w.date || 'Monthly Continuous'}
                    </span>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0 ml-3">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        w.status === 'Completed'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : w.status === 'In Progress'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-surface-elevated text-text border border-border'
                      }`}
                    >
                      {w.status}
                    </span>
                    <button
                      onClick={() => onOpenWorksheetModal(w)}
                      className="text-xs text-primary font-semibold hover:text-text flex items-center gap-1 transition cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" /> Edit
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
