import React, { useState } from 'react';
import { Boxes, Plus, X } from 'lucide-react';
import { Distributor, Medicine, MedicineGroup } from '../../types';

interface AddStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  distributors: Distributor[];
  setDistributors: React.Dispatch<React.SetStateAction<Distributor[]>>;
  medicineGroups: MedicineGroup[];
  onSaveMedicine: (medicine: Medicine) => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  onClose,
  distributors,
  setDistributors,
  medicineGroups,
  onSaveMedicine,
}) => {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('Micro Labs / Cipla');
  const [distSelect, setDistSelect] = useState('NEW UMA MEDICINE DISTRIBUTOR');
  const [distCustom, setDistCustom] = useState('');
  const [distGst, setDistGst] = useState('');
  const [distPhone, setDistPhone] = useState('');
  const [distAddr, setDistAddr] = useState('');

  const [salt, setSalt] = useState('');
  const [batch, setBatch] = useState('B26001');
  const [hsn, setHsn] = useState('300490');
  const [group, setGroup] = useState('General');
  const [rack, setRack] = useState('RACK-A1');
  const [stock, setStock] = useState('50');
  const [rate, setRate] = useState('22.00');
  const [omrp, setOmrp] = useState('0.00');
  const [mrp, setMrp] = useState('30.00');
  const [tabsPerStrip, setTabsPerStrip] = useState('10');
  const [expiry, setExpiry] = useState('2027-12');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter medicine name');
      return;
    }

    let finalDist = distSelect;
    if (distSelect === 'CUSTOM') {
      finalDist = distCustom.trim() || 'General Supplier';
      setDistributors(prev => [
        {
          id: 'DIST-' + Date.now(),
          name: finalDist,
          gstin: distGst.trim() || 'N/A',
          phone: distPhone.trim() || 'N/A',
          addr: distAddr.trim() || 'N/A',
        },
        ...prev,
      ]);
    }

    const newMed: Medicine = {
      id: Date.now().toString(),
      name: name.trim(),
      company: company.trim() || 'Standard Pharma',
      dist: finalDist,
      salt: salt.trim() || name.trim(),
      batch: batch.trim() || 'GEN-' + Math.floor(100 + Math.random() * 900),
      hsn: hsn.trim() || '300490',
      pack: `${tabsPerStrip}*T`,
      group: group,
      rack: rack.trim() || 'RACK-GEN',
      stock: parseInt(stock, 10) || 0,
      rate: parseFloat(rate) || 0,
      omrp: parseFloat(omrp) || 0,
      mrp: parseFloat(mrp) || 0,
      scheme: '0.00',
      gst: 12.0,
      disc: 4.0,
      tabsPerStrip: parseInt(tabsPerStrip, 10) || 10,
      expiry: expiry || '2027-12',
    };

    onSaveMedicine(newMed);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-lg w-full p-6 space-y-4 text-xs text-text max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
              <Boxes className="w-4 h-4" />
            </div>
            <span>Add New Medicine Stock</span>
          </h3>
          <button onClick={onClose} className="text-text-muted hover:text-text p-1 rounded-lg transition cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3.5">
            <div>
              <label className="font-medium text-text-muted block mb-1">Medicine Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Paracetamol 650mg"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
                required
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Company / Brand</label>
              <input
                type="text"
                value={company}
                onChange={e => setCompany(e.target.value)}
                placeholder="e.g. Micro Labs / Cipla"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div className="col-span-2">
              <label className="font-medium text-text-muted block mb-1">Distributor / Supplier</label>
              <div className="flex gap-2">
                <select
                  value={distSelect}
                  onChange={e => setDistSelect(e.target.value)}
                  className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
                >
                  {distributors.map(d => (
                    <option key={d.id} value={d.name} className="bg-surface text-text">
                      {d.name}
                    </option>
                  ))}
                  <option value="CUSTOM" className="bg-surface text-primary">-- + Type New Custom Distributor --</option>
                </select>
                {distSelect === 'CUSTOM' && (
                  <input
                    type="text"
                    value={distCustom}
                    onChange={e => setDistCustom(e.target.value)}
                    placeholder="Type distributor name..."
                    className="w-full p-2.5 bg-primary/10 border border-primary/30 rounded-xl text-text placeholder:text-text-muted outline-none"
                    required
                  />
                )}
              </div>
            </div>

            {distSelect === 'CUSTOM' && (
              <div className="col-span-2 grid grid-cols-3 gap-2 bg-surface p-3 rounded-2xl border border-border">
                <input
                  type="text"
                  value={distGst}
                  onChange={e => setDistGst(e.target.value)}
                  placeholder="GSTIN No"
                  className="p-2 bg-surface border border-border rounded-xl text-[11px] font-mono text-text placeholder:text-text-muted outline-none"
                />
                <input
                  type="text"
                  value={distPhone}
                  onChange={e => setDistPhone(e.target.value)}
                  placeholder="Phone"
                  className="p-2 bg-surface border border-border rounded-xl text-[11px] font-mono text-text placeholder:text-text-muted outline-none"
                />
                <input
                  type="text"
                  value={distAddr}
                  onChange={e => setDistAddr(e.target.value)}
                  placeholder="City / Address"
                  className="p-2 bg-surface border border-border rounded-xl text-[11px] text-text placeholder:text-text-muted outline-none"
                />
              </div>
            )}

            <div>
              <label className="font-medium text-text-muted block mb-1">Salt Formulation</label>
              <input
                type="text"
                value={salt}
                onChange={e => setSalt(e.target.value)}
                placeholder="e.g. Paracetamol 650mg"
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Batch Number</label>
              <input
                type="text"
                value={batch}
                onChange={e => setBatch(e.target.value)}
                placeholder="e.g. B26001"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">HSN Code</label>
              <input
                type="text"
                value={hsn}
                onChange={e => setHsn(e.target.value)}
                placeholder="300490"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Doctor Specific Group</label>
              <select
                value={group}
                onChange={e => setGroup(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
              >
                {(medicineGroups.length > 0
                  ? medicineGroups.map(g => g.name)
                  : ['General', 'Dr. Sayan Majumdar', 'Dr. T.K. Khan']
                ).map(name => (
                  <option key={name} value={name} className="bg-surface text-text">
                    {name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Rack ID</label>
              <input
                type="text"
                value={rack}
                onChange={e => setRack(e.target.value)}
                placeholder="RACK-A1"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Stock Quantity (Units)</label>
              <input
                type="number"
                value={stock}
                onChange={e => setStock(e.target.value)}
                placeholder="50"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
                required
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Purchase Rate ₹</label>
              <input
                type="number"
                step="0.01"
                value={rate}
                onChange={e => setRate(e.target.value)}
                placeholder="22.00"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
                required
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Old MRP (O.MRP) ₹</label>
              <input
                type="number"
                step="0.01"
                value={omrp}
                onChange={e => setOmrp(e.target.value)}
                placeholder="0.00"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Current MRP ₹</label>
              <input
                type="number"
                step="0.01"
                value={mrp}
                onChange={e => setMrp(e.target.value)}
                placeholder="30.00"
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono font-bold text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
                required
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Tablets Per Strip</label>
              <input
                type="number"
                value={tabsPerStrip}
                onChange={e => setTabsPerStrip(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">Expiry Date (YYYY-MM)</label>
              <input
                type="month"
                value={expiry}
                onChange={e => setExpiry(e.target.value)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
                required
              />
            </div>
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
              className="px-5 py-2 bg-primary hover:bg-primary-hover text-primary-foreground font-bold rounded-2xl shadow-lg shadow-primary/40 transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save Stock</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
