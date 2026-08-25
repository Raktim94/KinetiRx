import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ShoppingCart, X } from 'lucide-react';
import { Distributor, Medicine, NeededMedOrder } from '../../types';

interface LowStockReorderModalProps {
  isOpen: boolean;
  onClose: () => void;
  medicines: Medicine[];
  distributors: Distributor[];
  onCreateNeededMeds: (orders: NeededMedOrder[]) => void;
}

interface RowState {
  selected: boolean;
  qty: number;
  distributor: string;
}

const DEFAULT_THRESHOLD = 10;
const DEFAULT_REORDER_QTY = 20;

// Bulk-creates "needed medicine" orders (see AddNeedMedModal) for whatever's
// currently below the stock threshold, so restocking a dozen low-stock items
// doesn't mean opening the single-item Add Need-Med modal a dozen times.
export const LowStockReorderModal: React.FC<LowStockReorderModalProps> = ({
  isOpen,
  onClose,
  medicines,
  distributors,
  onCreateNeededMeds,
}) => {
  const [threshold, setThreshold] = useState(DEFAULT_THRESHOLD);
  const [search, setSearch] = useState('');
  const [rows, setRows] = useState<Record<string, RowState>>({});

  const lowStock = useMemo(
    () =>
      medicines
        .filter(m => !m.isLabTest && m.trackStock !== false && m.stock <= threshold)
        .filter(m => m.name.toLowerCase().includes(search.toLowerCase()))
        .sort((a, b) => a.stock - b.stock),
    [medicines, threshold, search]
  );

  useEffect(() => {
    if (!isOpen) return;
    setRows(prev => {
      const next: Record<string, RowState> = {};
      for (const m of lowStock) {
        next[m.id] = prev[m.id] ?? {
          selected: false,
          qty: DEFAULT_REORDER_QTY,
          distributor: m.dist || distributors[0]?.name || '',
        };
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, medicines, threshold]);

  if (!isOpen) return null;

  const selectedCount = Object.values(rows).filter((r: RowState) => r.selected).length;
  const allSelected = lowStock.length > 0 && lowStock.every(m => rows[m.id]?.selected);

  const toggleAll = () => {
    setRows(prev => {
      const next = { ...prev };
      for (const m of lowStock) {
        next[m.id] = { ...next[m.id], selected: !allSelected };
      }
      return next;
    });
  };

  const handleSubmit = () => {
    const orders: NeededMedOrder[] = lowStock
      .filter(m => rows[m.id]?.selected)
      .map((m, i) => ({
        id: 'NM-' + Date.now() + '-' + i,
        med: m.name,
        name: 'Stock Reorder',
        phone: 'N/A',
        dist: rows[m.id].distributor || m.dist || 'Unassigned',
        time: 'Bulk Reorder — ' + new Date().toLocaleDateString(),
        qty: rows[m.id].qty,
        status: 'Distributor Ordered',
      }));
    if (orders.length === 0) return;
    onCreateNeededMeds(orders);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-3xl w-full p-6 space-y-4 text-xs text-text max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <span>Bulk Reorder Low Stock</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2">
            <span className="text-text-muted font-medium">Threshold (units):</span>
            <input
              type="number"
              min={1}
              value={threshold}
              onChange={e => setThreshold(Math.max(1, Number(e.target.value) || 1))}
              className="w-20 p-2 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
            />
          </label>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search medicine…"
            className="flex-1 min-w-[160px] p-2 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary"
          />
        </div>

        {lowStock.length === 0 ? (
          <p className="text-text-muted p-6 text-center">No medicines at or below this threshold.</p>
        ) : (
          <div className="border border-border rounded-2xl overflow-hidden">
            <table className="w-full">
              <thead className="bg-surface-elevated">
                <tr className="text-left text-text-muted">
                  <th className="p-2.5 w-8">
                    <input type="checkbox" checked={allSelected} onChange={toggleAll} className="rounded" />
                  </th>
                  <th className="p-2.5">Medicine</th>
                  <th className="p-2.5">Current Stock</th>
                  <th className="p-2.5">Reorder Qty</th>
                  <th className="p-2.5">Distributor</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map(m => {
                  const row = rows[m.id];
                  if (!row) return null;
                  return (
                    <tr key={m.id} className="border-t border-border">
                      <td className="p-2.5">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={e => setRows(prev => ({ ...prev, [m.id]: { ...row, selected: e.target.checked } }))}
                          className="rounded"
                        />
                      </td>
                      <td className="p-2.5 font-medium text-text">{m.name}</td>
                      <td className="p-2.5 text-rose-400 font-mono">{m.stock}</td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min={1}
                          value={row.qty}
                          onChange={e =>
                            setRows(prev => ({ ...prev, [m.id]: { ...row, qty: Math.max(1, Number(e.target.value) || 1) } }))
                          }
                          className="w-20 p-1.5 bg-surface border border-border rounded-lg text-text outline-none focus:border-primary"
                        />
                      </td>
                      <td className="p-2.5">
                        <select
                          value={row.distributor}
                          onChange={e => setRows(prev => ({ ...prev, [m.id]: { ...row, distributor: e.target.value } }))}
                          className="w-full p-1.5 bg-surface border border-border rounded-lg text-text outline-none focus:border-primary"
                        >
                          <option value="">Unassigned</option>
                          {distributors.map(d => (
                            <option key={d.id} value={d.name}>
                              {d.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex justify-end gap-3 pt-3 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-text-muted hover:text-text bg-surface hover:bg-bg rounded-2xl font-medium transition cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selectedCount === 0}
            className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-text font-bold rounded-2xl shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Create {selectedCount || ''} Reorder{selectedCount === 1 ? '' : 's'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
