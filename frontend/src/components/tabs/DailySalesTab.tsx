import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  Banknote,
  Calculator,
  Calendar,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Coins,
  DollarSign,
  Download,
  Edit3,
  FileSpreadsheet,
  FileText,
  Filter,
  History,
  Lock,
  Plus,
  Receipt,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
  Trash2,
  Unlock,
  Vault,
  Wallet,
} from 'lucide-react';
import { CurrentUser, DailyRegisterState, ExpenseRecord, SalesRecord } from '../../types';
import { exportToCSV } from '../../utils/exportCsv';
import { formatFullDateWithDay, formatReadableDate, getRelativeISODate, getTodayISODate } from '../../utils/dateUtils';
import { AddExpenseModal } from '../modals/AddExpenseModal';

interface DailySalesTabProps {
  currentUser?: CurrentUser;
  dailyRegister: DailyRegisterState;
  setDailyRegister?: React.Dispatch<React.SetStateAction<DailyRegisterState>>;
  salesHistory: SalesRecord[];
  expenses: ExpenseRecord[];
  setExpenses?: React.Dispatch<React.SetStateAction<ExpenseRecord[]>>;
  onPrintInvoice?: (data: any) => void;
  onOpenAddExpenseModal?: () => void;
}

export const DailySalesTab: React.FC<DailySalesTabProps> = ({
  currentUser,
  dailyRegister,
  setDailyRegister,
  salesHistory,
  expenses,
  setExpenses,
  onPrintInvoice,
  onOpenAddExpenseModal,
}) => {
  // Today's system date string (YYYY-MM-DD)
  const todayStr = getTodayISODate();
  const [selectedDate, setSelectedDate] = useState<string>(dailyRegister.date || todayStr);

  const isTodaySelected = selectedDate === todayStr;

  // View table switch: 'sales' | 'expenses' | 'custom-range'
  const [activeDayView, setActiveDayView] = useState<'sales' | 'expenses' | 'custom-range'>('sales');
  const [isAddExpenseOpen, setIsAddExpenseOpen] = useState(false);

  // Handle Quick Day Navigation
  const handleSelectToday = () => {
    setSelectedDate(todayStr);
  };

  const handlePrevDay = () => {
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() - 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  const handleNextDay = () => {
    const parts = selectedDate.split('-').map(Number);
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    d.setDate(d.getDate() + 1);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setSelectedDate(`${y}-${m}-${day}`);
  };

  // Day specific items
  const daySalesList = salesHistory.filter(s => s.date === selectedDate);
  const dayExpensesList = expenses.filter(e => e.date === selectedDate);

  const dayTotalSalesCalculated = daySalesList.reduce((sum, s) => sum + (Number(s.total || s.amt) || 0), 0);
  const dayPhonePeCalculated = daySalesList
    .filter(s => s.mode === 'PhonePe' || s.mode.toLowerCase().includes('upi') || s.mode.toLowerCase().includes('online'))
    .reduce((sum, s) => sum + (Number(s.paidAmount !== undefined ? s.paidAmount : (s.total || s.amt)) || 0), 0);
  const dayExpensesCalculated = dayExpensesList.reduce((sum, e) => sum + (Number(e.amt) || 0), 0);

  // Input editing state & string buffers to prevent typing/backspace issues
  const [isEditing, setIsEditing] = useState<boolean>(!dailyRegister.isLocked);
  const [showDenomModal, setShowDenomModal] = useState<boolean>(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  // String buffers for smooth numeric entry
  const [inputValues, setInputValues] = useState({
    prevBD: String(dailyRegister.prevBD ?? 0),
    todaySell: String(dailyRegister.todaySell ?? 0),
    phonePe: String(dailyRegister.phonePe ?? 0),
    expenses: String(dailyRegister.expenses ?? 0),
    bankShift: String(dailyRegister.bankShift ?? 0),
  });

  // Automatically update input buffers when expenses or dailyRegister changes
  useEffect(() => {
    setInputValues({
      prevBD: String(dailyRegister.prevBD ?? 0),
      todaySell: String(dailyRegister.todaySell ?? 0),
      phonePe: String(dailyRegister.phonePe ?? 0),
      expenses: String(dailyRegister.expenses ?? 0),
      bankShift: String(dailyRegister.bankShift ?? 0),
    });
  }, [dailyRegister.prevBD, dailyRegister.todaySell, dailyRegister.phonePe, dailyRegister.expenses, dailyRegister.bankShift]);

  // Denominations for physical cash counting
  const [denoms, setDenoms] = useState<{ [key: string]: number }>({
    '500': 0,
    '200': 0,
    '100': 0,
    '50': 0,
    '20': 0,
    '10': 0,
    '5': 0,
    '2': 0,
    '1': 0,
  });

  // Date filters for custom range
  const [filterFrom, setFilterFrom] = useState('');
  const [filterTo, setFilterTo] = useState('');

  // Lifetime Calculations
  const lifetimeSalesTotal = salesHistory.reduce((sum, s) => sum + (Number(s.total || s.amt) || 0), 0);
  const lifetimeExpenseTotal = expenses.reduce((sum, e) => sum + (Number(e.amt) || 0), 0);
  const lifetimeProfit = lifetimeSalesTotal - lifetimeExpenseTotal;

  // Real-time parsed numbers from input buffers
  const numPrevBD = parseFloat(inputValues.prevBD) || 0;
  const numTodaySell = parseFloat(inputValues.todaySell) || 0;
  const numPhonePe = parseFloat(inputValues.phonePe) || 0;
  const numExpenses = parseFloat(inputValues.expenses) || 0;
  const numBankShift = parseFloat(inputValues.bankShift) || 0;

  // Mathematical equations
  const grossInHand = numPrevBD + numTodaySell;
  const totalDeductions = numPhonePe + numExpenses + numBankShift;
  const finalDrawerCash = grossInHand - totalDeductions;

  // Total physically counted cash from denominations
  const totalPhysicalCounted = Object.entries(denoms).reduce((sum, [note, count]) => {
    return sum + Number(note) * Number(count || 0);
  }, 0);

  const denomDiff = totalPhysicalCounted - finalDrawerCash;

  // Handle single field input changes cleanly (manual entry)
  const handleBufferChange = (field: keyof typeof inputValues, rawVal: string) => {
    setInputValues(prev => ({ ...prev, [field]: rawVal }));
    const parsedNum = parseFloat(rawVal) || 0;

    if (setDailyRegister) {
      setDailyRegister(prev => ({
        ...prev,
        [field]: parsedNum,
      }));
    }
  };

  // Quick helper to auto-calculate values from actual sales invoices & expense records
  const handleAutoSyncFromBills = () => {
    const newTodaySell = Number(dayTotalSalesCalculated.toFixed(2));
    const newPhonePe = Number(dayPhonePeCalculated.toFixed(2));
    const newExpenses = Number(dayExpensesCalculated.toFixed(2));

    setInputValues(prev => ({
      ...prev,
      todaySell: String(newTodaySell),
      phonePe: String(newPhonePe),
      expenses: String(newExpenses),
    }));

    if (setDailyRegister) {
      setDailyRegister(prev => ({
        ...prev,
        todaySell: newTodaySell,
        phonePe: newPhonePe,
        expenses: newExpenses,
        totalSales: newTodaySell,
      }));
    }

    setSaveFeedback(
      `Auto-synced: ₹${newTodaySell} Sales, ₹${newPhonePe} PhonePe & ₹${newExpenses} Expenses from ${dayExpensesList.length} vouchers for ${selectedDate}!`
    );
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  // Handle adding an expenditure directly to daily register and master list
  const handleSaveDailyExpense = (newExpense: ExpenseRecord) => {
    if (setExpenses) {
      setExpenses(prev => [newExpense, ...prev]);
    }

    // Auto update register if date matches currently selected date or today
    if (newExpense.date === selectedDate || newExpense.date === todayStr) {
      const updatedTotal = Number((numExpenses + newExpense.amt).toFixed(2));
      setInputValues(prev => ({ ...prev, expenses: String(updatedTotal) }));
      if (setDailyRegister) {
        setDailyRegister(prev => ({
          ...prev,
          expenses: updatedTotal,
        }));
      }
    }

    setSaveFeedback(`Logged ₹${newExpense.amt.toFixed(2)} (${newExpense.desc}) and updated Daily Register.`);
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  // Handle deleting an expenditure
  const handleDeleteExpense = (expenseId: string, amount: number) => {
    if (!confirm('Are you sure you want to remove this expense voucher?')) return;

    if (setExpenses) {
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
    }

    const updatedTotal = Math.max(0, Number((numExpenses - amount).toFixed(2)));
    setInputValues(prev => ({ ...prev, expenses: String(updatedTotal) }));
    if (setDailyRegister) {
      setDailyRegister(prev => ({
        ...prev,
        expenses: updatedTotal,
      }));
    }

    setSaveFeedback(`Removed expense voucher of ₹${amount.toFixed(2)}.`);
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  // Carry Forward yesterday's closing cash into Previous B/D
  const handleCarryForwardYesterday = () => {
    const carryAmount = Math.max(0, finalDrawerCash);
    setInputValues(prev => ({ ...prev, prevBD: String(carryAmount) }));
    if (setDailyRegister) {
      setDailyRegister(prev => ({ ...prev, prevBD: carryAmount }));
    }
    setSaveFeedback(`Carried forward ₹${carryAmount.toFixed(2)} as Previous Cash B/D.`);
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  // Save and lock handler
  const handleSaveAndLock = () => {
    if (setDailyRegister) {
      setDailyRegister(prev => ({
        ...prev,
        prevBD: numPrevBD,
        todaySell: numTodaySell,
        phonePe: numPhonePe,
        expenses: numExpenses,
        bankShift: numBankShift,
        isLocked: true,
        date: selectedDate,
      }));
    }
    setIsEditing(false);
    setSaveFeedback('Daily sales register locked and saved successfully!');
    setTimeout(() => setSaveFeedback(null), 3500);
  };

  // Toggle edit
  const handleToggleEdit = () => {
    if (isEditing) {
      // Save before closing edit
      if (setDailyRegister) {
        setDailyRegister(prev => ({
          ...prev,
          prevBD: numPrevBD,
          todaySell: numTodaySell,
          phonePe: numPhonePe,
          expenses: numExpenses,
          bankShift: numBankShift,
        }));
      }
      setIsEditing(false);
    } else {
      setIsEditing(true);
      if (setDailyRegister) {
        setDailyRegister(prev => ({ ...prev, isLocked: false }));
      }
    }
  };

  // Filtered sales list for custom range
  const filteredSales = salesHistory.filter(s => {
    if (!filterFrom && !filterTo) return true;
    if (filterFrom && !filterTo) return s.date >= filterFrom;
    if (!filterFrom && filterTo) return s.date <= filterTo;
    return s.date >= filterFrom && s.date <= filterTo;
  });

  const handleExportTodaySales = () => {
    exportToCSV(
      `daily_sales_register_${selectedDate}`,
      ['Date', 'Invoice No', 'Item Description', 'Quantity', 'Payment Mode', 'Patient / Customer', 'Total (INR)'],
      salesHistory
        .filter(s => s.date === selectedDate)
        .map(s => [
          s.date,
          s.inv || s.invoiceNo || s.id,
          s.name || s.items,
          s.qty,
          s.mode,
          s.patient || s.cust,
          Number(s.total || s.amt || 0).toFixed(2),
        ])
    );
  };

  const handleExportTodayExpenses = () => {
    exportToCSV(
      `daily_expenditures_${selectedDate}`,
      ['Expense Date', 'Category', 'Description', 'Amount (INR)'],
      dayExpensesList.map(e => [e.date, e.cat, e.desc, e.amt.toFixed(2)])
    );
  };

  const handleExportCustomDateRange = () => {
    exportToCSV(
      `sales_report_${filterFrom || 'all'}_to_${filterTo || 'latest'}`,
      ['Date', 'Invoice No', 'Item Description', 'Quantity', 'Payment Mode', 'Patient / Customer', 'Total (INR)'],
      filteredSales.map(s => [
        s.date,
        s.inv || s.invoiceNo || s.id,
        s.name || s.items,
        s.qty,
        s.mode,
        s.patient || s.cust,
        Number(s.total || s.amt || 0).toFixed(2),
      ])
    );
  };

  // Day breakdown stats
  const dayCashSales = daySalesList
    .filter(s => s.mode === 'Cash' || s.mode.toLowerCase().includes('cash'))
    .reduce((sum, s) => sum + (Number(s.paidAmount !== undefined ? s.paidAmount : (s.total || s.amt)) || 0), 0);
  const dayUpiSales = daySalesList
    .filter(s => s.mode === 'PhonePe' || s.mode.toLowerCase().includes('upi') || s.mode.toLowerCase().includes('online'))
    .reduce((sum, s) => sum + (Number(s.paidAmount !== undefined ? s.paidAmount : (s.total || s.amt)) || 0), 0);
  const dayDueSales = daySalesList
    .filter(s => s.mode === 'Due' || (s.dueAmount && s.dueAmount > 0))
    .reduce((sum, s) => sum + Number(s.dueAmount || 0), 0);

  return (
    <div className="space-y-6">
      {/* SUCCESS NOTIFICATION TOAST */}
      {saveFeedback && (
        <div className="p-3.5 rounded-2xl bg-success/15 border border-success/40 text-success flex items-center justify-between text-xs shadow-lg animate-fadeIn">
          <div className="flex items-center gap-2 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span>{saveFeedback}</span>
          </div>
          <button
            onClick={() => setSaveFeedback(null)}
            className="text-success hover:text-text px-2 py-0.5 text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* ADMIN-ONLY LIFETIME BUSINESS OVERVIEW */}
      {(!currentUser || currentUser.role === 'admin') && (
        <div
          id="admin-lifetime-panel"
          className="p-6 rounded-3xl glass-panel space-y-4 text-text"
        >
          <div className="flex justify-between items-center border-b border-border pb-3 flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <span className="bg-warning/15 border border-warning/40 text-warning font-bold px-2.5 py-1 rounded-full text-[10px] tracking-wider uppercase flex items-center gap-1.5">
                <ShieldAlert className="w-3.5 h-3.5" /> ADMIN EXCLUSIVE
              </span>
              <h3 className="text-base font-bold text-text">
                Lifetime Business Ledger
              </h3>
            </div>
            <span className="text-xs text-text-muted font-mono flex items-center gap-1.5 bg-surface-elevated border border-border px-3 py-1 rounded-full">
              <span className="w-2 h-2 rounded-full bg-success animate-pulse" /> Live Realtime
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-surface-elevated border border-border">
              <p className="text-xs text-text-muted">Total Lifetime Gross Sales</p>
              <h4 className="text-2xl font-bold text-primary font-mono mt-1.5">
                ₹ {lifetimeSalesTotal.toFixed(2)}
              </h4>
            </div>

            <div className="p-4 rounded-2xl bg-surface-elevated border border-border">
              <p className="text-xs text-text-muted">Total Lifetime Expenses</p>
              <h4 className="text-2xl font-bold text-warning font-mono mt-1.5">
                ₹ {lifetimeExpenseTotal.toFixed(2)}
              </h4>
            </div>

            <div className="p-4 rounded-2xl bg-surface-elevated border border-border">
              <p className="text-xs text-text-muted">Net Business Profit / Income</p>
              <h4 className="text-2xl font-bold text-success font-mono mt-1.5">
                ₹ {lifetimeProfit.toFixed(2)}
              </h4>
            </div>
          </div>
        </div>
      )}

      {/* DAILY SALES & DRAWER REGISTER */}
      <div className="p-6 rounded-3xl glass-panel space-y-6 text-text">
        {/* HEADER & ACTION CONTROLS */}
        <div className="flex justify-between items-center border-b border-border pb-4 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-warning/15 border border-warning/30 flex items-center justify-center text-warning">
                <Calculator className="w-4 h-4" />
              </div>
              <h3 className="text-base font-bold text-text">Daily Sales & Cash Drawer Register</h3>
            </div>
            <p className="text-xs text-text-muted mt-1">
              Opening cash B/D, gross sales, PhonePe/UPI split, automatic & manual daily expenditures, and net cash audit.
            </p>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Register Date Selector with Steppers */}
            <div className="flex items-center gap-1 bg-surface-elevated border border-border p-1 rounded-2xl text-xs">
              <button
                type="button"
                onClick={handlePrevDay}
                className="p-1 rounded-lg hover:bg-bg text-text-muted transition cursor-pointer"
                title="Previous Day"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-1.5 px-2 py-0.5">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={e => setSelectedDate(e.target.value)}
                  className="bg-transparent text-text font-mono text-xs outline-none cursor-pointer"
                  title="Select Register Date"
                />
              </div>

              <button
                type="button"
                onClick={handleNextDay}
                className="p-1 rounded-lg hover:bg-bg text-text-muted transition cursor-pointer"
                title="Next Day"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleSelectToday}
                className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer ${
                  isTodaySelected
                    ? 'bg-success/20 text-success border border-success/40'
                    : 'bg-bg hover:bg-border text-text-muted'
                }`}
                title="Jump to Today"
              >
                {isTodaySelected ? '● Today' : 'Today'}
              </button>
            </div>

            {/* Auto Sync From Invoices */}
            <button
              id="btn-auto-sync-bills"
              type="button"
              onClick={handleAutoSyncFromBills}
              className="bg-primary/10 hover:bg-primary/20 text-primary border border-primary/40 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Automatically calculate sales, PhonePe, and expenses from today's invoices"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Auto-Sync from Bills</span>
            </button>

            {/* Quick Reset Drawer & Register to Zero */}
            <button
              id="btn-reset-register-zero"
              type="button"
              onClick={() => {
                if (!window.confirm('Reset all Daily Register fields (Opening B/D, Sales, PhonePe, Expenses, Bank Shift) to ₹0.00?')) return;
                setInputValues({
                  prevBD: '0',
                  todaySell: '0',
                  phonePe: '0',
                  expenses: '0',
                  bankShift: '0',
                });
                if (setDailyRegister) {
                  setDailyRegister(prev => ({
                    ...prev,
                    prevBD: 0,
                    todaySell: 0,
                    phonePe: 0,
                    expenses: 0,
                    bankShift: 0,
                    openingCash: 0,
                    totalSales: 0,
                    cashSales: 0,
                    upiSales: 0,
                    cardSales: 0,
                    totalExpenses: 0,
                  }));
                }
                setSaveFeedback('Daily Register & Drawer balance successfully reset to ₹0.00!');
                setTimeout(() => setSaveFeedback(null), 3500);
              }}
              className="bg-danger/10 hover:bg-danger/20 text-danger border border-danger/40 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
              title="Reset register figures and drawer cash to 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset to ₹0</span>
            </button>

            {/* Quick Add Daily Expenditure */}
            <button
              type="button"
              onClick={() => setIsAddExpenseOpen(true)}
              className="btn-primary"
              title="Add an expense voucher directly into daily register"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Daily Expense</span>
            </button>

            {/* Denomination Counter Modal Trigger */}
            <button
              type="button"
              onClick={() => setShowDenomModal(!showDenomModal)}
              className="bg-accent/15 hover:bg-accent/25 text-accent border border-accent/40 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Banknote className="w-3.5 h-3.5" />
              <span>Cash Tally</span>
            </button>

            {/* Edit / Unlock Toggle */}
            <button
              id="btn-toggle-daily-edit"
              type="button"
              onClick={handleToggleEdit}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                isEditing
                  ? 'bg-warning/20 text-warning border border-warning/50 hover:bg-warning/30'
                  : 'bg-surface-elevated text-text border border-border hover:bg-bg'
              }`}
            >
              {isEditing ? <Unlock className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
              <span>{isEditing ? 'Editing Enabled' : 'Unlock & Edit'}</span>
            </button>

            {/* Save & Lock */}
            <button
              id="btn-save-lock-daily"
              type="button"
              onClick={handleSaveAndLock}
              className="btn-primary"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save & Lock</span>
            </button>
          </div>
        </div>

        {/* SUMMARY KPI CARDS FOR SELECTED DATE */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 rounded-2xl bg-surface-elevated border border-border">
            <span className="text-text-muted block text-[11px]">Billed Invoices</span>
            <span className="text-base font-bold text-text font-mono">{daySalesList.length} Invoices</span>
          </div>
          <div className="p-3 rounded-2xl bg-success/10 border border-success/25">
            <span className="text-success block text-[11px]">Cash Inflow Received</span>
            <span className="text-base font-bold text-success font-mono">₹ {dayCashSales.toFixed(2)}</span>
          </div>
          <div className="p-3 rounded-2xl bg-danger/10 border border-danger/25">
            <span className="text-danger block text-[11px]">PhonePe / UPI Inflow</span>
            <span className="text-base font-bold text-danger font-mono">₹ {dayUpiSales.toFixed(2)}</span>
          </div>
          <div className="p-3 rounded-2xl bg-warning/10 border border-warning/25">
            <span className="text-warning block text-[11px]">Daily Expenditures Logged</span>
            <span className="text-base font-bold text-warning font-mono">
              ₹ {dayExpensesCalculated.toFixed(2)} ({dayExpensesList.length} Vouchers)
            </span>
          </div>
        </div>

        {/* SECTION A: INFLOWS */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-primary uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5" /> Section A: Cash Inflows
            </span>
            <span className="text-text-muted text-[11px]">
              {isEditing ? '⚡ Direct manual entry enabled on all fields' : '🔒 Click "Unlock & Edit" above to modify values'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Previous Cash B/D (Opening Cash) */}
            <div
              className={`p-4 rounded-2xl border space-y-2 transition ${
                isEditing
                  ? 'bg-primary/10 border-primary/50 shadow-md'
                  : 'bg-surface-elevated border-border'
              }`}
            >
              <div className="flex justify-between items-center">
                <label className="font-bold text-text flex items-center gap-1.5">
                  <span>Previous Cash B/D</span>
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={handleCarryForwardYesterday}
                    className="text-[10px] text-primary hover:text-primary-hover bg-primary/10 border border-primary/30 px-1.5 py-0.5 rounded-lg transition cursor-pointer"
                    title="Carry forward closing cash as today's B/D"
                  >
                    Set Opening
                  </button>
                  <span className="text-[10px] text-text-muted">
                    {isEditing ? <Unlock className="w-3 h-3 text-success" /> : <Lock className="w-3 h-3" />}
                  </span>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-text-muted font-mono font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  id="calc-prev-bd"
                  value={inputValues.prevBD}
                  disabled={!isEditing}
                  onChange={e => handleBufferChange('prevBD', e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-7 pr-3 py-2.5 rounded-xl font-mono font-bold text-base outline-none transition ${
                    isEditing
                      ? 'bg-surface-elevated text-text border border-primary focus:ring-2 focus:ring-primary/30'
                      : 'bg-surface text-text-muted border border-border opacity-90 cursor-not-allowed'
                  }`}
                />
              </div>

              <p className="text-[10px] text-text-muted">
                Opening cash available in drawer at start of day.
              </p>
            </div>

            {/* Today's Gross Sales */}
            <div
              className={`p-4 rounded-2xl border space-y-2 transition ${
                isEditing
                  ? 'bg-primary/10 border-primary/50 shadow-md'
                  : 'bg-primary/5 border-primary/20'
              }`}
            >
              <div className="flex justify-between items-center">
                <label className="font-bold text-primary flex items-center gap-1.5">
                  <span>Today's Gross Sales</span>
                </label>
                <span className="text-[10px] text-primary">
                  {isEditing ? <Unlock className="w-3 h-3 text-success" /> : <Lock className="w-3 h-3" />}
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-primary font-mono font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  id="calc-today-sell"
                  value={inputValues.todaySell}
                  disabled={!isEditing}
                  onChange={e => handleBufferChange('todaySell', e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-7 pr-3 py-2.5 rounded-xl font-mono font-bold text-base outline-none transition ${
                    isEditing
                      ? 'bg-surface-elevated text-text border border-primary focus:ring-2 focus:ring-primary/30'
                      : 'bg-surface text-primary border border-primary/20 opacity-90 cursor-not-allowed'
                  }`}
                />
              </div>

              <p className="text-[10px] text-primary/70">
                Total bill value generated across Cash, PhonePe & Cards.
              </p>
            </div>

            {/* Total In Hand Before Deductions */}
            <div className="p-4 rounded-2xl bg-surface-elevated border border-border space-y-2">
              <label className="font-medium text-text-muted block">
                Total Gross In Hand <span className="text-text-muted/70 font-normal">(Opening Balance + Sales)</span>
              </label>
              <div id="calc-total-gross" className="text-2xl font-bold text-text mt-2 font-mono">
                ₹ {grossInHand.toFixed(2)}
              </div>
              <p className="text-[10px] text-text-muted">
                ₹ {numPrevBD.toFixed(2)} (B/D) + ₹ {numTodaySell.toFixed(2)} (Sales)
              </p>
            </div>
          </div>
        </div>

        {/* SECTION B: DEDUCTIONS */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-danger uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Section B: Deductions & Outflows
            </span>
            <span className="text-text-muted text-[11px]">
              Total Deductions: <strong className="text-danger font-mono">₹ {totalDeductions.toFixed(2)}</strong>
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* PhonePe / Online Received */}
            <div
              className={`p-4 rounded-2xl border space-y-2 transition ${
                isEditing
                  ? 'bg-danger/10 border-danger/50 shadow-md'
                  : 'bg-danger/5 border-danger/20'
              }`}
            >
              <div className="flex justify-between items-center">
                <label className="font-bold text-danger">
                  [-] PhonePe / Online Received
                </label>
                <span className="text-[10px] text-danger">
                  {isEditing ? <Unlock className="w-3 h-3 text-success" /> : <Lock className="w-3 h-3" />}
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-danger font-mono font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  id="calc-ppay"
                  value={inputValues.phonePe}
                  disabled={!isEditing}
                  onChange={e => handleBufferChange('phonePe', e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-7 pr-3 py-2.5 rounded-xl font-mono font-bold text-base outline-none transition ${
                    isEditing
                      ? 'bg-surface-elevated text-text border border-danger focus:ring-2 focus:ring-danger/30'
                      : 'bg-surface text-danger border border-danger/20 opacity-90 cursor-not-allowed'
                  }`}
                />
              </div>
              <p className="text-[10px] text-danger/70">
                Amount credited directly to UPI/Bank (not physical currency).
              </p>
            </div>

            {/* Daily Expenses Paid */}
            <div
              className={`p-4 rounded-2xl border space-y-2 transition ${
                isEditing
                  ? 'bg-warning/10 border-warning/50 shadow-md'
                  : 'bg-warning/5 border-warning/20'
              }`}
            >
              <div className="flex justify-between items-center flex-wrap gap-1">
                <label className="font-bold text-warning">
                  [-] Daily Expenses Paid
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      const updated = Number(dayExpensesCalculated.toFixed(2));
                      handleBufferChange('expenses', String(updated));
                      setSaveFeedback(`Expenses auto-synced to ₹${updated.toFixed(2)} from ${dayExpensesList.length} vouchers.`);
                      setTimeout(() => setSaveFeedback(null), 3000);
                    }}
                    className="text-[10px] text-warning hover:text-text bg-warning/15 border border-warning/30 px-1.5 py-0.5 rounded-lg transition cursor-pointer"
                    title="Auto-calculate total from daily expenditure vouchers"
                  >
                    Sync Vouchers (₹{dayExpensesCalculated.toFixed(2)})
                  </button>
                  <span className="text-[10px] text-warning">
                    {isEditing ? <Unlock className="w-3 h-3 text-success" /> : <Lock className="w-3 h-3" />}
                  </span>
                </div>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-warning font-mono font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  id="calc-exp"
                  value={inputValues.expenses}
                  disabled={!isEditing}
                  onChange={e => handleBufferChange('expenses', e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-7 pr-3 py-2.5 rounded-xl font-mono font-bold text-base outline-none transition ${
                    isEditing
                      ? 'bg-surface-elevated text-text border border-warning focus:ring-2 focus:ring-warning/30'
                      : 'bg-surface text-warning border border-warning/20 opacity-90 cursor-not-allowed'
                  }`}
                />
              </div>
              <p className="text-[10px] text-warning/70">
                Cash spent on staff wages, sample transport, tea, utility & daily vouchers.
              </p>
            </div>

            {/* Shifted to Bank A/C */}
            <div
              className={`p-4 rounded-2xl border space-y-2 transition ${
                isEditing
                  ? 'bg-accent/10 border-accent/50 shadow-md'
                  : 'bg-accent/5 border-accent/20'
              }`}
            >
              <div className="flex justify-between items-center">
                <label className="font-bold text-accent">
                  [-] Shifted to Bank A/C
                </label>
                <span className="text-[10px] text-accent">
                  {isEditing ? <Unlock className="w-3 h-3 text-success" /> : <Lock className="w-3 h-3" />}
                </span>
              </div>

              <div className="relative">
                <span className="absolute left-3 top-2.5 text-accent font-mono font-bold text-sm">₹</span>
                <input
                  type="number"
                  step="any"
                  id="calc-bank-shift"
                  value={inputValues.bankShift}
                  disabled={!isEditing}
                  onChange={e => handleBufferChange('bankShift', e.target.value)}
                  placeholder="0.00"
                  className={`w-full pl-7 pr-3 py-2.5 rounded-xl font-mono font-bold text-base outline-none transition ${
                    isEditing
                      ? 'bg-surface-elevated text-text border border-accent focus:ring-2 focus:ring-accent/30'
                      : 'bg-surface text-accent border border-accent/20 opacity-90 cursor-not-allowed'
                  }`}
                />
              </div>
              <p className="text-[10px] text-accent/70">
                Cash taken from drawer and physically deposited in bank account.
              </p>
            </div>
          </div>
        </div>

        {/* NET FINAL PHYSICAL CASH IN DRAWER */}
        <div className="p-6 bg-success/12 border border-success/30 rounded-3xl flex justify-between items-center flex-wrap gap-4 shadow-xl">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-success/20 border border-success/40 text-success flex items-center justify-center shadow-lg">
              <Vault className="w-7 h-7" />
            </div>
            <div>
              <span className="text-xs uppercase font-bold text-success tracking-wider block">
                Final Physical Cash-In-Drawer Balance
              </span>
              <p className="text-xs text-text-muted mt-0.5">
                Calculated: [Gross In Hand ₹{grossInHand.toFixed(2)}] − [Deductions ₹{totalDeductions.toFixed(2)}]
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="text-right">
              <div id="calc-final-bd" className="text-3xl font-extrabold text-success font-mono">
                ₹ {finalDrawerCash.toFixed(2)}
              </div>
              <span className="text-[11px] text-text-muted">Closing Cash Balance</span>
            </div>

            <button
              type="button"
              onClick={() => setShowDenomModal(!showDenomModal)}
              className="bg-success/15 hover:bg-success/25 text-success border border-success/40 px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{showDenomModal ? 'Hide Tally' : 'Tally Notes'}</span>
            </button>
          </div>
        </div>

        {/* DENOMINATIONS AUDIT TALLY TOOL */}
        {showDenomModal && (
          <div className="p-5 rounded-2xl bg-surface-elevated border border-accent/30 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center border-b border-border pb-3 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Coins className="w-4 h-4 text-accent" />
                <h4 className="text-xs font-bold text-text uppercase tracking-wider">
                  Physical Currency Notes & Coins Tally
                </h4>
              </div>
              <div className="flex items-center gap-3 text-xs text-text-muted">
                <span>
                  Physical Counted:{' '}
                  <strong className="text-accent font-mono">₹ {totalPhysicalCounted.toFixed(2)}</strong>
                </span>
                <span>
                  Difference:{' '}
                  <strong
                    className={`font-mono ${
                      Math.abs(denomDiff) < 0.01
                        ? 'text-success'
                        : denomDiff > 0
                        ? 'text-warning'
                        : 'text-danger'
                    }`}
                  >
                    {Math.abs(denomDiff) < 0.01
                      ? '✓ Exact Match'
                      : denomDiff > 0
                      ? `+₹ ${denomDiff.toFixed(2)} (Excess)`
                      : `-₹ ${Math.abs(denomDiff).toFixed(2)} (Shortage)`}
                  </strong>
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-9 gap-2 text-xs">
              {['500', '200', '100', '50', '20', '10', '5', '2', '1'].map(note => (
                <div key={note} className="p-2.5 rounded-xl bg-surface border border-border space-y-1 text-center">
                  <span className="font-bold text-accent font-mono block">₹{note}</span>
                  <input
                    type="number"
                    min="0"
                    value={denoms[note] || ''}
                    placeholder="0"
                    onChange={e => {
                      const count = parseInt(e.target.value, 10) || 0;
                      setDenoms(prev => ({ ...prev, [note]: Math.max(0, count) }));
                    }}
                    className="w-full p-1.5 bg-surface-elevated border border-border rounded-lg text-center font-mono font-bold text-text text-xs outline-none focus:border-accent"
                  />
                  <span className="text-[10px] text-text-muted font-mono block">
                    = ₹{(Number(note) * (denoms[note] || 0)).toFixed(0)}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() =>
                  setDenoms({ '500': 0, '200': 0, '100': 0, '50': 0, '20': 0, '10': 0, '5': 0, '2': 0, '1': 0 })
                }
                className="px-3 py-1.5 rounded-xl bg-surface hover:bg-bg border border-border text-text-muted text-xs font-semibold cursor-pointer"
              >
                Reset Tally
              </button>
              <button
                type="button"
                onClick={() => setShowDenomModal(false)}
                className="px-3.5 py-1.5 rounded-xl bg-accent hover:brightness-110 text-primary-foreground text-xs font-bold cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* DETAILED DAILY REGISTERS: SALES INVOICES & DAILY EXPENDITURES VOUCHERS */}
      <div className="p-6 rounded-3xl glass-panel space-y-5 text-text">
        <div className="flex justify-between items-center border-b border-border pb-3 flex-wrap gap-3">
          {/* TAB BUTTONS */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveDayView('sales')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeDayView === 'sales'
                  ? 'bg-primary text-primary-foreground shadow-lg border border-primary'
                  : 'bg-surface-elevated text-text-muted hover:bg-bg border border-border'
              }`}
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Day Sales Invoices ({daySalesList.length})</span>
            </button>

            <button
              onClick={() => setActiveDayView('expenses')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeDayView === 'expenses'
                  ? 'bg-warning text-primary-foreground shadow-lg border border-warning'
                  : 'bg-surface-elevated text-text-muted hover:bg-bg border border-border'
              }`}
            >
              <Wallet className="w-3.5 h-3.5" />
              <span>Day Expenditures ({dayExpensesList.length})</span>
            </button>

            <button
              onClick={() => setActiveDayView('custom-range')}
              className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition cursor-pointer ${
                activeDayView === 'custom-range'
                  ? 'bg-accent text-primary-foreground shadow-lg border border-accent'
                  : 'bg-surface-elevated text-text-muted hover:bg-bg border border-border'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Custom Date Range Sales</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeDayView === 'sales' && (
              <button
                onClick={handleExportTodaySales}
                className="btn-primary"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export Day Sales Excel</span>
              </button>
            )}

            {activeDayView === 'expenses' && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsAddExpenseOpen(true)}
                  className="bg-warning hover:brightness-105 text-primary-foreground font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Log Expense</span>
                </button>
                <button
                  onClick={handleExportTodayExpenses}
                  className="bg-surface-elevated hover:bg-bg text-text border border-border font-semibold px-3 py-2 rounded-xl text-xs flex items-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-warning" />
                  <span>Export Expense CSV</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* VIEW 1: DAY SALES INVOICES */}
        {activeDayView === 'sales' && (
          <div className="overflow-y-auto max-h-72 border border-border rounded-2xl bg-surface-elevated">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-elevated font-semibold text-text-muted uppercase sticky top-0">
                <tr>
                  <th className="p-3">Invoice & Time</th>
                  <th className="p-3">Item Description</th>
                  <th className="p-3">Quantity</th>
                  <th className="p-3">Patient / Buyer</th>
                  <th className="p-3">Payment Mode</th>
                  <th className="p-3 text-right">Total (₹)</th>
                  {onPrintInvoice && <th className="p-3 text-center">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border text-text">
                {daySalesList.length === 0 ? (
                  <tr>
                    <td colSpan={onPrintInvoice ? 7 : 6} className="p-8 text-center text-text-muted">
                      No sales invoices recorded for {selectedDate}. Complete a bill in Smart POS to register sales automatically.
                    </td>
                  </tr>
                ) : (
                  daySalesList.map(s => (
                    <tr key={s.id} className="hover:bg-bg transition">
                      <td className="p-3">
                        <span className="font-mono font-bold text-primary block text-[11px]">
                          {s.inv || s.invoiceNo || `#${s.id}`}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">{s.date}</span>
                      </td>
                      <td className="p-3 font-semibold text-text">{s.name || s.items}</td>
                      <td className="p-3 font-mono">{s.qty}</td>
                      <td className="p-3 text-text-muted">{s.patient || s.cust}</td>
                      <td className="p-3 font-medium">
                        <span
                          className={`border px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                            s.mode === 'Cash'
                              ? 'bg-success/15 text-success border-success/30'
                              : s.mode === 'PhonePe' || s.mode.toLowerCase().includes('upi')
                              ? 'bg-danger/15 text-danger border-danger/30'
                              : 'bg-primary/15 text-primary border-primary/30'
                          }`}
                        >
                          {s.mode}
                        </span>
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-text text-sm">
                        ₹ {Number(s.total || s.amt || 0).toFixed(2)}
                      </td>
                      {onPrintInvoice && (
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              const invNo = s.inv || s.invoiceNo || `INV-${s.id}`;
                              const tot = Number(s.total || s.amt || 0);
                              onPrintInvoice({
                                invNo,
                                date: s.date,
                                patientId: s.patientId || 'P/101',
                                patientName: s.cust || s.patient || s.name || 'Customer',
                                phone: s.phone || 'N/A',
                                ageGender: s.ageGender || '-- / Male',
                                address: s.address || 'Local',
                                doctor: s.doctor || 'Self Prescribed / OTC',
                                items: s.itemsDetail || [
                                  { name: s.items || s.name || 'Medicines', qty: 1, price: tot, total: tot },
                                ],
                                subtotal: s.subtotal || tot,
                                discountPercent: s.discountPercent || 0,
                                grandTotal: tot,
                                paidAmount: s.paidAmount !== undefined ? s.paidAmount : tot,
                                dueAmount: s.dueAmount !== undefined ? s.dueAmount : 0,
                                paymentMode: s.mode,
                              });
                            }}
                            className="px-2 py-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 rounded-lg text-[11px] font-bold transition cursor-pointer"
                          >
                            Print PDF
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* VIEW 2: DAY EXPENDITURES LIST */}
        {activeDayView === 'expenses' && (
          <div className="space-y-3">
            <div className="overflow-y-auto max-h-72 border border-border rounded-2xl bg-surface-elevated">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-elevated font-semibold text-text-muted uppercase sticky top-0">
                  <tr>
                    <th className="p-3">Expense Date</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Description / Remarks</th>
                    <th className="p-3 text-right">Amount (₹)</th>
                    <th className="p-3 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text">
                  {dayExpensesList.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-text-muted">
                        No daily expenditure vouchers recorded for {selectedDate}. Click "+ Log Expense" above to add transport, staff wages, tea, or utility expenses.
                      </td>
                    </tr>
                  ) : (
                    dayExpensesList.map(e => (
                      <tr key={e.id} className="hover:bg-bg transition">
                        <td className="p-3 font-mono text-text-muted">{e.date}</td>
                        <td className="p-3">
                          <span className="bg-warning/15 text-warning border border-warning/30 font-semibold px-2.5 py-1 rounded-full text-[11px]">
                            {e.cat}
                          </span>
                        </td>
                        <td className="p-3 font-medium text-text">{e.desc}</td>
                        <td className="p-3 font-mono font-bold text-warning text-right text-sm">
                          ₹ {e.amt.toFixed(2)}
                        </td>
                        <td className="p-3 text-center">
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(e.id, e.amt)}
                            className="p-1.5 bg-danger/15 hover:bg-danger/25 text-danger border border-danger/30 rounded-lg transition cursor-pointer"
                            title="Delete Expense Voucher"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {dayExpensesList.length > 0 && (
              <div className="flex justify-between items-center p-3 rounded-2xl bg-warning/10 border border-warning/20 text-xs">
                <span className="text-text-muted">
                  Total Daily Expenditures for {selectedDate}: <b>{dayExpensesList.length} vouchers</b>
                </span>
                <span className="font-mono font-bold text-warning text-sm">
                  Total: ₹ {dayExpensesCalculated.toFixed(2)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* VIEW 3: CUSTOM DATE RANGE SALES */}
        {activeDayView === 'custom-range' && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs items-end">
              <div>
                <label className="font-medium text-text-muted block mb-1">From Date</label>
                <input
                  type="date"
                  id="filter-sales-from"
                  value={filterFrom}
                  onChange={e => setFilterFrom(e.target.value)}
                  className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl font-mono text-text outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="font-medium text-text-muted block mb-1">To Date</label>
                <input
                  type="date"
                  id="filter-sales-to"
                  value={filterTo}
                  onChange={e => setFilterTo(e.target.value)}
                  className="w-full p-2.5 bg-surface-elevated border border-border rounded-xl font-mono text-text outline-none focus:border-primary"
                />
              </div>

              <div>
                <button
                  onClick={() => {
                    setFilterFrom('');
                    setFilterTo('');
                  }}
                  className="w-full bg-surface-elevated hover:bg-bg text-text border border-border font-semibold p-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Reset Filters
                </button>
              </div>

              <div>
                <button
                  onClick={handleExportCustomDateRange}
                  className="btn-primary w-full"
                >
                  <Download className="w-3.5 h-3.5" /> Download Excel ({filteredSales.length} Rows)
                </button>
              </div>
            </div>

            <div className="overflow-y-auto max-h-60 border border-border rounded-2xl bg-surface-elevated">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-elevated font-semibold text-text-muted uppercase sticky top-0">
                  <tr>
                    <th className="p-3">Invoice & Date</th>
                    <th className="p-3">Item Description</th>
                    <th className="p-3">Quantity</th>
                    <th className="p-3">Patient / Buyer</th>
                    <th className="p-3">Payment Mode</th>
                    <th className="p-3 text-right">Total (₹)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border text-text">
                  {filteredSales.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-text-muted">
                        No sales records found for selected date range.
                      </td>
                    </tr>
                  ) : (
                    filteredSales.map(s => (
                      <tr key={s.id} className="hover:bg-bg transition">
                        <td className="p-3">
                          <span className="font-mono font-bold text-primary block text-[11px]">
                            {s.inv || s.invoiceNo || `#${s.id}`}
                          </span>
                          <span className="text-[10px] text-text-muted font-mono">{s.date}</span>
                        </td>
                        <td className="p-3 font-semibold text-text">{s.name || s.items}</td>
                        <td className="p-3 font-mono">{s.qty}</td>
                        <td className="p-3 text-text-muted">{s.patient || s.cust}</td>
                        <td className="p-3 font-medium">
                          <span className="bg-primary/15 text-primary border border-primary/30 px-2.5 py-0.5 rounded-full text-[11px]">
                            {s.mode}
                          </span>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-text">
                          ₹ {Number(s.total || s.amt || 0).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* QUICK LOG EXPENSE MODAL */}
      <AddExpenseModal
        isOpen={isAddExpenseOpen}
        onClose={() => setIsAddExpenseOpen(false)}
        defaultDate={selectedDate}
        onSaveExpense={handleSaveDailyExpense}
      />
    </div>
  );
};
