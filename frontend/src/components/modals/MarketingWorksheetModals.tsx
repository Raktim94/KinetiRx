import React, { useEffect, useState } from 'react';
import { Megaphone, Plus, Wrench, X } from 'lucide-react';
import { MarketingCampaign, WorksheetTask } from '../../types';

interface MarketingModalProps {
  isOpen: boolean;
  onClose: () => void;
  campaignToEdit?: MarketingCampaign | null;
  onSaveCampaign: (campaign: MarketingCampaign) => void;
}

export const MarketingModal: React.FC<MarketingModalProps> = ({
  isOpen,
  onClose,
  campaignToEdit,
  onSaveCampaign,
}) => {
  const [doc, setDoc] = useState('Dr. Sayan Majumdar');
  const [date, setDate] = useState('2026-08-23');
  const [action, setAction] = useState('Handbill distribution & Announcement Miking');
  const [status, setStatus] = useState<MarketingCampaign['status']>('7-Day Alert Active');

  useEffect(() => {
    if (campaignToEdit) {
      setDoc(campaignToEdit.doc);
      setDate(campaignToEdit.date);
      setAction(campaignToEdit.action);
      setStatus(campaignToEdit.status);
    } else {
      setDoc('Dr. Sayan Majumdar');
      setDate('2026-08-23');
      setAction('Handbill distribution & Announcement Miking');
      setStatus('7-Day Alert Active');
    }
  }, [campaignToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!action.trim()) {
      alert('Please enter marketing action plan');
      return;
    }

    const campaign: MarketingCampaign = {
      id: campaignToEdit ? campaignToEdit.id : 'MKT-' + Date.now(),
      doc: doc.trim(),
      date,
      action: action.trim(),
      status,
    };

    onSaveCampaign(campaign);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface/90 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-border text-xs text-text animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Megaphone className="w-4 h-4" />
            </div>
            <span>{campaignToEdit ? 'Edit Marketing Campaign' : 'Doctor Campaign & Marketing Plan'}</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-medium text-text-muted block mb-1">Doctor Name</label>
            <input
              type="text"
              value={doc}
              onChange={e => setDoc(e.target.value)}
              placeholder="e.g. Dr. Sayan Majumdar"
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg font-medium"
              required
            />
          </div>

          <div>
            <label className="font-medium text-text-muted block mb-1">Doctor Visit Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
              required
            />
          </div>

          <div>
            <label className="font-medium text-text-muted block mb-1">Marketing Action Plan</label>
            <input
              type="text"
              value={action}
              onChange={e => setAction(e.target.value)}
              placeholder="e.g. Handbill distribution, mike publicity, local banner"
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              required
            />
          </div>

          <div>
            <label className="font-medium text-text-muted block mb-1">Alert & Progress Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as MarketingCampaign['status'])}
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary font-medium"
            >
              <option value="7-Day Alert Active" className="bg-surface text-text">7-Day Alert Active</option>
              <option value="Upcoming" className="bg-surface text-text">Upcoming</option>
              <option value="Planned" className="bg-surface text-text">Planned</option>
              <option value="Completed" className="bg-surface text-text">Completed</option>
            </select>
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
              className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-text font-bold rounded-2xl shadow-lg shadow-purple-950/40 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save Campaign</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface WorksheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskToEdit?: WorksheetTask | null;
  onSaveTask: (task: WorksheetTask) => void;
}

export const WorksheetModal: React.FC<WorksheetModalProps> = ({
  isOpen,
  onClose,
  taskToEdit,
  onSaveTask,
}) => {
  const [cat, setCat] = useState('Maintenance');
  const [desc, setDesc] = useState('Fan & LED installation in OPD Chamber');
  const [date, setDate] = useState('2026-08-20');
  const [status, setStatus] = useState<WorksheetTask['status']>('Pending');

  useEffect(() => {
    if (taskToEdit) {
      setCat(taskToEdit.cat);
      setDesc(taskToEdit.desc);
      setDate(taskToEdit.date);
      setStatus(taskToEdit.status);
    } else {
      setCat('Maintenance');
      setDesc('Fan & LED installation in OPD Chamber');
      setDate('2026-08-20');
      setStatus('Pending');
    }
  }, [taskToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!desc.trim()) {
      alert('Please enter task description');
      return;
    }

    const task: WorksheetTask = {
      id: taskToEdit ? taskToEdit.id : 'WS-' + Date.now(),
      cat,
      desc: desc.trim(),
      date,
      status,
    };

    onSaveTask(task);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface/90 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-border text-xs text-text animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Wrench className="w-4 h-4" />
            </div>
            <span>{taskToEdit ? 'Edit Maintenance Task' : 'Log Maintenance / Monthly Task'}</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="font-medium text-text-muted block mb-1">Task Category</label>
            <select
              value={cat}
              onChange={e => setCat(e.target.value)}
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary font-medium"
            >
              <option value="Maintenance" className="bg-surface text-text">Maintenance (Fan / Glass / Electric Service)</option>
              <option value="Staff Meeting" className="bg-surface text-text">Staff / Health Worker Meeting</option>
              <option value="Uniform & Staff" className="bg-surface text-text">Uniform & Staff Refreshments</option>
              <option value="Hardware Repairs" className="bg-surface text-text">Hardware Repairs & Printer Service</option>
            </select>
          </div>

          <div>
            <label className="font-medium text-text-muted block mb-1">Task Details</label>
            <input
              type="text"
              value={desc}
              onChange={e => setDesc(e.target.value)}
              placeholder="e.g. Wall fan installation in chamber"
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              required
            />
          </div>

          <div>
            <label className="font-medium text-text-muted block mb-1">Target Date</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text outline-none focus:border-primary focus:bg-bg"
            />
          </div>

          <div>
            <label className="font-medium text-text-muted block mb-1">Status</label>
            <select
              value={status}
              onChange={e => setStatus(e.target.value as WorksheetTask['status'])}
              className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary font-medium"
            >
              <option value="Pending" className="bg-surface text-text">Pending</option>
              <option value="In Progress" className="bg-surface text-text">In Progress</option>
              <option value="Planned" className="bg-surface text-text">Planned</option>
              <option value="Completed" className="bg-surface text-text">Completed</option>
            </select>
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
              className="px-5 py-2 bg-primary hover:bg-primary text-text font-bold rounded-2xl shadow-lg shadow-primary/40 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
