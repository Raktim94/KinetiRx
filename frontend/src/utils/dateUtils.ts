/**
 * Dynamic Date Utilities for Pharma Care Pro
 * Always uses the active system date rather than hardcoded dates.
 */

export const getTodayISODate = (): string => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getRelativeISODate = (daysOffset: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getRelativeMonthYear = (monthsOffset: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsOffset);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
};

export const formatReadableDate = (isoDateStr?: string): string => {
  if (!isoDateStr) return '';
  try {
    const [y, m, d] = isoDateStr.split('-').map(Number);
    if (!y || !m || !d) return isoDateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return isoDateStr;
  }
};

export const formatFullDateWithDay = (isoDateStr?: string): string => {
  const d = isoDateStr ? new Date(isoDateStr) : new Date();
  return d.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

export const formatShortDayMonth = (isoDateStr?: string): string => {
  if (!isoDateStr) return '';
  try {
    const parts = isoDateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
  } catch {}
  return isoDateStr;
};

/**
 * Returns past N days array of { date: YYYY-MM-DD, label: DD/MM } ending with today
 */
export const getPastNDays = (count: number = 7): Array<{ date: string; label: string }> => {
  const list: Array<{ date: string; label: string }> = [];
  for (let i = count - 1; i >= 0; i--) {
    const iso = getRelativeISODate(-i);
    list.push({
      date: iso,
      label: formatShortDayMonth(iso),
    });
  }
  return list;
};
