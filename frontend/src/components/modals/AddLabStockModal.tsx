import React, { useState } from 'react';
import { Activity, FlaskConical, Info, Plus, Sparkles, TestTube2, X } from 'lucide-react';
import { InvoiceConfig, Medicine } from '../../types';
import { getCurrencySymbol } from '../../utils/currency';

interface AddLabStockModalProps {
  isOpen: boolean;
  invoiceConfig?: InvoiceConfig;
  onClose: () => void;
  onSaveLabStock: (labItem: Medicine) => void;
}

const COMMON_LAB_TEMPLATES = [
  {
    name: 'Complete Blood Count (CBC with ESR)',
    brand: 'In-House Pathology Lab',
    salt: 'Hematology Profile (EDTA Whole Blood)',
    mrp: '350.00',
    rate: '90.00',
    rack: 'LAB-HEMA',
  },
  {
    name: 'Blood Glucose (Fasting & PP)',
    brand: 'In-House Diagnostic Centre',
    salt: 'Biochemistry / Fluoride Plasma Glucose',
    mrp: '120.00',
    rate: '30.00',
    rack: 'LAB-BIOCHEM',
  },
  {
    name: 'HbA1c Glycated Hemoglobin Test',
    brand: 'Thyrocare / MRS Diagnostic',
    salt: 'HPLC / Immunoassay Blood Sugar Average',
    mrp: '450.00',
    rate: '150.00',
    rack: 'LAB-BIOCHEM',
  },
  {
    name: 'Lipid Profile Full Panel',
    brand: 'In-House Diagnostic Centre',
    salt: 'Cardiovascular Risk / Serum Cholesterol + Triglycerides + HDL/LDL',
    mrp: '600.00',
    rate: '160.00',
    rack: 'LAB-BIOCHEM',
  },
  {
    name: 'Liver Function Test (LFT Profile)',
    brand: 'In-House Pathology Lab',
    salt: 'Hepatic Enzymes (SGOT, SGPT, Bilirubin, Alk Phos, Protein)',
    mrp: '550.00',
    rate: '140.00',
    rack: 'LAB-BIOCHEM',
  },
  {
    name: 'Kidney Function Test (KFT / RFT with Creatinine)',
    brand: 'In-House Pathology Lab',
    salt: 'Renal Biomarkers (Urea, Serum Creatinine, Uric Acid, Electrolytes)',
    mrp: '500.00',
    rate: '130.00',
    rack: 'LAB-BIOCHEM',
  },
  {
    name: 'Thyroid Profile Total (T3, T4, TSH)',
    brand: 'Thyrocare / In-House Lab',
    salt: 'Chemiluminescence Immunoassay (CLIA Serum)',
    mrp: '400.00',
    rate: '120.00',
    rack: 'LAB-IMMUNO',
  },
  {
    name: 'Urine Routine & Microscopic Examination (R/E & M/E)',
    brand: 'In-House Clinical Pathology',
    salt: 'Urine Physical, Chemical & Microscopic Strip Analysis',
    mrp: '150.00',
    rate: '35.00',
    rack: 'LAB-CLINICAL',
  },
  {
    name: 'Widal Slide Agglutination Test (Typhoid)',
    brand: 'In-House Serology Lab',
    salt: 'Salmonella Typhi & Paratyphi Antigen Serology',
    mrp: '180.00',
    rate: '45.00',
    rack: 'LAB-SEROLOGY',
  },
  {
    name: 'Dengue NS1 Antigen & Antibody Duo Rapid',
    brand: 'In-House Diagnostic',
    salt: 'Immunochromatography Dengue NS1 + IgM/IgG Test',
    mrp: '700.00',
    rate: '220.00',
    rack: 'LAB-SEROLOGY',
  },
  {
    name: '12-Lead Electrocardiogram (ECG)',
    brand: 'Cardio Diagnostic Wing',
    salt: 'Cardiac Electrophysiology Trace & Analysis',
    mrp: '250.00',
    rate: '50.00',
    rack: 'LAB-CARDIO',
  },
  {
    name: 'Digital X-Ray Chest P/A View',
    brand: 'Radiology & Imaging Wing',
    salt: 'Thoracic Diagnostic Radiology & Film Report',
    mrp: '350.00',
    rate: '90.00',
    rack: 'RAD-CHAMBER',
  },
];

export const AddLabStockModal: React.FC<AddLabStockModalProps> = ({
  isOpen,
  invoiceConfig,
  onClose,
  onSaveLabStock,
}) => {
  const currencySymbol = getCurrencySymbol(invoiceConfig?.currency);

  // Required fields according to user request
  const [name, setName] = useState('');
  const [brand, setBrand] = useState('MRS Diagnostic & Lab Services');
  const [salt, setSalt] = useState('');
  const [trackStock, setTrackStock] = useState<boolean>(false);
  const [stockCount, setStockCount] = useState<string>('999');
  const [mrp, setMrp] = useState('350.00');

  // Secondary helpful fields
  const [rate, setRate] = useState('90.00');
  const [rack, setRack] = useState('LAB-CHAMBER');
  const [gst, setGst] = useState('0.0'); // Health diagnostic services often 0% GST
  const [hsn, setHsn] = useState('999312'); // HSN/SAC for diagnostic & medical lab services
  const [batch, setBatch] = useState('LAB-SRV');

  if (!isOpen) return null;

  const handleApplyTemplate = (tmpl: (typeof COMMON_LAB_TEMPLATES)[0]) => {
    setName(tmpl.name);
    setBrand(tmpl.brand);
    setSalt(tmpl.salt);
    setMrp(tmpl.mrp);
    setRate(tmpl.rate);
    setRack(tmpl.rack);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter the Lab Test or Item Name');
      return;
    }

    const finalMrp = parseFloat(mrp) || 0;
    const finalRate = parseFloat(rate) || 0;
    const finalStock = trackStock ? parseInt(stockCount, 10) || 0 : 9999;

    const newLabItem: Medicine = {
      id: `LAB-${Date.now()}`,
      name: name.trim(),
      company: brand.trim() || 'Diagnostic Lab Services',
      dist: brand.trim() || 'In-House Laboratory',
      salt: salt.trim() || 'Diagnostic Laboratory Test Parameter',
      hsn: hsn.trim() || '999312',
      batch: batch.trim() || 'LAB-SERVICE',
      pack: '1 Test / Investigation',
      group: 'Diagnostic & Lab Tests',
      rack: rack.trim() || 'LAB-CHAMBER',
      stock: finalStock,
      rate: finalRate,
      omrp: 0,
      mrp: finalMrp,
      scheme: '0.00',
      gst: parseFloat(gst) || 0,
      disc: 0,
      tabsPerStrip: 1,
      expiry: '2030-12', // Long-term valid for service investigations
      isLabTest: true,
      trackStock: trackStock,
      itemType: 'lab_test',
    };

    onSaveLabStock(newLabItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="glass-panel rounded-3xl max-w-2xl w-full p-6 space-y-4 text-xs text-text max-h-[92vh] overflow-y-auto animate-in zoom-in-95">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-600 dark:text-purple-400">
              <FlaskConical className="w-4 h-4" />
            </div>
            <div>
              <span className="block">Add New Lab Stock / Test Item</span>
              <span className="text-[10px] text-text-muted font-normal">
                Add a new lab test or diagnostic service item
              </span>
            </div>
          </h3>
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text p-1.5 rounded-lg transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informational banner about non-physical lab stock */}
        <div className="p-3 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-start gap-2.5 text-purple-800 dark:text-purple-200">
          <Info className="w-4 h-4 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
          <p className="text-[11px] leading-relaxed">
            <strong>Lab Test Item Note:</strong> Lab tests and diagnostic investigations do not use actual physical strip counts. You can bill them freely, and they will appear in both <b>Medicine Stock ERP</b> and the <b>POS Billing screen</b>.
          </p>
        </div>

        {/* Quick Click Preset Templates */}
        <div className="space-y-1.5">
          <p className="text-[11px] font-semibold text-text-muted flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <span>Popular Lab Test Presets:</span>
          </p>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1.5 bg-surface border border-border rounded-2xl">
            {COMMON_LAB_TEMPLATES.map((tmpl, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleApplyTemplate(tmpl)}
                className="px-2.5 py-1 rounded-xl bg-bg hover:bg-purple-600/30 hover:border-purple-400/50 border border-border text-[10px] text-text hover:text-purple-800 dark:hover:text-purple-200 transition cursor-pointer flex items-center gap-1"
              >
                <TestTube2 className="w-2.5 h-2.5 text-purple-600 dark:text-purple-400" />
                <span>{tmpl.name.split('(')[0].trim()} ({currencySymbol}{tmpl.mrp})</span>
              </button>
            ))}
          </div>
        </div>

        {/* Main Input Form */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* 1. Item Name */}
          <div>
            <label className="block text-[11px] font-bold text-text-muted mb-1">
              Lab Item / Test Name <span className="text-rose-600 dark:text-rose-400">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Complete Blood Count (CBC), Blood Sugar Fasting, Thyroid Profile, etc."
                className="w-full bg-surface border border-border rounded-2xl px-3.5 py-2.5 text-xs text-text placeholder:text-text-muted outline-none focus:border-purple-400 focus:bg-bg transition"
              />
            </div>
          </div>

          {/* 2. Brand & Salt Composition in 2 columns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Brand */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted mb-1">
                Brand / Lab Name
              </label>
              <input
                type="text"
                value={brand}
                onChange={e => setBrand(e.target.value)}
                placeholder="e.g. In-House Lab, Thyrocare, Dr. Lal PathLabs, etc."
                className="w-full bg-surface border border-border rounded-2xl px-3.5 py-2 text-xs text-text placeholder:text-text-muted outline-none focus:border-purple-400 focus:bg-bg transition"
              />
            </div>

            {/* Salt Composition / Diagnostic Parameter */}
            <div>
              <label className="block text-[11px] font-bold text-text-muted mb-1">
                Salt Composition / Test Parameter
              </label>
              <input
                type="text"
                value={salt}
                onChange={e => setSalt(e.target.value)}
                placeholder="e.g. Hematology Profile, Serum Glucose, Immunoassay CLIA"
                className="w-full bg-surface border border-border rounded-2xl px-3.5 py-2 text-xs text-text placeholder:text-text-muted outline-none focus:border-purple-400 focus:bg-bg transition"
              />
            </div>
          </div>

          {/* 3. Stock Tracking Option (Radio / Cards) */}
          <div className="p-3.5 rounded-2xl bg-surface border border-border space-y-2.5">
            <label className="block text-[11px] font-bold text-text-muted">
              Stock Tracking Option
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Option A: No physical stock count (Default) */}
              <label
                onClick={() => setTrackStock(false)}
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                  !trackStock
                    ? 'bg-purple-600/20 border-purple-500 text-text shadow-md'
                    : 'bg-surface border-border text-text-muted hover:bg-bg'
                }`}
              >
                <input
                  type="radio"
                  name="stockTracking"
                  checked={!trackStock}
                  onChange={() => setTrackStock(false)}
                  className="mt-0.5 accent-purple-500"
                />
                <div>
                  <span className="font-bold text-xs block text-text">
                    No Stock Limit (Unlimited Service)
                  </span>
                  <span className="text-[10px] text-text-muted">
                    Stock count won't be tracked - Recommended for lab tests
                  </span>
                </div>
              </label>

              {/* Option B: Track Reagent / Kit Stock */}
              <label
                onClick={() => setTrackStock(true)}
                className={`p-3 rounded-xl border flex items-start gap-2.5 cursor-pointer transition ${
                  trackStock
                    ? 'bg-purple-600/20 border-purple-500 text-text shadow-md'
                    : 'bg-surface border-border text-text-muted hover:bg-bg'
                }`}
              >
                <input
                  type="radio"
                  name="stockTracking"
                  checked={trackStock}
                  onChange={() => setTrackStock(true)}
                  className="mt-0.5 accent-purple-500"
                />
                <div>
                  <span className="font-bold text-xs block text-text">
                    Track Reagent / Kit Stock Count
                  </span>
                  <span className="text-[10px] text-text-muted">
                    Track an exact count of reagents or test kits
                  </span>
                </div>
              </label>
            </div>

            {/* If Track Stock is ON, show physical stock count input */}
            {trackStock && (
              <div className="pt-2">
                <label className="block text-[10px] font-bold text-purple-700 dark:text-purple-300 mb-1">
                  Available Reagent / Kit Test Count:
                </label>
                <input
                  type="number"
                  min="1"
                  value={stockCount}
                  onChange={e => setStockCount(e.target.value)}
                  className="w-48 bg-bg border border-purple-400/50 rounded-xl px-3 py-1.5 text-xs text-text outline-none focus:border-purple-300"
                />
              </div>
            )}
          </div>

          {/* 4. MRP, Cost Rate, Rack & GST in 4 columns */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* MRP */}
            <div>
              <label className="block text-[11px] font-bold text-text mb-1">
                MRP / Test Fee ({currencySymbol}) <span className="text-rose-600 dark:text-rose-400">*</span>
              </label>
              <input
                type="number"
                step="0.5"
                required
                value={mrp}
                onChange={e => setMrp(e.target.value)}
                placeholder="350.00"
                className="w-full bg-surface border border-purple-400/40 rounded-2xl px-3 py-2 text-xs text-text font-mono font-bold outline-none focus:border-purple-400 focus:bg-bg transition"
              />
            </div>

            {/* Purchase Rate / Processing Cost */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted mb-1">
                Lab Cost / Rate ({currencySymbol})
              </label>
              <input
                type="number"
                step="0.5"
                value={rate}
                onChange={e => setRate(e.target.value)}
                placeholder="90.00"
                className="w-full bg-surface border border-border rounded-2xl px-3 py-2 text-xs text-text font-mono outline-none focus:border-purple-400 focus:bg-bg transition"
              />
            </div>

            {/* Lab Chamber / Rack Location */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted mb-1">
                Lab Chamber / Rack
              </label>
              <input
                type="text"
                value={rack}
                onChange={e => setRack(e.target.value)}
                placeholder="LAB-CHAMBER"
                className="w-full bg-surface border border-border rounded-2xl px-3 py-2 text-xs text-text font-mono outline-none focus:border-purple-400 focus:bg-bg transition"
              />
            </div>

            {/* GST % */}
            <div>
              <label className="block text-[11px] font-semibold text-text-muted mb-1">
                GST Rate (%)
              </label>
              <select
                value={gst}
                onChange={e => setGst(e.target.value)}
                className="w-full bg-bg border border-border rounded-2xl px-3 py-2 text-xs text-text outline-none focus:border-purple-400 transition"
              >
                <option value="0.0">0% (Exempt Diagnostics)</option>
                <option value="5.0">5% GST</option>
                <option value="12.0">12% GST</option>
                <option value="18.0">18% GST</option>
              </select>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end items-center gap-3 pt-3 border-t border-border">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl border border-border text-text-muted hover:text-text hover:bg-bg transition cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-2xl bg-purple-600 hover:bg-purple-500 text-text font-bold flex items-center gap-2 shadow-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save Lab Stock Item</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
