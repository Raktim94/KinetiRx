import React, { useState } from 'react';
import {
  AlertTriangle,
  Boxes,
  Coins,
  Download,
  Filter,
  FlaskConical,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  Stethoscope,
  Tags,
  Trash2,
  Truck,
} from 'lucide-react';
import { Medicine } from '../../types';
import { exportToCSV } from '../../utils/exportCsv';

interface InventoryTabProps {
  medicines: Medicine[];
  setMedicines?: React.Dispatch<React.SetStateAction<Medicine[]>>;
  onOpenAddStockModal: () => void;
  onOpenAddLabStockModal: () => void;
  onOpenDistributorsModal: () => void;
  onOpenManageGroupsModal: () => void;
  onOpenLowStockReorderModal: () => void;
}

export const InventoryTab: React.FC<InventoryTabProps> = ({
  medicines,
  setMedicines,
  onOpenAddStockModal,
  onOpenAddLabStockModal,
  onOpenDistributorsModal,
  onOpenManageGroupsModal,
  onOpenLowStockReorderModal,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'meds' | 'labs' | 'low' | 'expiry'>('all');

  const filtered = medicines.filter(m => {
    const q = search.toLowerCase();
    const matchesSearch =
      m.name.toLowerCase().includes(q) ||
      (m.salt && m.salt.toLowerCase().includes(q)) ||
      (m.company && m.company.toLowerCase().includes(q)) ||
      (m.dist && m.dist.toLowerCase().includes(q)) ||
      (m.batch && m.batch.toLowerCase().includes(q)) ||
      (m.rack && m.rack.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (filterType === 'meds') return !m.isLabTest && m.itemType !== 'lab_test';
    if (filterType === 'labs') return m.isLabTest || m.itemType === 'lab_test';
    if (filterType === 'low') return !m.isLabTest && m.stock <= 10;
    if (filterType === 'expiry') return !m.isLabTest && m.expiry <= '2026-12';
    return true;
  });

  const physicalMeds = medicines.filter(m => !m.isLabTest && m.itemType !== 'lab_test');
  const labItems = medicines.filter(m => m.isLabTest || m.itemType === 'lab_test');

  const totalStockUnits = physicalMeds.reduce((sum, m) => sum + (m.stock || 0), 0);
  const totalValuation = physicalMeds.reduce(
    (sum, m) => sum + (m.rate || m.mrp * 0.7) * m.stock,
    0
  );
  const totalRetailValue = physicalMeds.reduce(
    (sum, m) => sum + m.mrp * m.stock,
    0
  );

  const handleExportCSV = () => {
    exportToCSV(
      'medicine_and_lab_inventory',
      [
        'Item Type',
        'Name',
        'Brand / Company',
        'Pack / Specimen',
        'Distributor / Lab Wing',
        'HSN Code',
        'Batch / Service ID',
        'Stock Tracking / Units',
        'Purchase / Cost Rate (INR)',
        'Old MRP (INR)',
        'Selling MRP / Fee (INR)',
        'GST %',
        'Discount %',
        'Expiry Date',
        'Rack / Chamber',
      ],
      medicines.map(m => [
        m.isLabTest ? 'Lab Test / Diagnostic' : 'Medicine (Physical)',
        m.name,
        m.company,
        m.pack,
        m.dist,
        m.hsn,
        m.batch,
        m.isLabTest ? (m.trackStock ? `${m.stock} Kits` : 'Service (No Limit)') : `${m.stock} Strips`,
        m.rate.toFixed(2),
        m.omrp.toFixed(2),
        m.mrp.toFixed(2),
        m.gst,
        m.disc,
        m.expiry,
        m.rack,
      ])
    );
  };

  const handleDeleteItem = (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}" from inventory?`)) return;
    if (setMedicines) {
      setMedicines(prev => prev.filter(m => m.id !== id));
    }
  };

  const handleClearAllInventory = () => {
    if (medicines.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete ALL ${medicines.length} medicine & lab inventory items? This will reset your stock to 0.`)) return;
    if (setMedicines) {
      setMedicines([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="p-6 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl flex justify-between items-center flex-wrap gap-4 text-text">
        <div>
          <h3 className="text-base font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Boxes className="w-4 h-4" />
            </div>
            <span>Medicine & Lab Stock Management</span>
          </h3>
          <p className="text-xs text-text-muted mt-1">
            Real-time rack location, loose unit dispensing, batch, HSN, purchase rate, lab test services, and expiry tracking.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {medicines.length > 0 && (
            <button
              id="btn-clear-all-stock"
              onClick={handleClearAllInventory}
              className="bg-danger/15 hover:bg-danger/25 text-danger border border-danger/30 font-semibold px-3 py-2 rounded-2xl text-xs flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
              title="Delete all medicine records"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear All Stock</span>
            </button>
          )}

          <button
            onClick={onOpenDistributorsModal}
            className="bg-surface-elevated hover:bg-border text-text border border-border font-semibold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
          >
            <Truck className="w-3.5 h-3.5 text-primary" />
            <span>Manage Distributors</span>
          </button>

          <button
            onClick={onOpenManageGroupsModal}
            className="bg-surface-elevated hover:bg-border text-text border border-border font-semibold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 backdrop-blur-md transition cursor-pointer"
          >
            <Tags className="w-3.5 h-3.5 text-primary" />
            <span>Manage Groups</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="bg-success hover:brightness-105 text-primary-foreground font-bold px-3.5 py-2 rounded-2xl text-xs flex items-center gap-1.5 shadow-lg transition cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          {/* ADD NEW STOCK BUTTON */}
          <button
            id="btn-add-new-stock"
            onClick={onOpenAddStockModal}
            className="bg-primary hover:bg-primary-hover text-primary-foreground px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-primary/30 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add New Stock</span>
          </button>

          {/* ADD NEW LAB STOCK BUTTON (NEXT TO ADD NEW STOCK) */}
          <button
            id="btn-add-new-lab-stock"
            onClick={onOpenAddLabStockModal}
            className="bg-accent hover:brightness-105 text-primary-foreground px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-1.5 shadow-lg border border-accent/40 transition cursor-pointer"
          >
            <FlaskConical className="w-4 h-4" />
            <span>+ Add New Lab Stock</span>
          </button>
        </div>
      </div>

      {/* Metric summary banner */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="p-5 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl flex justify-between items-center text-text">
          <div>
            <p className="text-xs font-medium text-text-muted">Total Medicine SKUs</p>
            <h4 className="text-lg font-bold text-text font-mono mt-1">
              {physicalMeds.length} Items ({totalStockUnits} Units)
            </h4>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 text-primary flex items-center justify-center">
            <Boxes className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl flex justify-between items-center text-text">
          <div>
            <p className="text-xs font-medium text-text-muted">Lab Test SKUs</p>
            <h4 className="text-lg font-bold text-text font-mono mt-1">
              {labItems.length} Tests / Services
            </h4>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-accent/15 border border-accent/30 text-accent flex items-center justify-center">
            <FlaskConical className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl flex justify-between items-center text-text">
          <div>
            <p className="text-xs font-medium text-text-muted">Purchase Stock Valuation</p>
            <h4 className="text-lg font-bold text-warning font-mono mt-1">
              ₹ {totalValuation.toFixed(2)}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-warning/15 border border-warning/30 text-warning flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl flex justify-between items-center text-text">
          <div>
            <p className="text-xs font-medium text-text-muted">Total MRP Retail Value</p>
            <h4 className="text-lg font-bold text-success font-mono mt-1">
              ₹ {totalRetailValue.toFixed(2)}
            </h4>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-success/15 border border-success/30 text-success flex items-center justify-center">
            <Coins className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-surface border border-border rounded-2xl backdrop-blur-md flex-wrap">
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === 'all'
                ? 'bg-primary text-primary-foreground shadow-md shadow-primary/30'
                : 'text-text-muted hover:text-text'
            }`}
          >
            All Stock ({medicines.length})
          </button>
          <button
            onClick={() => setFilterType('meds')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === 'meds'
                ? 'bg-blue-600 text-text shadow-md'
                : 'text-text-muted hover:text-text'
            }`}
          >
            💊 Medicines Only ({physicalMeds.length})
          </button>
          <button
            onClick={() => setFilterType('labs')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === 'labs'
                ? 'bg-purple-600 text-text shadow-md'
                : 'text-text-muted hover:text-text'
            }`}
          >
            🧪 Lab Tests & Services ({labItems.length})
          </button>
          <button
            onClick={() => setFilterType('low')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === 'low'
                ? 'bg-rose-600 text-text shadow-md'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Low Stock (&le; 10 units)
          </button>
          {filterType === 'low' && (
            <button
              onClick={onOpenLowStockReorderModal}
              className="px-3 py-1.5 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-500 text-text shadow-md flex items-center gap-1.5 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>Bulk Reorder</span>
            </button>
          )}
          <button
            onClick={() => setFilterType('expiry')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
              filterType === 'expiry'
                ? 'bg-amber-600 text-text shadow-md'
                : 'text-text-muted hover:text-text'
            }`}
          >
            Short Expiry (&le; 6 Months)
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-text-muted absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search medicine, lab test, brand, salt, batch..."
            className="pl-9 pr-3 py-2 bg-surface border border-border rounded-2xl text-xs w-72 text-text placeholder:text-text-muted outline-none focus:border-primary backdrop-blur-md"
          />
        </div>
      </div>

      {/* Inventory table */}
      <div className="bg-surface backdrop-blur-xl border border-border rounded-3xl shadow-xl overflow-x-auto text-xs text-text">
        <table className="w-full text-left border-collapse min-w-[1050px]">
          <thead className="bg-surface-elevated border-b border-border text-[11px] font-semibold text-text-muted uppercase sticky top-0 backdrop-blur-md">
            <tr>
              <th className="p-3.5">Item Name & Brand</th>
              <th className="p-3.5">Salt / Parameter</th>
              <th className="p-3.5">Category / Supplier</th>
              <th className="p-3.5">Stock Tracking</th>
              <th className="p-3.5">Old MRP</th>
              <th className="p-3.5">Selling MRP</th>
              <th className="p-3.5">Purchase / Cost</th>
              <th className="p-3.5">GST & Disc</th>
              <th className="p-3.5 font-bold text-text">Stock Valuation</th>
              <th className="p-3.5">Expiry / Validity</th>
              <th className="p-3.5">Rack / Chamber</th>
              <th className="p-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody id="inventory-table-rows" className="divide-y divide-border text-text">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={12} className="p-8 text-center text-text-muted">
                  No medicine or lab stock items found matching criteria.
                </td>
              </tr>
            ) : (
              filtered.map(i => {
                const isLab = i.isLabTest || i.itemType === 'lab_test';
                const isLow = !isLab && i.stock <= 10;
                const isShortExpiry = !isLab && i.expiry <= '2026-12';
                const stockVal = isLab
                  ? (i.trackStock ? (i.rate || i.mrp * 0.5) * i.stock : 0)
                  : (i.rate || i.mrp * 0.7) * i.stock;

                return (
                  <tr
                    key={i.id}
                    className={`hover:bg-surface transition ${
                      isLab ? 'bg-purple-950/10 hover:bg-purple-900/20' : ''
                    }`}
                  >
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        {isLab && (
                          <span className="w-5 h-5 rounded-md bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-700 dark:text-purple-300 shrink-0">
                            <FlaskConical className="w-3 h-3" />
                          </span>
                        )}
                        <span className="font-bold text-text block">{i.name}</span>
                      </div>
                      <span className="text-[10px] text-text-muted flex items-center gap-1.5 mt-0.5">
                        <span className="text-purple-700 dark:text-purple-300 font-semibold">{i.company || 'Standard'}</span>
                        <span>•</span>
                        <span>Pack: <b className="text-text-muted">{i.pack || (isLab ? '1 Test' : '10*T')}</b></span>
                        {isLab && (
                          <span className="px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-700 dark:text-purple-300 text-[9px] font-bold">
                            LAB ITEM
                          </span>
                        )}
                      </span>
                    </td>

                    <td className="p-3.5 text-text-muted max-w-[200px]">
                      <span className="text-[11px] font-medium leading-snug line-clamp-2">
                        {i.salt || 'N/A'}
                      </span>
                    </td>

                    <td className="p-3.5 font-medium text-primary">
                      {i.dist || i.group}
                    </td>

                    {/* Stock Units / Tracking */}
                    <td className="p-3.5 font-bold font-mono">
                      {isLab ? (
                        i.trackStock ? (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30">
                            {i.stock} Kits (Tracked)
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full text-xs bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 flex items-center gap-1 w-fit">
                            <span>Service (No Limit)</span>
                          </span>
                        )
                      ) : (
                        <span
                          className={`px-2.5 py-1 rounded-full text-xs ${
                            isLow
                              ? 'bg-rose-500/20 text-rose-700 dark:text-rose-300 border border-rose-500/30'
                              : 'bg-surface-elevated text-text border border-border'
                          }`}
                        >
                          {i.stock} Strips
                        </span>
                      )}
                    </td>

                    <td className="p-3.5 font-mono text-text-muted">
                      ₹ {(i.omrp || 0).toFixed(2)}
                    </td>

                    <td className="p-3.5 font-bold font-mono text-text">
                      ₹ {i.mrp.toFixed(2)}
                    </td>

                    <td className="p-3.5 font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                      ₹ {(i.rate || 0).toFixed(2)}
                    </td>

                    <td className="p-3.5 text-[11px] font-mono text-text-muted">
                      {i.gst || 0}% / {i.disc || 0}%
                    </td>

                    <td className="p-3.5 font-mono font-bold text-primary bg-surface">
                      {isLab && !i.trackStock ? (
                        <span className="text-text-muted font-normal text-[11px]">Service Charge</span>
                      ) : (
                        `₹ ${stockVal.toFixed(2)}`
                      )}
                    </td>

                    <td
                      className={`p-3.5 font-mono font-semibold ${
                        isShortExpiry ? 'text-amber-700 dark:text-amber-300 bg-amber-500/10 font-bold' : 'text-text-muted'
                      }`}
                    >
                      {isLab ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">Active Service</span>
                      ) : (
                        <>
                          {i.expiry}
                          {isShortExpiry && (
                            <span className="block text-[9px] text-amber-600 dark:text-amber-400 font-bold uppercase">
                              Expiring Soon
                            </span>
                          )}
                        </>
                      )}
                    </td>

                    <td className="p-3.5">
                      <span className={`font-mono px-2.5 py-1 rounded-lg border text-[11px] ${
                        isLab
                          ? 'bg-purple-500/15 border-purple-500/30 text-purple-800 dark:text-purple-200'
                          : 'bg-surface-elevated border-border text-text-muted'
                      }`}>
                        {i.rack || (isLab ? 'LAB-CHAMBER' : 'RACK-A1')}
                      </span>
                    </td>

                    <td className="p-3.5 text-right">
                      <button
                        onClick={() => handleDeleteItem(i.id, i.name)}
                        className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/30 text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-200 transition border border-rose-500/20"
                        title={`Delete ${i.name}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

