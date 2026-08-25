import React, { useState } from 'react';
import {
  Coins,
  Download,
  Eye,
  IdCard,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  User,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';
import { PatientRecord } from '../../types';
import { exportToCSV, formatWhatsAppPhone } from '../../utils/exportCsv';
import { AddPatientModal } from '../modals/AddPatientModal';
import { EditPatientModal } from '../modals/EditPatientModal';

interface PatientsTabProps {
  patients: PatientRecord[];
  setPatients?: React.Dispatch<React.SetStateAction<PatientRecord[]>>;
  onViewPatientProfile: (p: PatientRecord) => void;
  shopName: string;
  waGroupLink: string;
}

export const PatientsTab: React.FC<PatientsTabProps> = ({
  patients,
  setPatients,
  onViewPatientProfile,
  shopName,
  waGroupLink,
}) => {
  const [search, setSearch] = useState('');
  const [isAddPatientOpen, setIsAddPatientOpen] = useState(false);
  const [patientToEdit, setPatientToEdit] = useState<PatientRecord | null>(null);
  const [filterDueOnly, setFilterDueOnly] = useState(false);

  const filtered = patients.filter(p => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      p.name.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.phone.includes(search) ||
      (p.addr && p.addr.toLowerCase().includes(q)) ||
      (p.doc && p.doc.toLowerCase().includes(q));

    const matchesDue = !filterDueOnly || p.totalDue > 0;

    return matchesSearch && matchesDue;
  });

  const totalPatientsCount = patients.length;
  const totalDuesSum = patients.reduce((sum, p) => sum + (p.totalDue || 0), 0);
  const patientsWithDueCount = patients.filter(p => (p.totalDue || 0) > 0).length;

  const handleSendWhatsAppGroupInvite = (p: PatientRecord) => {
    const formatted = formatWhatsAppPhone(p.phone);
    if (!formatted || formatted.length < 10) {
      alert('Invalid phone number for WhatsApp invite.');
      return;
    }
    const msg = `Hello ${p.name},\nJoin our official WhatsApp channel for healthcare updates, doctor visit schedules, and medicine discounts at ${shopName}:\n👉 ${waGroupLink}\nThank you for choosing us!`;
    const url = `https://api.whatsapp.com/send?phone=${formatted}&text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleExportCSV = () => {
    exportToCSV(
      'patient_database_profiles',
      [
        'Patient ID',
        'Full Name',
        'Phone Number',
        'Age & Gender',
        'Full Address',
        'Assigned Doctor',
        'Outstanding Due (INR)',
        'Total Visits',
        'Last Visit Date',
      ],
      patients.map(p => [
        p.id,
        p.name,
        p.phone,
        `${p.age || '50'} Yrs / ${p.gender || 'M'}`,
        p.addr || p.address || 'Local Area',
        p.doc || p.doctor || 'Self Prescribed / OTC',
        (p.totalDue || 0).toFixed(2),
        p.totalVisits || 1,
        p.lastDate || p.lastVisitDate || '--',
      ])
    );
  };

  const handleDeletePatient = (patientId: string, patientName: string) => {
    if (!setPatients) return;
    if (confirm(`Are you sure you want to remove patient profile: ${patientName} (${patientId})?`)) {
      setPatients(prev => prev.filter(p => p.id !== patientId));
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. HEADER & ACTIONS BAR */}
      <div className="p-6 rounded-3xl glass-panel flex justify-between items-center flex-wrap gap-4 text-text">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary">
                <IdCard className="w-5 h-5" />
              </div>
              <span>Patient Profile Master Database</span>
            </h2>
            <span className="bg-primary/15 border border-primary/30 text-primary text-xs font-mono px-3 py-0.5 rounded-full font-bold">
              {totalPatientsCount} Registered Patients
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 max-w-2xl">
            Create and maintain master patient profiles with doctor assignments, address, mobile numbers, and comprehensive medical visit histories.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button onClick={handleExportCSV} className="btn-secondary btn-sm">
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Export Excel</span>
          </button>

          <button
            id="btn-add-patient-profile"
            onClick={() => setIsAddPatientOpen(true)}
            className="btn-primary px-4 py-2 rounded-2xl text-xs"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Register Patient Profile</span>
          </button>
        </div>
      </div>

      {/* 2. STATS KPIS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
        <div className="p-4 rounded-3xl bg-surface border border-border shadow-xl space-y-1">
          <p className="text-text-muted flex items-center gap-1.5">
            <Users className="w-4 h-4 text-primary" />
            <span>Total Registered Profiles</span>
          </p>
          <h3 className="text-2xl font-bold text-text font-mono">{totalPatientsCount}</h3>
          <p className="text-[11px] text-primary">Active medical profiles in pharmacy</p>
        </div>

        <div className="p-4 rounded-3xl bg-surface border border-border shadow-xl space-y-1">
          <p className="text-text-muted flex items-center gap-1.5">
            <TrendingDown className="w-4 h-4 text-danger" />
            <span>Total Outstanding Dues</span>
          </p>
          <h3 className="text-2xl font-bold text-danger font-mono">₹ {totalDuesSum.toFixed(2)}</h3>
          <p className="text-[11px] text-text-muted">{patientsWithDueCount} Patients with pending balance</p>
        </div>

        <div className="p-4 rounded-3xl bg-surface border border-border shadow-xl space-y-1">
          <p className="text-text-muted flex items-center gap-1.5">
            <UserCheck className="w-4 h-4 text-accent" />
            <span>Auto-Linked to Special Orders</span>
          </p>
          <h3 className="text-2xl font-bold text-accent font-mono">Instant Fetch</h3>
          <p className="text-[11px] text-text-muted">Type Patient ID to auto-populate orders & POS</p>
        </div>
      </div>

      {/* 3. SEARCH & FILTERS BAR */}
      <div className="flex justify-between items-center gap-3 flex-wrap bg-surface p-3 rounded-2xl border border-border backdrop-blur-md">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            id="patient-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Patient ID (e.g. P/101), Name, Mobile Number, Address, Doctor..."
            className="w-full pl-9 pr-3 py-2 glass-input rounded-xl text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterDueOnly(!filterDueOnly)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer ${
              filterDueOnly
                ? 'bg-danger text-primary-foreground shadow-md'
                : 'bg-surface-elevated text-text-muted hover:text-text border border-border'
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>{filterDueOnly ? 'Showing Due Only' : 'Filter Dues Only'}</span>
          </button>
        </div>
      </div>

      {/* 4. PATIENT PROFILES TABLE */}
      <div className="glass-panel rounded-3xl overflow-hidden text-xs text-text">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-elevated border-b border-border text-[11px] font-bold text-text-muted uppercase backdrop-blur-md">
              <tr>
                <th className="p-3.5">Patient ID</th>
                <th className="p-3.5">Full Name</th>
                <th className="p-3.5">Mobile Number</th>
                <th className="p-3.5">Age / Gender</th>
                <th className="p-3.5">Address</th>
                <th className="p-3.5">Assigned Doctor</th>
                <th className="p-3.5 text-danger font-bold">Outstanding Due (₹)</th>
                <th className="p-3.5 text-center">Profile & WhatsApp</th>
              </tr>
            </thead>
            <tbody id="patient-profile-rows" className="divide-y divide-border text-text">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-text-muted">
                    No matching patient profiles found. Click "+ Register Patient Profile" to add one.
                  </td>
                </tr>
              ) : (
                filtered.map(p => (
                  <tr key={p.id} className="hover:bg-bg transition group">
                    <td className="p-3.5 font-mono font-bold text-primary">
                      <span className="bg-primary/12 border border-primary/30 px-2 py-0.5 rounded-md">
                        {p.id}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-text text-sm">
                      {p.name}
                      {p.reason && (
                        <span className="text-[10px] text-text-muted block font-normal mt-0.5">
                          {p.reason}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono text-text-muted font-medium">{p.phone}</td>
                    <td className="p-3.5 text-text-muted">
                      {p.age || '50'} Yrs / {p.gender || 'M'}
                    </td>
                    <td className="p-3.5 text-text-muted">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-text-muted shrink-0" />
                        <span>{p.addr || p.address || 'Local Area'}</span>
                      </div>
                    </td>
                    <td className="p-3.5 font-medium text-text">
                      {p.doc || p.doctor || 'Self Prescribed / OTC'}
                    </td>
                    <td className="p-3.5 font-bold text-danger font-mono text-sm">
                      ₹ {(p.totalDue || 0).toFixed(2)}
                    </td>
                    <td className="p-3.5 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => handleSendWhatsAppGroupInvite(p)}
                          className="text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 px-2.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1 transition backdrop-blur-sm cursor-pointer"
                          title="Send WhatsApp Community Invite"
                        >
                          <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>WhatsApp</span>
                        </button>
                        <button
                          onClick={() => onViewPatientProfile(p)}
                          className="text-primary bg-primary/15 hover:bg-primary/25 border border-primary/30 px-2.5 py-1.5 rounded-xl font-semibold text-xs flex items-center gap-1 transition backdrop-blur-sm cursor-pointer"
                          title="View Complete Patient CV & History"
                        >
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          <span>Profile CV</span>
                        </button>
                        {setPatients && (
                          <button
                            onClick={() => setPatientToEdit(p)}
                            className="p-1.5 hover:bg-primary/15 text-text-muted hover:text-primary rounded-xl transition"
                            title="Edit Patient Profile"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                        )}
                        {setPatients && (
                          <button
                            onClick={() => handleDeletePatient(p.id, p.name)}
                            className="p-1.5 hover:bg-danger/15 text-text-muted hover:text-danger rounded-xl transition"
                            title="Delete Patient Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. ADD PATIENT MODAL */}
      <AddPatientModal
        isOpen={isAddPatientOpen}
        onClose={() => setIsAddPatientOpen(false)}
        existingPatients={patients}
        onSavePatient={newP => {
          if (setPatients) {
            setPatients(prev => [newP, ...prev]);
          }
        }}
      />

      {/* 5B. EDIT PATIENT MODAL */}
      <EditPatientModal
        isOpen={patientToEdit !== null}
        onClose={() => setPatientToEdit(null)}
        patient={patientToEdit}
        onUpdatePatient={updated => {
          if (setPatients) {
            setPatients(prev => prev.map(p => (p.id === updated.id ? updated : p)));
          }
        }}
      />
    </div>
  );
};
