import React, { useState } from 'react';
import { Boxes, Plus, X } from 'lucide-react';
import { Distributor, InvoiceConfig, Medicine, MedicineGroup } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';

// Which physical form the stock is sold in. Every type still stores its
// "how many units in one pack" count in Medicine.tabsPerStrip (field name
// kept for backward compat with existing data/backend) — this just controls
// the input's label, the unit name used for the loose-dispensing price
// preview, and the suffix baked into the free-text `pack` field.
type PackType = 'Strip' | 'Bottle' | 'Tube' | 'Vial' | 'Sachet' | 'Box' | 'Jar' | 'Ampoule' | 'Other';

const PACK_TYPE_CONFIG: Record<PackType, { fieldLabel: string; unitWord: string; packSuffix: string }> = {
  Strip: { fieldLabel: 'Tablets / Capsules per Strip', unitWord: 'tablet', packSuffix: '*T' },
  Bottle: { fieldLabel: 'ml per Bottle', unitWord: 'ml', packSuffix: 'ML' },
  Tube: { fieldLabel: 'gm per Tube', unitWord: 'gm', packSuffix: 'GM' },
  Vial: { fieldLabel: 'ml per Vial', unitWord: 'ml', packSuffix: 'ML' },
  Ampoule: { fieldLabel: 'ml per Ampoule', unitWord: 'ml', packSuffix: 'ML' },
  Sachet: { fieldLabel: 'Units per Sachet', unitWord: 'unit', packSuffix: 'Sachets' },
  Box: { fieldLabel: 'Units per Box', unitWord: 'unit', packSuffix: 'Units' },
  Jar: { fieldLabel: 'gm per Jar', unitWord: 'gm', packSuffix: 'GM' },
  Other: { fieldLabel: 'Units per Pack', unitWord: 'unit', packSuffix: 'Units' },
};

interface AddStockModalProps {
  isOpen: boolean;
  invoiceConfig?: InvoiceConfig;
  onClose: () => void;
  distributors: Distributor[];
  setDistributors: React.Dispatch<React.SetStateAction<Distributor[]>>;
  medicineGroups: MedicineGroup[];
  onSaveMedicine: (medicine: Medicine) => void;
}

export const AddStockModal: React.FC<AddStockModalProps> = ({
  isOpen,
  invoiceConfig,
  onClose,
  distributors,
  setDistributors,
  medicineGroups,
  onSaveMedicine,
}) => {
  const currencySymbol = getCurrencySymbol(invoiceConfig?.currency);
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  // '' means "nothing chosen yet" and is a real <option> below — never a
  // hardcoded distributor name, which could silently desync from the
  // dropdown's actual options (e.g. that name no longer existing in
  // `distributors`) and leave the CUSTOM text input unreachable.
  const [distSelect, setDistSelect] = useState('');
  const [distCustom, setDistCustom] = useState('');
  const [distGst, setDistGst] = useState('');
  const [distPhone, setDistPhone] = useState('');
  const [distAddr, setDistAddr] = useState('');

  const [salt, setSalt] = useState('');
  const [batch, setBatch] = useState('');
  const [hsn, setHsn] = useState('');
  const [gst, setGst] = useState('');
  const [group, setGroup] = useState('General');
  const [rack, setRack] = useState('');
  const [stock, setStock] = useState('');
  const [rate, setRate] = useState('');
  const [omrp, setOmrp] = useState('');
  const [mrp, setMrp] = useState('');
  const [packType, setPackType] = useState<PackType>('Strip');
  const [tabsPerStrip, setTabsPerStrip] = useState('');
  const [expiry, setExpiry] = useState('');

  const unitsPerPack = parseInt(tabsPerStrip, 10) || 0;
  const mrpNum = parseFloat(mrp) || 0;
  const loosePrice = unitsPerPack > 0 ? mrpNum / unitsPerPack : 0;

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter medicine name');
      return;
    }
    if (!distSelect) {
      alert('Please select or type a distributor / supplier');
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

    const packSuffix = PACK_TYPE_CONFIG[packType].packSuffix;
    const packUnits = parseInt(tabsPerStrip, 10) || 10;
    const packStr = packSuffix === '*T' ? `${packUnits}*T` : `${packUnits} ${packSuffix}`;

    const newMed: Medicine = {
      id: Date.now().toString(),
      name: name.trim(),
      company: company.trim() || 'Standard Pharma',
      dist: finalDist,
      salt: salt.trim() || name.trim(),
      batch: batch.trim() || 'GEN-' + Math.floor(100 + Math.random() * 900),
      hsn: hsn.trim() || '300490',
      pack: packStr,
      group: group,
      rack: rack.trim() || 'RACK-GEN',
      stock: parseInt(stock, 10) || 0,
      rate: parseFloat(rate) || 0,
      omrp: parseFloat(omrp) || 0,
      mrp: parseFloat(mrp) || 0,
      scheme: '0.00',
      gst: parseFloat(gst) || 0,
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
                  required
                >
                  <option value="" disabled className="bg-surface text-text-muted">
                    -- Select Distributor --
                  </option>
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
              <label className="font-medium text-text-muted block mb-1">GST / Tax Rate (%)</label>
              <input
                type="number"
                step="0.01"
                value={gst}
                onChange={e => setGst(e.target.value)}
                placeholder="12.00"
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
                  : ['General']
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
              <label className="font-medium text-text-muted block mb-1">Purchase Rate ({currencySymbol})</label>
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
              <label className="font-medium text-text-muted block mb-1">Old MRP (O.MRP) ({currencySymbol})</label>
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
              <label className="font-medium text-text-muted block mb-1">Current MRP ({currencySymbol})</label>
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
              <label className="font-medium text-text-muted block mb-1">Pack Type</label>
              <select
                value={packType}
                onChange={e => setPackType(e.target.value as PackType)}
                className="w-full p-2.5 bg-surface border border-border rounded-xl text-text outline-none focus:border-primary"
              >
                {(Object.keys(PACK_TYPE_CONFIG) as PackType[]).map(t => (
                  <option key={t} value={t} className="bg-surface text-text">
                    {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-medium text-text-muted block mb-1">
                {PACK_TYPE_CONFIG[packType].fieldLabel}
              </label>
              <input
                type="number"
                value={tabsPerStrip}
                onChange={e => setTabsPerStrip(e.target.value)}
                placeholder={packType === 'Strip' ? '10' : '100'}
                className="w-full p-2.5 bg-surface border border-border rounded-xl font-mono text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg"
              />
              {unitsPerPack > 0 && mrpNum > 0 && (
                <p className="mt-1 text-[10px] text-text-muted">
                  ≈ <span className="font-mono font-semibold text-primary">{currencySymbol} {loosePrice.toFixed(2)}</span>{' '}
                  per {PACK_TYPE_CONFIG[packType].unitWord} for loose dispensing (GST-inclusive, same rate as the {packType.toLowerCase()})
                </p>
              )}
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
