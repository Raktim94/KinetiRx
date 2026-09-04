import React, { useMemo, useState } from 'react';
import {
  Clock,
  Download,
  FileCheck2,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Printer,
  Search,
  Send,
  Truck,
  User,
  UserCheck,
} from 'lucide-react';
import { Distributor, InvoiceConfig, NeededMedOrder, PatientRecord } from '../../types';
import { formatPatientId, stripPatientIdPrefix } from '../../utils/patientUtils';
import { exportToCSV } from '../../utils/exportCsv';
import {
  downloadPurchaseOrder,
  findDistributorByName,
  groupNeededMedsByDistributor,
  printPurchaseOrder,
  shareOrderOnWhatsApp,
} from '../../utils/poGenerator';
import { EditNeedMedModal } from '../modals/EditNeedMedModal';

interface MedicineOrdersTabProps {
  neededMeds: NeededMedOrder[];
  setNeededMeds: React.Dispatch<React.SetStateAction<NeededMedOrder[]>>;
  onOpenAddNeedModal: () => void;
  patients?: PatientRecord[];
  onViewPatientProfile?: (p: PatientRecord) => void;
  distributors?: Distributor[];
  invoiceConfig: InvoiceConfig;
}

export const MedicineOrdersTab: React.FC<MedicineOrdersTabProps> = ({
  neededMeds,
  setNeededMeds,
  onOpenAddNeedModal,
  patients = [],
  onViewPatientProfile,
  distributors = [],
  invoiceConfig,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [orderToEdit, setOrderToEdit] = useState<NeededMedOrder | null>(null);
  const [poCounter, setPoCounter] = useState(1);

  // Pending orders grouped by distributor — the source data for "Generate
  // Purchase Order" below. Only "Pending" orders are eligible: anything
  // already ordered/delivered/cancelled has no business being on a new PO.
  const pendingByDistributor = useMemo(() => groupNeededMedsByDistributor(neededMeds), [neededMeds]);

  const nextPoNumber = () => {
    const n = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${String(poCounter).padStart(3, '0')}`;
    setPoCounter(c => c + 1);
    return n;
  };

  const markOrdersAsOrdered = (ids: string[]) => {
    setNeededMeds(prev =>
      prev.map(o => (ids.includes(o.id) ? { ...o, status: 'Distributor Ordered' } : o))
    );
  };

  const handleGeneratePO = (distName: string, orders: NeededMedOrder[]) => {
    const dist = findDistributorByName(distributors, distName);
    const poNumber = nextPoNumber();
    printPurchaseOrder(invoiceConfig, distName, dist, orders, poNumber);
    markOrdersAsOrdered(orders.map(o => o.id));
  };

  const handleDownloadPO = (distName: string, orders: NeededMedOrder[]) => {
    const dist = findDistributorByName(distributors, distName);
    downloadPurchaseOrder(invoiceConfig, distName, dist, orders, nextPoNumber());
  };

  const handleWhatsAppPO = (distName: string, orders: NeededMedOrder[]) => {
    const dist = findDistributorByName(distributors, distName);
    shareOrderOnWhatsApp(invoiceConfig, distName, dist?.phone, orders, nextPoNumber());
    markOrdersAsOrdered(orders.map(o => o.id));
  };

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
      (n.patientId && stripPatientIdPrefix(n.patientId).toLowerCase().includes(stripPatientIdPrefix(search).toLowerCase())) ||
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
        n.patientId ? formatPatientId(n.patientId) : 'N/A',
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
    const found = patients.find(p => stripPatientIdPrefix(p.id) === stripPatientIdPrefix(patientId));
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
            className="bg-surface hover:bg-border-elevated border border-border text-text-muted font-semibold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Export Excel</span>
          </button>

          <button
            id="btn-add-need-order"
            onClick={onOpenAddNeedModal}
            className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-primary/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Note Special Medicine Order</span>
          </button>
        </div>
      </div>

      {/* GENERATE PURCHASE ORDER — groups still-Pending shortage-book entries
          by distributor so they can be turned into an actual PO instead of
          staying a bare list. */}
      {pendingByDistributor.size > 0 && (
        <div className="p-5 rounded-3xl bg-surface/90 backdrop-blur-2xl border border-border shadow-2xl space-y-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <Send className="w-4 h-4 text-primary" />
            <span>Generate Purchase Order (by Distributor)</span>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from(pendingByDistributor.entries()).map(([distName, orders]) => (
              <div
                key={distName}
                className="p-3.5 rounded-2xl bg-surface-elevated border border-border flex flex-col gap-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 font-bold text-text text-xs">
                    <Truck className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span>{distName}</span>
                  </div>
                  <span className="text-[10px] font-mono bg-primary/15 text-primary px-2 py-0.5 rounded-full border border-primary/25">
                    {orders.length} item{orders.length === 1 ? '' : 's'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    onClick={() => handleGeneratePO(distName, orders)}
                    className="px-2.5 py-1.5 bg-primary hover:bg-primary-hover text-primary-foreground rounded-xl text-[11px] font-bold flex items-center gap-1 transition cursor-pointer"
                    title="Print the Purchase Order and mark these items as Distributor Ordered"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print PO</span>
                  </button>
                  <button
                    onClick={() => handleDownloadPO(distName, orders)}
                    className="px-2.5 py-1.5 bg-surface hover:bg-bg border border-border text-text rounded-xl text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-primary" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => handleWhatsAppPO(distName, orders)}
                    className="px-2.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 rounded-xl text-[11px] font-semibold flex items-center gap-1 transition cursor-pointer"
                    title="Share PO summary via WhatsApp and mark these items as Distributor Ordered"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SEARCH & FILTERS */}
      <div className="flex justify-between items-center gap-3 flex-wrap bg-surface p-3 rounded-2xl border border-border backdrop-blur-md">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by Patient ID (e.g. P-101 or 101), Patient Name, Medicine, Phone, or Distributor..."
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
                <th className="p-3.5 text-emerald-600 dark:text-emerald-400 font-bold">Commitment Delivery Time</th>
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
                            className="font-mono text-xs font-bold text-teal-700 dark:text-teal-300 bg-teal-500/15 border border-teal-500/30 px-1.5 py-0.5 rounded hover:bg-teal-500/25 transition cursor-pointer"
                            title="Click to view Patient Profile CV"
                          >
                            {formatPatientId(n.patientId)}
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
                    <td className="p-3.5 text-emerald-700 dark:text-emerald-300 font-bold">
                      <div className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
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
                            ? 'border-emerald-500/40 text-emerald-700 dark:text-emerald-300'
                            : n.status === 'Processing'
                            ? 'border-amber-500/40 text-amber-700 dark:text-amber-300'
                            : n.status === 'Cancelled'
                            ? 'border-rose-500/40 text-rose-700 dark:text-rose-300'
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
                        className="p-1.5 hover:bg-sky-500/20 text-text-muted hover:text-sky-700 dark:hover:text-sky-300 rounded-xl transition cursor-pointer"
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
