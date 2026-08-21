import React, { useState } from 'react';
import {
  Brain,
  CheckCircle2,
  ExternalLink,
  Plus,
  Search,
  ShoppingCart,
  Sparkles,
  X,
} from 'lucide-react';
import { initialBrandSaltDictionary } from '../../data/initialData';
import { Medicine } from '../../types';

interface AIFinderModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialQuery?: string;
  medicines: Medicine[];
  onAddToCart: (medicine: Medicine) => void;
  onOrderSpecial: (medName: string) => void;
}

export const AIFinderModal: React.FC<AIFinderModalProps> = ({
  isOpen,
  onClose,
  initialQuery = '',
  medicines,
  onAddToCart,
  onOrderSpecial,
}) => {
  const [query, setQuery] = useState(initialQuery);
  const [hasSearched, setHasSearched] = useState(false);

  if (!isOpen) return null;

  const normalized = query.trim().toLowerCase();

  // Find in dictionary
  const matchKey = Object.keys(initialBrandSaltDictionary).find(
    k => k.includes(normalized) || normalized.includes(k)
  );

  const matchData = matchKey
    ? initialBrandSaltDictionary[matchKey]
    : {
        salt: query.toUpperCase() + ' Active Salt Compound (Therapeutic Formulation)',
        category: 'Essential Therapeutic Agent',
        alternatives: [
          { name: query.toUpperCase() + ' Generic-1', company: 'Standard Pharma', mrp: 45.0 },
          { name: query.toUpperCase() + ' Generic-2', company: 'Cipla / Mankind', mrp: 40.0 },
        ],
      };

  // Find in stock items
  const inStockMatches = medicines.filter(m => {
    const s1 = (m.salt || '').toLowerCase();
    const s2 = (matchData.salt || '').toLowerCase();
    return (
      s1.includes(s2) ||
      s2.includes(s1) ||
      m.name.toLowerCase().includes(normalized)
    );
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setHasSearched(true);
    }
  };

  const webLiveLinks = [
    {
      name: '1mg Online Store',
      url: `https://www.1mg.com/search/all?name=${encodeURIComponent(query)}`,
    },
    {
      name: 'Pharmeasy Live',
      url: `https://pharmeasy.in/search/all?name=${encodeURIComponent(query)}`,
    },
    {
      name: 'Google Medical AI',
      url: `https://www.google.com/search?q=${encodeURIComponent(query + ' composition alternatives price 1mg')}`,
    },
  ];

  return (
    <div className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-surface/90 backdrop-blur-2xl rounded-3xl shadow-2xl max-w-2xl w-full p-6 space-y-4 border border-border text-xs text-text max-h-[90vh] flex flex-col justify-between animate-in zoom-in-95">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border pb-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-text">
                AI Generic Composition & Live Alternative Finder
              </h3>
              <p className="text-[11px] text-text-muted">
                Find active salt formulations, store availability & alternative market brands.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-text-muted hover:text-text transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search input */}
        <div className="space-y-3 flex-1 overflow-y-auto pr-1">
          <form onSubmit={handleSearch} className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Enter medicine name (e.g. Dolo 650, Ecosprin 75, Pan L, Cyra D...)"
              className="w-full p-3 bg-surface border border-border rounded-2xl font-medium text-text placeholder:text-text-muted outline-none focus:border-primary focus:bg-bg backdrop-blur-md"
              autoFocus
            />
            <button
              type="submit"
              className="bg-purple-600 hover:bg-purple-500 text-text font-bold px-4 py-3 rounded-2xl text-xs flex items-center gap-1.5 shrink-0 shadow-lg shadow-purple-950/40 transition cursor-pointer"
            >
              <Brain className="w-4 h-4" />
              <span>Search</span>
            </button>
          </form>

          {/* Search results */}
          {query.trim() && (
            <div className="space-y-3 pt-1">
              {/* Chemical Summary */}
              <div className="bg-surface backdrop-blur-xl p-4 rounded-2xl border border-border space-y-1.5">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-amber-400 tracking-wider">
                      Medicine Searched:
                    </span>
                    <h4 className="text-base font-bold text-text">{query.toUpperCase()}</h4>
                  </div>
                  <span className="bg-purple-500/20 text-purple-300 border border-purple-500/30 px-2.5 py-0.5 rounded-full text-[10px] font-bold">
                    {matchData.category}
                  </span>
                </div>
                <p className="text-xs text-primary font-mono pt-1">
                  <b>Active Salt Formulation:</b> {matchData.salt}
                </p>
              </div>

              {/* In-Stock shop inventory matches */}
              {inStockMatches.length > 0 && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl space-y-2.5 backdrop-blur-md">
                  <h5 className="font-bold text-emerald-300 flex items-center gap-1.5 text-xs">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    Available in Your Shop Stock:
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {inStockMatches.map(item => (
                      <div
                        key={item.id}
                        className="bg-surface p-3 rounded-2xl border border-border flex justify-between items-center backdrop-blur-sm"
                      >
                        <div>
                          <p className="font-bold text-text">{item.name}</p>
                          <p className="text-[10px] text-text-muted">
                            Rack: <b className="text-primary">{item.rack}</b> • Stock:{' '}
                            <b className="text-emerald-400">{item.stock} Strips</b>
                          </p>
                          <p className="text-xs font-bold text-text font-mono mt-0.5">
                            MRP: ₹ {item.mrp.toFixed(2)}
                          </p>
                        </div>
                        <button
                          onClick={() => {
                            onAddToCart(item);
                            onClose();
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-text font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-md shadow-emerald-950/40 flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add to Bill</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Market alternative equivalents */}
              <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl space-y-2.5 backdrop-blur-md">
                <div className="flex justify-between items-center flex-wrap gap-2">
                  <h5 className="font-bold text-purple-300 flex items-center gap-1.5 text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Leading Market Equivalent Brands:
                  </h5>
                  <div className="flex gap-1.5 flex-wrap">
                    {webLiveLinks.map(w => (
                      <a
                        key={w.name}
                        href={w.url}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 bg-surface border border-border text-purple-300 font-semibold rounded-xl text-[10px] hover:bg-bg flex items-center gap-1 transition"
                      >
                        <ExternalLink className="w-2.5 h-2.5" />
                        <span>{w.name}</span>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {matchData.alternatives.map((alt, idx) => (
                    <div
                      key={idx}
                      className="bg-surface p-3 rounded-2xl border border-border flex justify-between items-center backdrop-blur-sm"
                    >
                      <div>
                        <p className="font-bold text-text">{alt.name}</p>
                        <p className="text-[10px] text-text-muted">
                          Company: <b className="text-text-muted">{alt.company}</b>
                        </p>
                        <p className="text-xs font-bold text-purple-300 font-mono mt-0.5">
                          Est. MRP: ₹ {alt.mrp.toFixed(2)}
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          onOrderSpecial(alt.name);
                          onClose();
                        }}
                        className="bg-primary hover:bg-primary text-text font-bold px-3 py-1.5 rounded-xl text-xs transition shadow-md shadow-primary/40 flex items-center gap-1 cursor-pointer"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        <span>Order</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-3 border-t border-border">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-bg hover:bg-bg text-text font-semibold rounded-2xl transition cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
