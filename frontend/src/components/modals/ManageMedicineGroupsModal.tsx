import React, { useEffect, useState } from 'react';
import { Check, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { MedicineGroup } from '../../types';
import { Setter } from '../../hooks/useSyncedResource';

interface ManageMedicineGroupsModalProps {
  isOpen: boolean;
  onClose: () => void;
  groups: MedicineGroup[];
  setGroups: Setter<MedicineGroup[]>;
}

// Manages the "Doctor Specific Group" picklist used when adding/editing
// stock (see AddStockModal) — previously two hardcoded <option>s, now an
// admin-editable list so a new doctor arrangement doesn't need a code
// change. `setGroups` is the syncing setter from useSyncedList (same
// pattern as every other entity in this app) — plain array edits here are
// diffed and translated into the matching create/update/delete calls.
export const ManageMedicineGroupsModal: React.FC<ManageMedicineGroupsModalProps> = ({
  isOpen,
  onClose,
  groups,
  setGroups,
}) => {
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  useEffect(() => {
    if (isOpen) {
      setNewName('');
      setEditingId(null);
      setEditingName('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    setGroups(prev => [...prev, { id: 'GRP-' + Date.now(), name }].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName('');
  };

  const startEdit = (g: MedicineGroup) => {
    setEditingId(g.id);
    setEditingName(g.name);
  };

  const handleRename = (g: MedicineGroup) => {
    const name = editingName.trim();
    if (name && name !== g.name) {
      setGroups(prev => prev.map(x => (x.id === g.id ? { ...x, name } : x)).sort((a, b) => a.name.localeCompare(b.name)));
    }
    setEditingId(null);
  };

  const handleDelete = (g: MedicineGroup) => {
    if (!confirm(`Remove "${g.name}"? Stock already tagged with this group keeps its existing value.`)) return;
    setGroups(prev => prev.filter(x => x.id !== g.id));
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-md w-full p-6 space-y-4 text-xs text-text max-h-[90vh] overflow-y-auto animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Tags className="w-4 h-4" />
            </div>
            <span>Manage Doctor / Stock Groups</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-text-muted">
          These are the options offered in "Doctor Specific Group" when adding or editing stock.
        </p>

        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {groups.length === 0 && <p className="text-text-muted p-2">No groups yet — add one below.</p>}
          {groups.map(g => (
            <div key={g.id} className="flex items-center gap-2 p-2 bg-surface border border-border rounded-xl">
              {editingId === g.id ? (
                <>
                  <input
                    autoFocus
                    value={editingName}
                    onChange={e => setEditingName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleRename(g)}
                    className="flex-1 p-1.5 bg-bg border border-border rounded-lg text-text outline-none focus:border-primary"
                  />
                  <button
                    onClick={() => handleRename(g)}
                    className="text-emerald-400 hover:text-emerald-300 p-1 cursor-pointer"
                    title="Save"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-text-muted hover:text-text p-1 cursor-pointer" title="Cancel">
                    <X className="w-4 h-4" />
                  </button>
                </>
              ) : (
                <>
                  <span className="flex-1 font-medium text-text">{g.name}</span>
                  <button
                    onClick={() => startEdit(g)}
                    className="text-text-muted hover:text-primary p-1 cursor-pointer"
                    title="Rename"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(g)}
                    className="text-text-muted hover:text-danger p-1 cursor-pointer"
                    title="Remove"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        <form onSubmit={handleAdd} className="flex items-center gap-2 pt-3 border-t border-border">
          <input
            value={newName}
            onChange={e => setNewName(e.target.value)}
            placeholder="e.g. Dr. Anika Roy"
            className="flex-1 p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="px-4 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Add</span>
          </button>
        </form>
      </div>
    </div>
  );
};
