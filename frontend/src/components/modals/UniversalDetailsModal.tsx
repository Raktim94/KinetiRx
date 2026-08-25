import React, { useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  DollarSign,
  FileSpreadsheet,
  FileText,
  Filter,
  HandCoins,
  MessageCircle,
  Package,
  Phone,
  Printer,
  Receipt,
  Search,
  Stethoscope,
  TrendingUp,
  Truck,
  User,
  Users,
  Vault,
  Wallet,
  X,
} from 'lucide-react';
import {
  DailyRegister,
  ExpenseRecord,
  Medicine,
  OPDVisit,
  PatientDue,
  PatientRecord,
  SalesRecord,
} from '../../types';

export type ModalType =
  | 'expiry'
  | 'revisit'
  | 'revisits'
  | 'due_list'
  | 'total_due'
  | 'sales_list'
  | 'today_sales'
  | 'cash_drawer'
  | 'drawer_cash'
  | 'stock_skus'
  | 'patient_cv'
  | null;

interface UniversalDetailsModalProps {
  type: ModalType;
  onClose: () => void;
  medicines: Medicine[];
  opdVisits: OPDVisit[];
  patientsDue: (PatientDue | PatientRecord)[];
  salesHistory: SalesRecord[];
  dailyRegister: DailyRegister;
  expenses: ExpenseRecord[];
  selectedPatient?: PatientRecord | null;
  onSelectPatientById?: (patientId: string) => void;
}

export const UniversalDetailsModal: React.FC<UniversalDetailsModalProps> = ({
  type,
  onClose,
  medicines,
  opdVisits,
  patientsDue,
  salesHistory,
  dailyRegister,
  expenses,
  selectedPatient,
}) => {
  if (!type) return null;

  const [searchTerm, setSearchTerm] = useState('');

  // 1. Short expiry list (<= 6 months from mid-2026, e.g. <= 2026-12)
  const expiringMeds = medicines
    .filter(m => m.expiry && m.expiry <= '2026-12')
    .filter(m => m.name.toLowerCase().includes(searchTerm.toLowerCase()) || (m.batch || '').toLowerCase().includes(searchTerm.toLowerCase()));

  // 2. OPD revisits
  const upcomingRevisits = opdVisits
    .filter(v => v.rvdate && v.rvdate >= '2026-08-17')
    .filter(v => v.name.toLowerCase().includes(searchTerm.toLowerCase()) || (v.doc || '').toLowerCase().includes(searchTerm.toLowerCase()));

  // 3. Due list
  const dueList = patientsDue
    .map((p: any) => ({
      id: p.id,
      name: p.name || 'Unknown Patient',
      phone: p.phone || 'N/A',
      addr: p.addr || p.address || 'Local',
      doc: p.doc || 'General OPD',
      due: Number(p.dueAmount !== undefined ? p.dueAmount : (p.totalDue !== undefined ? p.totalDue : (p.due || 0))),
    }))
    .filter(p => p.due > 0)
    .filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.phone.includes(searchTerm));

  const totalDueSum = dueList.reduce((sum, p) => sum + p.due, 0);

  // 4. Sales list
  const salesList = salesHistory
    .filter(s => {
      const q = searchTerm.toLowerCase();
      return (
        (s.inv || s.invoiceNo || '').toLowerCase().includes(q) ||
        (s.cust || s.patient || s.name || '').toLowerCase().includes(q) ||
        (s.items || '').toLowerCase().includes(q)
      );
    });

  const totalSalesSum = salesList.reduce((sum, s) => sum + (Number(s.total || s.amt) || 0), 0);

  // 5. Cash drawer calculations
  const openingBD = dailyRegister.prevBD ?? dailyRegister.openingCash ?? 1200;
  const grossTodaySales = dailyRegister.todaySell ?? totalSalesSum;
  const phonePeOnline = dailyRegister.phonePe ?? dailyRegister.upiSales ?? 225;
  const recordedExpenses = dailyRegister.expenses ?? 640;
  const bankDeposit = dailyRegister.bankShift ?? 600;

  const totalCashSales = salesHistory
    .filter(s => s.mode === 'Cash' || s.mode.toLowerCase().includes('cash'))
    .reduce((sum, s) => sum + (Number(s.paidAmount !== undefined ? s.paidAmount : (s.total || s.amt)) || 0), 0);

  const totalUpiSales = salesHistory
    .filter(s => s.mode === 'PhonePe' || s.mode.toLowerCase().includes('upi') || s.mode.toLowerCase().includes('online'))
    .reduce((sum, s) => sum + (Number(s.paidAmount !== undefined ? s.paidAmount : (s.total || s.amt)) || 0), 0);

  const totalExpenseSum = expenses.reduce((sum, e) => sum + (Number(e.amt) || 0), 0);
  const netDrawerCash = Math.max(0, openingBD + grossTodaySales - phonePeOnline - recordedExpenses - bankDeposit);

  // 6. Stock SKUs
  const filteredMeds = medicines.filter(
    m =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.generic || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (m.rack || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-3xl w-full p-6 space-y-4 text-xs text-text max-h-[90vh] flex flex-col justify-between animate-in zoom-in-95">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border pb-3 flex-wrap gap-2">
          {type === 'expiry' && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Short Expiry Batches Alert (≤ 6 Months)</h3>
                <p className="text-[11px] text-text-muted">
                  {expiringMeds.length} medicines expiring before December 2026.
                </p>
              </div>
            </div>
          )}

          {(type === 'revisit' || type === 'revisits') && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Upcoming OPD Clinical Re-visits</h3>
                <p className="text-[11px] text-text-muted">
                  {upcomingRevisits.length} scheduled patients for clinical follow-up.
                </p>
              </div>
            </div>
          )}

          {(type === 'due_list' || type === 'total_due') && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-600 dark:text-rose-400">
                <Receipt className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Customer Due Khata Ledger</h3>
                <p className="text-[11px] text-rose-700 dark:text-rose-300 font-bold">
                  Total Outstanding Balance: ₹ {totalDueSum.toFixed(2)} ({dueList.length} Patients)
                </p>
              </div>
            </div>
          )}

          {(type === 'sales_list' || type === 'today_sales') && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Itemized Sales History & Invoices</h3>
                <p className="text-[11px] text-primary font-bold">
                  Total Billed Revenue: ₹ {totalSalesSum.toFixed(2)} ({salesList.length} Transactions)
                </p>
              </div>
            </div>
          )}

          {(type === 'cash_drawer' || type === 'drawer_cash') && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                <Vault className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Daily Cash Drawer Reconciliation</h3>
                <p className="text-[11px] text-emerald-700 dark:text-emerald-300 font-bold">
                  Closing Cash In Drawer: ₹ {netDrawerCash.toFixed(2)}
                </p>
              </div>
            </div>
          )}

          {type === 'stock_skus' && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Boxes className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Pharmacy Stock SKUs & Inventory</h3>
                <p className="text-[11px] text-blue-700 dark:text-blue-300 font-bold">
                  {medicines.length} Registered Pharmaceutical Products
                </p>
              </div>
            </div>
          )}

          {type === 'patient_cv' && selectedPatient && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center text-sky-600 dark:text-sky-400">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-text">Patient Medical Profile: {selectedPatient.name}</h3>
                <p className="text-[11px] text-text-muted font-mono">
                  ID: {selectedPatient.id} • Phone: {selectedPatient.phone}
                </p>
              </div>
            </div>
          )}

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-surface hover:bg-bg text-text-muted hover:text-text transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar for tabular views */}
        {type !== 'cash_drawer' && type !== 'drawer_cash' && type !== 'patient_cv' && (
          <div className="relative">
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name, invoice #, phone, batch, or doctor..."
              className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-2xl text-xs text-text outline-none focus:border-primary transition"
            />
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto pr-1">
          {/* 1. EXPIRY LIST */}
          {type === 'expiry' && (
            <div className="overflow-x-auto border border-border rounded-2xl bg-surface backdrop-blur-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg text-amber-700 dark:text-amber-300 font-bold border-b border-border sticky top-0 text-[11px]">
                  <tr>
                    <th className="p-3">Medicine Name</th>
                    <th className="p-3">Distributor</th>
                    <th className="p-3">Batch / Rack</th>
                    <th className="p-3">Stock Units</th>
                    <th className="p-3 font-bold text-rose-600 dark:text-rose-400">Expiry Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text">
                  {expiringMeds.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-text-muted">
                        No short-expiry medicines found matching your search.
                      </td>
                    </tr>
                  ) : (
                    expiringMeds.map(m => (
                      <tr key={m.id} className="hover:bg-surface transition">
                        <td className="p-3 font-bold text-text">{m.name}</td>
                        <td className="p-3 text-primary">{m.dist || 'Local Agency'}</td>
                        <td className="p-3 font-mono">
                          <span className="text-sky-700 dark:text-sky-300 font-bold">{m.batch}</span>
                          <span className="block text-text-muted text-[10px]">{m.rack}</span>
                        </td>
                        <td className="p-3 font-bold font-mono text-text">{m.stock} Units</td>
                        <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10">
                          {m.expiry}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 2. OPD REVISITS */}
          {(type === 'revisit' || type === 'revisits') && (
            <div className="overflow-x-auto border border-border rounded-2xl bg-surface backdrop-blur-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg text-emerald-700 dark:text-emerald-300 font-bold border-b border-border sticky top-0 text-[11px]">
                  <tr>
                    <th className="p-3">Patient Name</th>
                    <th className="p-3">Doctor Assigned</th>
                    <th className="p-3">Phone Number</th>
                    <th className="p-3">Next Re-visit</th>
                    <th className="p-3">Tests Advised</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text">
                  {upcomingRevisits.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-text-muted">
                        No upcoming OPD patient revisit records found.
                      </td>
                    </tr>
                  ) : (
                    upcomingRevisits.map(v => (
                      <tr key={v.id} className="hover:bg-surface transition">
                        <td className="p-3">
                          <span className="font-bold text-text block">{v.name}</span>
                          <span className="text-[10px] text-text-muted">{v.ageSex}</span>
                        </td>
                        <td className="p-3 font-semibold text-text">{v.doc}</td>
                        <td className="p-3 font-mono text-text-muted">{v.phone}</td>
                        <td className="p-3 font-mono font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10">
                          {v.rvdate}
                        </td>
                        <td className="p-3 text-text-muted text-[11px]">{v.btest || 'None'}</td>
                        <td className="p-3 text-center">
                          <a
                            href={`https://wa.me/${v.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Hello ${v.name}, this is a gentle reminder from Pharma Care Pro for your OPD clinical revisit with ${v.doc} scheduled on ${v.rvdate}. Recommended Tests: ${v.btest || 'Routine Checkup'}.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-text font-bold rounded-xl text-[10px] inline-flex items-center gap-1 shadow-md transition"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 3. DUE LIST */}
          {(type === 'due_list' || type === 'total_due') && (
            <div className="overflow-x-auto border border-border rounded-2xl bg-surface backdrop-blur-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg text-rose-700 dark:text-rose-300 font-bold border-b border-border sticky top-0 text-[11px]">
                  <tr>
                    <th className="p-3">Patient Name</th>
                    <th className="p-3">Phone Number</th>
                    <th className="p-3">Address</th>
                    <th className="p-3 font-bold text-rose-600 dark:text-rose-400 text-right">Outstanding Due</th>
                    <th className="p-3 text-center">Reminder</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text">
                  {dueList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-6 text-center text-text-muted">
                        No outstanding patient dues recorded.
                      </td>
                    </tr>
                  ) : (
                    dueList.map(p => (
                      <tr key={p.id} className="hover:bg-surface transition">
                        <td className="p-3 font-bold text-text">{p.name}</td>
                        <td className="p-3 font-mono text-text-muted">{p.phone}</td>
                        <td className="p-3 text-text-muted">{p.addr}</td>
                        <td className="p-3 font-mono font-bold text-rose-600 dark:text-rose-400 text-right text-sm">
                          ₹ {p.due.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <a
                            href={`https://wa.me/${p.phone.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                              `Dear ${p.name}, greeting from Pharma Care Pro. Your pending medical due balance is Rs. ${p.due.toFixed(2)}. Kindly clear at your convenience.`
                            )}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-text font-bold rounded-xl text-[10px] inline-flex items-center gap-1 shadow-md transition"
                          >
                            <MessageCircle className="w-3 h-3" />
                            <span>WhatsApp</span>
                          </a>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 4. SALES LIST */}
          {(type === 'sales_list' || type === 'today_sales') && (
            <div className="overflow-x-auto border border-border rounded-2xl bg-surface backdrop-blur-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg text-text-muted font-bold border-b border-border sticky top-0 text-[11px]">
                  <tr>
                    <th className="p-3">Inv #</th>
                    <th className="p-3">Date</th>
                    <th className="p-3">Customer / Patient</th>
                    <th className="p-3">Items Sold</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3 font-bold text-text text-right">Bill Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text">
                  {salesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-text-muted">
                        No sales transactions recorded matching your search.
                      </td>
                    </tr>
                  ) : (
                    salesList.map(s => (
                      <tr key={s.id} className="hover:bg-surface transition">
                        <td className="p-3 font-mono font-bold text-primary">
                          {s.inv || s.invoiceNo || `#${s.id}`}
                        </td>
                        <td className="p-3 font-mono text-text-muted">{s.date}</td>
                        <td className="p-3">
                          <span className="font-bold text-text block">{s.cust || s.patient || s.name || 'Walk-in'}</span>
                          <span className="text-[10px] text-text-muted font-mono">{s.phone || 'N/A'}</span>
                        </td>
                        <td className="p-3 text-text-muted max-w-[200px] truncate">{s.items || s.name}</td>
                        <td className="p-3">
                          <span className="bg-primary/20 text-primary border border-primary/30 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                            {s.mode}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-text text-right">
                          ₹ {Number(s.total || s.amt || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 5. CASH DRAWER BREAKDOWN */}
          {(type === 'cash_drawer' || type === 'drawer_cash') && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-surface p-4 rounded-2xl border border-border backdrop-blur-md">
                  <span className="text-[10px] text-text-muted uppercase font-bold">Opening Cash Float (B/D)</span>
                  <h4 className="text-base font-bold text-text font-mono mt-1">
                    ₹ {openingBD.toFixed(2)}
                  </h4>
                </div>
                <div className="bg-success/10 p-4 rounded-2xl border border-success/20 backdrop-blur-md">
                  <span className="text-[10px] text-success uppercase font-bold">+ Gross Sales Inflow</span>
                  <h4 className="text-base font-bold text-success font-mono mt-1">
                    ₹ {grossTodaySales.toFixed(2)}
                  </h4>
                </div>
                <div className="bg-warning/10 p-4 rounded-2xl border border-warning/20 backdrop-blur-md">
                  <span className="text-[10px] text-warning uppercase font-bold">- Deductions (Online+Exp+Bank)</span>
                  <h4 className="text-base font-bold text-warning font-mono mt-1">
                    ₹ {(phonePeOnline + recordedExpenses + bankDeposit).toFixed(2)}
                  </h4>
                </div>
              </div>

              <div className="p-5 bg-success/12 border border-success/30 text-text rounded-3xl shadow-xl flex justify-between items-center flex-wrap gap-4">
                <div>
                  <span className="text-[11px] uppercase tracking-wider text-success font-bold block">
                    Net Physical Cash Balance in Drawer
                  </span>
                  <h3 className="text-3xl font-extrabold font-mono text-success mt-1">
                    ₹ {netDrawerCash.toFixed(2)}
                  </h3>
                </div>
                <div className="text-right text-xs">
                  <span className="text-[10px] text-success/80 block">Digital Split Recorded:</span>
                  <span className="text-xs font-mono font-bold text-text">
                    UPI/PhonePe: ₹{phonePeOnline.toFixed(2)} | Bank Shift: ₹{bankDeposit.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 6. STOCK SKUs */}
          {type === 'stock_skus' && (
            <div className="overflow-x-auto border border-border rounded-2xl bg-surface backdrop-blur-md">
              <table className="w-full text-left text-xs">
                <thead className="bg-bg text-blue-700 dark:text-blue-300 font-bold border-b border-border sticky top-0 text-[11px]">
                  <tr>
                    <th className="p-3">Product Name</th>
                    <th className="p-3">Generic & Category</th>
                    <th className="p-3">Rack / Batch</th>
                    <th className="p-3 text-right">In-Hand Stock</th>
                    <th className="p-3 text-right">Purchase Rate (₹)</th>
                    <th className="p-3 text-right">MRP (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text">
                  {filteredMeds.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-text-muted">
                        No medicines found matching your search.
                      </td>
                    </tr>
                  ) : (
                    filteredMeds.map(m => (
                      <tr key={m.id} className="hover:bg-surface transition">
                        <td className="p-3">
                          <span className="font-bold text-text block">{m.name}</span>
                          <span className="text-[10px] text-text-muted">{m.dist || 'Standard'}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-text-muted block">{m.generic}</span>
                          <span className="text-[10px] text-primary font-medium">{m.category}</span>
                        </td>
                        <td className="p-3 font-mono">
                          <span className="text-sky-700 dark:text-sky-300 font-bold">{m.rack}</span>
                          <span className="block text-[10px] text-text-muted">{m.batch}</span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] ${
                              (m.stock || 0) <= 0
                                ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                                : (m.stock || 0) <= 10
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30'
                                : 'text-text'
                            }`}
                          >
                            {m.stock} Units
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono text-text-muted">
                          ₹ {(Number(m.rate) || Number(m.mrp || 0) * 0.7).toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          ₹ {Number(m.mrp || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* 7. PATIENT CV */}
          {type === 'patient_cv' && selectedPatient && (() => {
            // Match invoices from salesHistory for this patient
            const patientSales = salesHistory.filter(
              s =>
                (s.patientId && s.patientId.toLowerCase() === selectedPatient.id.toLowerCase()) ||
                (s.phone && selectedPatient.phone && s.phone === selectedPatient.phone) ||
                (s.cust && s.cust.toLowerCase() === selectedPatient.name.toLowerCase()) ||
                (s.patient && s.patient.toLowerCase() === selectedPatient.name.toLowerCase())
            );

            // Match OPD visits for this patient
            const patientOPD = opdVisits.filter(
              v =>
                (v.phone && selectedPatient.phone && v.phone === selectedPatient.phone) ||
                (v.name && v.name.toLowerCase() === selectedPatient.name.toLowerCase())
            );

            return (
              <div className="space-y-4">
                <div className="p-4 bg-surface border border-border rounded-2xl space-y-2 backdrop-blur-md">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-text-muted block text-[10px] uppercase font-semibold">Patient ID & Name:</span>
                      <span className="font-bold text-text block">{selectedPatient.name}</span>
                      <span className="font-mono text-xs text-teal-700 dark:text-teal-300 bg-teal-500/20 px-1.5 py-0.5 rounded font-bold inline-block mt-0.5">
                        {selectedPatient.id}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px] uppercase font-semibold">Mobile & Age:</span>
                      <span className="font-mono font-bold text-text block">{selectedPatient.phone}</span>
                      <span className="text-text-muted text-[11px]">
                        {selectedPatient.age || '50'} Yrs &bull; {selectedPatient.gender || 'Male'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px] uppercase font-semibold">Address & Doctor:</span>
                      <span className="font-medium text-text block truncate" title={selectedPatient.addr || selectedPatient.address || 'Local Area'}>
                        {selectedPatient.addr || selectedPatient.address || 'Local Area'}
                      </span>
                      <span className="text-primary font-semibold text-[11px] block">
                        {selectedPatient.doc || selectedPatient.doctor || 'Self Prescribed / OTC'}
                      </span>
                    </div>
                    <div>
                      <span className="text-text-muted block text-[10px] uppercase font-semibold">Outstanding Due:</span>
                      <span className="font-bold text-rose-600 dark:text-rose-400 font-mono text-base block">
                        ₹ {Number(selectedPatient.totalDue || (selectedPatient as any).due || (selectedPatient as any).dueAmount || 0).toFixed(2)}
                      </span>
                      <span className="text-[10px] text-text-muted">
                        {selectedPatient.totalVisits || 1} Total Recorded Visits
                      </span>
                    </div>
                  </div>
                  {selectedPatient.reason && (
                    <div className="pt-2 border-t border-border text-[11px] text-text-muted flex items-center gap-1.5">
                      <span className="text-text-muted font-semibold">Clinical Note:</span>
                      <span>{selectedPatient.reason}</span>
                    </div>
                  )}
                </div>

                <div>
                  <h5 className="font-bold text-text mb-2 text-xs flex items-center justify-between">
                    <span>Pharmacy Purchase & Billing Invoices:</span>
                    <span className="text-[11px] font-normal text-text-muted">
                      {patientSales.length} Invoices Found
                    </span>
                  </h5>
                  <div className="overflow-x-auto border border-border rounded-2xl bg-surface backdrop-blur-md">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-bg text-text-muted font-bold border-b border-border text-[11px]">
                        <tr>
                          <th className="p-2.5">Date</th>
                          <th className="p-2.5">Invoice #</th>
                          <th className="p-2.5">Medicines Dispensed</th>
                          <th className="p-2.5 text-center">Payment</th>
                          <th className="p-2.5 text-right">Bill Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border text-text">
                        {patientSales.length === 0 ? (
                          <tr>
                            <td colSpan={5} className="p-4 text-center text-text-muted">
                              No prior POS sales recorded for this patient profile yet.
                            </td>
                          </tr>
                        ) : (
                          patientSales.map(s => (
                            <tr key={s.id} className="hover:bg-surface transition">
                              <td className="p-2.5 font-mono text-text-muted">{s.date}</td>
                              <td className="p-2.5 font-mono font-bold text-primary">{s.inv || s.invoiceNo || s.id}</td>
                              <td className="p-2.5 text-text">{s.items || s.name}</td>
                              <td className="p-2.5 text-center font-mono text-[11px] text-text-muted">{s.mode}</td>
                              <td className="p-2.5 font-mono font-bold text-text text-right">
                                ₹ {Number(s.amt || s.total || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {patientOPD.length > 0 && (
                  <div>
                    <h5 className="font-bold text-text mb-2 text-xs">Doctor Consultations & OPD Visits:</h5>
                    <div className="overflow-x-auto border border-border rounded-2xl bg-surface backdrop-blur-md">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-bg text-text-muted font-bold border-b border-border text-[11px]">
                          <tr>
                            <th className="p-2.5">Visit Date</th>
                            <th className="p-2.5">Doctor</th>
                            <th className="p-2.5">BP / Vitals</th>
                            <th className="p-2.5">Next Re-visit</th>
                            <th className="p-2.5 text-right">Fees (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border text-text">
                          {patientOPD.map(v => (
                            <tr key={v.id} className="hover:bg-surface transition">
                              <td className="p-2.5 font-mono text-text-muted">{v.date}</td>
                              <td className="p-2.5 font-bold text-primary">{v.doc}</td>
                              <td className="p-2.5 font-mono text-text-muted">{v.bp || '--'} mmHg</td>
                              <td className="p-2.5 font-mono text-emerald-700 dark:text-emerald-300">{v.rvdate || '--'}</td>
                              <td className="p-2.5 font-mono font-bold text-text text-right">
                                ₹ {Number(v.fee || 0).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {selectedPatient.bloodTests && selectedPatient.bloodTests.length > 0 && (
                  <div className="p-4 bg-sky-500/10 border border-sky-500/20 rounded-2xl text-xs space-y-1.5 backdrop-blur-md">
                    <p className="font-bold text-sky-700 dark:text-sky-300">Advised Diagnostic Tests:</p>
                    <ul className="list-disc pl-4 text-sky-800 dark:text-sky-200 text-[11px] space-y-0.5">
                      {selectedPatient.bloodTests.map((t, idx) => (
                        <li key={idx}>{t}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-bg hover:bg-border text-text font-semibold rounded-2xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
