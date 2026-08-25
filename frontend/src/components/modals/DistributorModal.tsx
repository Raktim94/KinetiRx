import React, { useState } from 'react';
import {
  Building2,
  Calendar,
  Check,
  Edit3,
  FileSpreadsheet,
  Filter,
  Mail,
  MapPin,
  Phone,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  Truck,
  User,
  X,
} from 'lucide-react';
import { Distributor } from '../../types';
import { exportToCSV } from '../../utils/exportCsv';
import { getTodayISODate } from '../../utils/dateUtils';

interface DistributorModalProps {
  isOpen: boolean;
  onClose: () => void;
  distributors: Distributor[];
  setDistributors: React.Dispatch<React.SetStateAction<Distributor[]>>;
}

export const DistributorModal: React.FC<DistributorModalProps> = ({
  isOpen,
  onClose,
  distributors,
  setDistributors,
}) => {
  const [name, setName] = useState('');
  const [gstin, setGstin] = useState('');
  const [phone, setPhone] = useState('');
  const [addr, setAddr] = useState('');
  const [dlNo, setDlNo] = useState('');
  const [email, setEmail] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [showExtraFields, setShowExtraFields] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [sourceFilter, setSourceFilter] = useState<'all' | 'ocr' | 'manual'>('all');
  const [selectedDistributor, setSelectedDistributor] = useState<Distributor | null>(null);
  const [editingDistributor, setEditingDistributor] = useState<Distributor | null>(null);

  if (!isOpen) return null;

  const handleAddDistributor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newDist: Distributor = {
      id: 'DIST-' + Date.now(),
      name: name.trim().toUpperCase(),
      gstin: gstin.trim() || 'N/A',
      phone: phone.trim() || 'N/A',
      addr: addr.trim() || 'N/A',
      dlNo: dlNo.trim() || undefined,
      email: email.trim() || undefined,
      contactPerson: contactPerson.trim() || undefined,
      registeredDate: getTodayISODate(),
      source: 'Manual Registration',
    };

    setDistributors(prev => [newDist, ...prev]);
    setName('');
    setGstin('');
    setPhone('');
    setAddr('');
    setDlNo('');
    setEmail('');
    setContactPerson('');
    setShowExtraFields(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDistributor || !editingDistributor.name.trim()) return;

    setDistributors(prev =>
      prev.map(d =>
        d.id === editingDistributor.id
          ? {
              ...editingDistributor,
              name: editingDistributor.name.trim().toUpperCase(),
            }
          : d
      )
    );
    setEditingDistributor(null);
  };

  const handleRemove = (id: string, distName: string) => {
    if (confirm(`Remove distributor "${distName}" from directory?`)) {
      setDistributors(prev => prev.filter(d => d.id !== id));
      if (selectedDistributor?.id === id) setSelectedDistributor(null);
    }
  };

  const handleClearAllDistributors = () => {
    if (distributors.length === 0) return;
    if (
      confirm(
        `Are you sure you want to delete ALL ${distributors.length} distributors? This will completely reset the distributor directory.`
      )
    ) {
      setDistributors([]);
      setSelectedDistributor(null);
    }
  };

  const handleExportCSV = () => {
    if (distributors.length === 0) return;
    const headers = [
      'Distributor Name',
      'GSTIN',
      'Phone Number',
      'Address',
      'Drug License (DL No)',
      'Email',
      'Contact Person',
      'Source',
      'Registration Date',
    ];
    const rows = distributors.map(d => [
      d.name,
      d.gstin,
      d.phone,
      d.addr,
      d.dlNo || 'N/A',
      d.email || 'N/A',
      d.contactPerson || 'N/A',
      d.source || 'Registered Distributor',
      d.registeredDate || 'N/A',
    ]);
    exportToCSV(`Distributor_Master_Directory_${getTodayISODate()}`, headers, rows);
  };

  // Filtered distributors
  const filteredDistributors = distributors.filter(d => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      !term ||
      d.name.toLowerCase().includes(term) ||
      d.phone.toLowerCase().includes(term) ||
      d.gstin.toLowerCase().includes(term) ||
      d.addr.toLowerCase().includes(term) ||
      (d.dlNo && d.dlNo.toLowerCase().includes(term)) ||
      (d.contactPerson && d.contactPerson.toLowerCase().includes(term));

    const matchesSource =
      sourceFilter === 'all' ||
      (sourceFilter === 'ocr' && d.source === 'OCR Purchase Bill') ||
      (sourceFilter === 'manual' && d.source !== 'OCR Purchase Bill');

    return matchesSearch && matchesSource;
  });

  const ocrCount = distributors.filter(d => d.source === 'OCR Purchase Bill').length;
  const manualCount = distributors.length - ocrCount;

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 animate-in fade-in">
      <div className="glass-panel rounded-3xl max-w-4xl w-full p-5 sm:p-6 space-y-4 text-xs text-text max-h-[90vh] flex flex-col justify-between animate-in zoom-in-95">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-primary/12 border border-primary/30 flex items-center justify-center text-primary shadow-inner">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-text flex items-center gap-2">
                <span>Manage Distributors & Suppliers Directory</span>
                <span className="text-[11px] font-mono font-semibold bg-primary/20 border border-primary/30 text-primary px-2.5 py-0.5 rounded-full">
                  {distributors.length} Registered
                </span>
              </h3>
              <p className="text-[11px] text-text-muted">
                Unified master list of pharma dealers, wholesale agencies, and auto-registered OCR suppliers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {distributors.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="p-2 rounded-xl bg-surface hover:bg-bg text-text-muted hover:text-text border border-border transition cursor-pointer"
                  title="Export Distributors CSV"
                >
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                </button>
                <button
                  type="button"
                  onClick={handleClearAllDistributors}
                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-200 border border-rose-500/20 transition cursor-pointer"
                  title="Clear All Distributors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-text-muted hover:text-text hover:bg-bg transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Quick Add Form */}
        <form
          onSubmit={handleAddDistributor}
          className="bg-surface p-4 rounded-2xl border border-border space-y-3 backdrop-blur-md"
        >
          <div className="flex justify-between items-center">
            <p className="font-bold text-primary text-xs flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-primary" />
              <span>Register New Supplier / Distributor:</span>
            </p>
            <button
              type="button"
              onClick={() => setShowExtraFields(!showExtraFields)}
              className="text-[11px] text-text-muted hover:text-primary underline cursor-pointer"
            >
              {showExtraFields ? '- Hide optional fields' : '+ Add DL No, Email, Contact Person'}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5">
            <div>
              <label className="text-[10px] text-text-muted font-semibold block mb-0.5">Agency / Distributor Name *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. BLAIR REMEDIES PVT. LTD."
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary"
                required
              />
            </div>

            <div>
              <label className="text-[10px] text-text-muted font-semibold block mb-0.5">GSTIN Number</label>
              <input
                type="text"
                value={gstin}
                onChange={e => setGstin(e.target.value)}
                placeholder="19BUOPM8157K1ZP"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted font-mono outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[10px] text-text-muted font-semibold block mb-0.5">Phone Number</label>
              <input
                type="text"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="+91 9876543210"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted font-mono outline-none focus:border-primary"
              />
            </div>

            <div>
              <label className="text-[10px] text-text-muted font-semibold block mb-0.5">City / Depot Address</label>
              <input
                type="text"
                value={addr}
                onChange={e => setAddr(e.target.value)}
                placeholder="Purba Medinipur / Kolkata"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary"
              />
            </div>

            {showExtraFields && (
              <>
                <div>
                  <label className="text-[10px] text-text-muted font-semibold block mb-0.5">Drug License (DL No)</label>
                  <input
                    type="text"
                    value={dlNo}
                    onChange={e => setDlNo(e.target.value)}
                    placeholder="DL-WB-2024-8899"
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted font-mono outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-text-muted font-semibold block mb-0.5">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="sales@distributor.com"
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="text-[10px] text-text-muted font-semibold block mb-0.5">Contact Person / Area Manager</label>
                  <input
                    type="text"
                    value={contactPerson}
                    onChange={e => setContactPerson(e.target.value)}
                    placeholder="e.g. Rajesh Ghosh (Area Officer)"
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary"
                  />
                </div>
              </>
            )}
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="btn-primary btn-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Save to Master Directory</span>
            </button>
          </div>
        </form>

        {/* Filter and Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by distributor name, phone, GSTIN, address, or DL No..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-surface border border-border rounded-xl text-xs text-text placeholder:text-text-muted outline-none focus:border-primary"
            />
          </div>

          <div className="flex items-center gap-1.5 bg-surface p-1 rounded-xl border border-border text-xs shrink-0">
            <button
              type="button"
              onClick={() => setSourceFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                sourceFilter === 'all' ? 'bg-border text-text font-bold' : 'text-text-muted hover:text-text'
              }`}
            >
              All ({distributors.length})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('ocr')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                sourceFilter === 'ocr' ? 'bg-amber-600 text-text font-bold' : 'text-amber-400 hover:text-text'
              }`}
            >
              Auto OCR ({ocrCount})
            </button>
            <button
              type="button"
              onClick={() => setSourceFilter('manual')}
              className={`px-2.5 py-1 rounded-lg transition cursor-pointer ${
                sourceFilter === 'manual' ? 'bg-primary text-primary-foreground font-bold' : 'text-primary hover:text-text'
              }`}
            >
              Manual ({manualCount})
            </button>
          </div>
        </div>

        {/* List table */}
        <div className="flex-1 overflow-y-auto border border-border rounded-2xl bg-surface backdrop-blur-md min-h-[220px]">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-bg font-semibold text-text-muted border-b border-border sticky top-0 text-[11px] uppercase">
              <tr>
                <th className="p-3">Distributor / Agency</th>
                <th className="p-3">GSTIN</th>
                <th className="p-3">Phone & Contact</th>
                <th className="p-3">Address & Region</th>
                <th className="p-3">Registration Source</th>
                <th className="p-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-text">
              {filteredDistributors.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
                    <Truck className="w-8 h-8 mx-auto text-text-muted mb-2 opacity-60" />
                    <p className="font-semibold text-text-muted">No distributors found</p>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      Distributors auto-register when purchase bills are uploaded via OCR, or you can register them above.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredDistributors.map(d => (
                  <tr key={d.id} className="hover:bg-surface transition group">
                    <td className="p-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold shrink-0">
                          {d.name.charAt(0)}
                        </div>
                        <div>
                          <span className="font-bold text-text block">{d.name}</span>
                          {d.contactPerson && (
                            <span className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                              <User className="w-2.5 h-2.5 text-primary" />
                              <span>{d.contactPerson}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="p-3 font-mono">
                      <span className="text-primary font-bold block">{d.gstin}</span>
                      {d.dlNo && (
                        <span className="text-[10px] text-text-muted block font-sans">
                          DL: <span className="font-mono text-text-muted">{d.dlNo}</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3">
                      <span className="font-mono text-text block">{d.phone}</span>
                      {d.email && (
                        <span className="text-[10px] text-text-muted flex items-center gap-1 mt-0.5">
                          <Mail className="w-2.5 h-2.5 text-text-muted" />
                          <span>{d.email}</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-text-muted max-w-[200px] truncate" title={d.addr}>
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-text-muted shrink-0" />
                        <span className="truncate">{d.addr}</span>
                      </span>
                    </td>

                    <td className="p-3">
                      {d.source === 'OCR Purchase Bill' ? (
                        <span className="inline-flex items-center gap-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                          <Sparkles className="w-2.5 h-2.5" />
                          <span>Auto OCR Scan</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-[10px] font-medium">
                          <Check className="w-2.5 h-2.5" />
                          <span>Manual Entry</span>
                        </span>
                      )}
                    </td>

                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          type="button"
                          onClick={() => setEditingDistributor(d)}
                          className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg transition cursor-pointer"
                          title="Edit distributor details"
                        >
                          <Edit3 className="w-3.5 h-3.5 text-primary" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemove(d.id, d.name)}
                          className="text-rose-400 hover:text-rose-200 p-1.5 hover:bg-rose-500/20 rounded-lg transition cursor-pointer"
                          title="Remove from directory"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex justify-between items-center pt-3 border-t border-border text-text-muted text-xs">
          <span>Showing {filteredDistributors.length} of {distributors.length} distributors</span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-bg hover:bg-border text-text font-semibold rounded-2xl transition cursor-pointer"
          >
            Close Directory
          </button>
        </div>
      </div>

      {/* Edit Distributor Sub-Modal */}
      {editingDistributor && (
        <div className="fixed inset-0 bg-[var(--color-overlay)] z-60 flex items-center justify-center p-4">
          <div className="bg-surface rounded-3xl max-w-md w-full p-6 space-y-4 border border-border text-xs shadow-2xl">
            <div className="flex justify-between items-center border-b border-border pb-3">
              <h4 className="text-sm font-bold text-text flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-primary" />
                <span>Edit Distributor Details</span>
              </h4>
              <button
                onClick={() => setEditingDistributor(null)}
                className="text-text-muted hover:text-text p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-3">
              <div>
                <label className="text-[10px] text-text-muted font-semibold block mb-0.5">Distributor Name</label>
                <input
                  type="text"
                  value={editingDistributor.name}
                  onChange={e => setEditingDistributor({ ...editingDistributor, name: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-text font-bold outline-none focus:border-primary"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-text-muted font-semibold block mb-0.5">GSTIN</label>
                  <input
                    type="text"
                    value={editingDistributor.gstin}
                    onChange={e => setEditingDistributor({ ...editingDistributor, gstin: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-primary font-mono outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-text-muted font-semibold block mb-0.5">Phone Number</label>
                  <input
                    type="text"
                    value={editingDistributor.phone}
                    onChange={e => setEditingDistributor({ ...editingDistributor, phone: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-text font-mono outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-text-muted font-semibold block mb-0.5">Full Address / Hub Location</label>
                <input
                  type="text"
                  value={editingDistributor.addr}
                  onChange={e => setEditingDistributor({ ...editingDistributor, addr: e.target.value })}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="text-[10px] text-text-muted font-semibold block mb-0.5">Drug License (DL No)</label>
                  <input
                    type="text"
                    value={editingDistributor.dlNo || ''}
                    onChange={e => setEditingDistributor({ ...editingDistributor, dlNo: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-text font-mono outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-text-muted font-semibold block mb-0.5">Contact Person</label>
                  <input
                    type="text"
                    value={editingDistributor.contactPerson || ''}
                    onChange={e => setEditingDistributor({ ...editingDistributor, contactPerson: e.target.value })}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setEditingDistributor(null)}
                  className="px-4 py-2 bg-surface hover:bg-bg text-text-muted rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl shadow-lg transition"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
