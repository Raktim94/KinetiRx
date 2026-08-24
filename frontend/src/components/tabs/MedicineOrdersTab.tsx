import React, { useState } from 'react';
import {
  Clock,
  Download,
  FileCheck2,
  Pencil,
  Phone,
  Plus,
  Search,
  Truck,
  User,
  UserCheck,
} from 'lucide-react';
import { Distributor, NeededMedOrder, PatientRecord } from '../../types';
import { exportToCSV } from '../../utils/exportCsv';
import { EditNeedMedModal } from '../modals/EditNeedMedModal';

interface MedicineOrdersTabProps {
  neededMeds: NeededMedOrder[];
  setNeededMeds: React.Dispatch<React.SetStateAction<NeededMedOrder[]>>;
  onOpenAddNeedModal: () => void;
  patients?: PatientRecord[];
  onViewPatientProfile?: (p: PatientRecord) => void;
  distributors?: Distributor[];
}

export const MedicineOrdersTab: React.FC<MedicineOrdersTabProps> = ({
  neededMeds,
  setNeededMeds,
  onOpenAddNeedModal,
  patients = [],
  onViewPatientProfile,
  distributors = [],
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderToEdit, setOrderToEdit] = useState<NeededMedOrder | null>(null);

  const handleUpdateStatus = (id: string, newStatus: NeededMedOrder['status']) => {
    setNeededMeds(prev =>
      prev.map(item => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const filteredOrders = neededMeds.filter(n => {
    const q = search.toLowerCase();
    const matchesSearch =
      !search ||
      n.med.toLowerCase().includes(q) ||
      n.name.toLowerCase().includes(q) ||
      (n.patientId && n.patientId.toLowerCase().includes(q)) ||
      n.phone.includes(search) ||
      n.dist.toLowerCase().includes(q);

    const matchesStatus = statusFilter === 'all' || n.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const handleExportCSV = () => {
    exportToCSV(
      'special_medicine_orders',
      [
        'Order ID',
        'Patient ID',
        'Medicine Required',
        'Patient Name',
        'Phone Number',
        'Supplier / Distributor',
        'Quantity',
        'Commitment Delivery Time',
        'Order Status',
      ],
      neededMeds.map(n => [
        n.id,
        n.patientId || 'N/A',
        n.med,
        n.name,
        n.phone,
        n.dist,
        n.qty,
        n.time,
        n.status,
      ])
    );
  };

  const handlePatientClick = (patientId?: string) => {
    if (!patientId || !onViewPatientProfile) return;
    const found = patients.find(p => p.id === patientId);
    if (found) {
      onViewPatientProfile(found);
    }
  };

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="p-6 rounded-3xl bg-surface/90 backdrop-blur-2xl border border-border shadow-2xl flex justify-between items-center flex-wrap gap-4 text-text">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h2 className="text-xl sm:text-2xl font-bold text-text flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <span>Special Medicine Need Orders</span>
            </h2>
            <span className="bg-primary/20 border border-primary/30 text-primary text-xs font-mono px-3 py-0.5 rounded-full font-bold">
              {neededMeds.length} Orders
            </span>
          </div>
          <p className="text-xs text-text-muted mt-1 max-w-2xl">
            Manage out-of-stock emergency patient prescriptions linked with Patient Profiles and assigned to distributors with promised delivery deadlines.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="bg-surface hover:bg-surface-elevated border border-border text-text-muted font-semibold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Export Excel</span>
          </button>

          <button
            id="btn-add-need-order"
            onClick={onOpenAddNeedModal}
            className="bg-primary hover:bg-primary-hover text-text px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-primary/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Note Special Medicine Order</span>
          </button>
        </div>
      </div>

      {/* SEARCH & FILTERS */}
      <div className="flex justify-between items-center gap-3 flex-wrap bg-surface p-3 rounded-2xl border border-border backdrop-blur-md">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Patient ID (e.g. P/101), Patient Name, Medicine, Phone, or Distributor..."
            className="w-full pl-9 pr-3 py-2 bg-bg border border-border rounded-xl text-xs text-text placeholder:text-text-muted outline-none focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs text-text-muted font-medium">Status:</label>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="p-2 rounded-xl text-xs font-semibold bg-surface border border-border text-text outline-none focus:border-primary"
          >
            <option value="all">All Statuses</option>
            <option value="Distributor Ordered">Distributor Ordered</option>
            <option value="Processing">Processing</option>
            <option value="Pending">Pending</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* ORDERS TABLE */}
      <div className="bg-surface/90 backdrop-blur-2xl border border-border rounded-3xl shadow-2xl overflow-hidden text-xs text-text">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-surface-elevated border-b border-border text-[11px] font-bold text-text-muted uppercase backdrop-blur-md">
              <tr>
                <th className="p-3.5">Medicine Required</th>
                <th className="p-3.5">Patient Details</th>
                <th className="p-3.5">Distributor Assigned</th>
                <th className="p-3.5 text-emerald-400 font-bold">Commitment Delivery Time</th>
                <th className="p-3.5 text-center">Quantity</th>
                <th className="p-3.5">Order Status</th>
                <th className="p-3.5 text-center">Edit</th>
              </tr>
            </thead>
            <tbody id="need-med-rows" className="divide-y divide-border text-text">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-muted">
                    No special need medicine orders found. Click "+ Note Special Medicine Order" to create one.
                  </td>
                </tr>
              ) : (
                filteredOrders.map(n => (
                  <tr key={n.id} className="hover:bg-surface transition">
                    <td className="p-3.5 font-bold text-text text-sm">
                      {n.med}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {n.patientId ? (
                          <button
                            onClick={() => handlePatientClick(n.patientId)}
                            className="font-mono text-xs font-bold text-teal-300 bg-teal-500/15 border border-teal-500/30 px-1.5 py-0.5 rounded hover:bg-teal-500/25 transition cursor-pointer"
                            title="Click to view Patient Profile CV"
                          >
                            {n.patientId}
                          </button>
                        ) : (
                          <span className="font-mono text-[10px] text-text-muted bg-surface-elevated px-1.5 py-0.5 rounded">
                            Walk-in
                          </span>
                        )}
                        <span className="font-bold text-text">{n.name}</span>
                      </div>
                      <span className="text-[11px] text-text-muted font-mono block mt-0.5">
                        Ph: {n.phone}
                      </span>
                    </td>
                    <td className="p-3.5 font-semibold text-primary">
                      <div className="flex items-center gap-1.5">
                        <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span>{n.dist}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-emerald-300 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{n.time}</span>
                      </div>
                    </td>
                    <td className="p-3.5 text-center font-bold font-mono">
                      <span className="bg-surface-elevated text-text px-2.5 py-1 rounded-lg border border-border">
                        {n.qty} Units
                      </span>
                    </td>
                    <td className="p-3.5">
                      <select
                        value={n.status}
                        onChange={e =>
                          handleUpdateStatus(
                            n.id,
                            e.target.value as NeededMedOrder['status']
                          )
                        }
                        className={`p-2 rounded-xl font-bold text-xs bg-surface border text-text outline-none focus:border-primary ${
                          n.status === 'Delivered'
                            ? 'border-emerald-500/40 text-emerald-300'
                            : n.status === 'Processing'
                            ? 'border-amber-500/40 text-amber-300'
                            : n.status === 'Cancelled'
                            ? 'border-rose-500/40 text-rose-300'
                            : 'border-border'
                        }`}
                      >
                        <option value="Distributor Ordered">Distributor Ordered</option>
                        <option value="Processing">Processing</option>
                        <option value="Pending">Pending</option>
                        <option value="Delivered">Delivered</option>
                        <option value="Cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="p-3.5 text-center">
                      <button
                        onClick={() => setOrderToEdit(n)}
                        className="p-1.5 hover:bg-sky-500/20 text-text-muted hover:text-sky-300 rounded-xl transition cursor-pointer"
                        title="Edit Order"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <EditNeedMedModal
        isOpen={orderToEdit !== null}
        onClose={() => setOrderToEdit(null)}
        order={orderToEdit}
        distributors={distributors}
        onUpdateNeedMed={updated => setNeededMeds(prev => prev.map(o => (o.id === updated.id ? updated : o)))}
      />
    </div>
  );
};
