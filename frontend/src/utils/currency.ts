export interface CurrencyOption {
  code: string;
  symbol: string;
  label: string;
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', label: 'Indian Rupee (₹)' },
  { code: 'USD', symbol: '$', label: 'US Dollar ($)' },
  { code: 'EUR', symbol: '€', label: 'Euro (€)' },
  { code: 'GBP', symbol: '£', label: 'British Pound (£)' },
  { code: 'BDT', symbol: '৳', label: 'Bangladeshi Taka (৳)' },
  { code: 'NPR', symbol: 'रु', label: 'Nepali Rupee (रु)' },
  { code: 'AED', symbol: 'د.إ', label: 'UAE Dirham (د.إ)' },
  { code: 'SAR', symbol: 'ر.س', label: 'Saudi Riyal (ر.س)' },
];

const DEFAULT_SYMBOL = '₹';

/**
 * invoiceConfig.currency stores either a currency code (e.g. "USD") or,
 * for older records, a bare symbol (e.g. "₹") — accept both so existing
 * saved settings keep working after this field becomes editable.
 */
export function getCurrencySymbol(currency?: string | null): string {
  if (!currency) return DEFAULT_SYMBOL;
  const trimmed = currency.trim();
  if (!trimmed) return DEFAULT_SYMBOL;
  const byCode = CURRENCY_OPTIONS.find(c => c.code === trimmed.toUpperCase());
  if (byCode) return byCode.symbol;
  // Already a symbol (or a custom one the user typed) — use as-is.
  return trimmed;
}
