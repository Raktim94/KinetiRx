import React, { useMemo } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  CreditCard,
  DollarSign,
  FileSpreadsheet,
  HandCoins,
  PackageCheck,
  Receipt,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Stethoscope,
  TrendingDown,
  TrendingUp,
  UserCheck,
  Users,
  Vault,
  Wallet,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  DailyRegister,
  ExpenseRecord,
  MarketingCampaign,
  Medicine,
  NeededMedOrder,
  OPDVisit,
  PatientDue,
  PatientRecord,
  SalesRecord,
  TabType,
} from '../../types';
import {
  formatFullDateWithDay,
  formatShortDayMonth,
  getPastNDays,
  getRelativeMonthYear,
  getTodayISODate,
} from '../../utils/dateUtils';

interface DashboardTabProps {
  medicines: Medicine[];
  salesHistory?: SalesRecord[];
  sales?: SalesRecord[];
  dailyRegister?: DailyRegister;
  expenses?: ExpenseRecord[];
  patientsDue?: (PatientDue | PatientRecord)[];
  neededMeds?: NeededMedOrder[];
  opdVisits?: OPDVisit[];
  marketingCampaigns?: MarketingCampaign[];
  drawerCash?: number;
  totalSoldUnits?: number;
  onOpenUniversalModal?: (type: any) => void;
  onOpenExpiryDetails?: () => void;
  onOpenRevisitDetails?: () => void;
  onOpenSalesDetails?: () => void;
  onOpenDueDetails?: () => void;
  onOpenCashDetails?: () => void;
  onOpenStockDetails?: () => void;
  onOpenAIFinder?: () => void;
  onNavigateTab?: (tab: TabType) => void;
  onNavigateToTab?: (tab: any) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  medicines = [],
  salesHistory = [],
  sales = [],
  dailyRegister,
  expenses = [],
  patientsDue = [],
  neededMeds = [],
  opdVisits = [],
  marketingCampaigns = [],
  drawerCash: propDrawerCash,
  totalSoldUnits: propSoldUnits,
  onOpenUniversalModal,
  onOpenExpiryDetails,
  onOpenRevisitDetails,
  onOpenSalesDetails,
  onOpenDueDetails,
  onOpenCashDetails,
  onOpenStockDetails,
  onOpenAIFinder,
  onNavigateTab,
  onNavigateToTab,
}) => {
  const allSales = salesHistory.length > 0 ? salesHistory : (sales.length > 0 ? sales : []);
  const navigate = onNavigateTab || onNavigateToTab || (() => {});

  // Current live today reference
  const todayISO = getTodayISODate();
  const registerDate = dailyRegister?.date || todayISO;

  // 1. TODAY'S SALES CALCULATION (Matches current date or active register)
  const todaySalesList = useMemo(() => {
    const directMatches = allSales.filter(s => s.date === todayISO || s.date === registerDate);
    return directMatches.length > 0 ? directMatches : allSales.filter(s => s.date >= todayISO);
  }, [allSales, todayISO, registerDate]);

  const computedTodaySales = useMemo(() => {
    if (dailyRegister?.todaySell !== undefined) {
      return dailyRegister.todaySell;
    }
    const sum = todaySalesList.reduce((acc, s) => acc + (Number(s.total || s.amt) || 0), 0);
    return sum > 0 ? sum : (dailyRegister?.totalSales ?? 0);
  }, [dailyRegister, todaySalesList]);

  // 2. TOTAL DUE KHATA OUTSTANDING
  const totalDueAmount = useMemo(() => {
    return patientsDue.reduce((sum, p: any) => {
      const val = p.dueAmount !== undefined ? p.dueAmount : (p.totalDue !== undefined ? p.totalDue : (p.due || 0));
      return sum + (Number(val) || 0);
    }, 0);
  }, [patientsDue]);

  // 3. STOCK SKUs & VALUATION
  const totalStockUnits = useMemo(() => {
    return medicines.reduce((sum, m) => sum + (Number(m.stock) || 0), 0);
  }, [medicines]);

  const totalStockValuation = useMemo(() => {
    return medicines.reduce((sum, m) => {
      const rate = Number(m.rate) || (Number(m.mrp || 0) * 0.7);
      return sum + rate * (Number(m.stock) || 0);
    }, 0);
  }, [medicines]);

  const lowStockCount = useMemo(() => {
    return medicines.filter(m => (Number(m.stock) || 0) <= 10).length;
  }, [medicines]);

  const outOfStockCount = useMemo(() => {
    return medicines.filter(m => (Number(m.stock) || 0) <= 0).length;
  }, [medicines]);

  // 4. DRAWER CASH RECONCILIATION
  const drawerCash = useMemo(() => {
    if (propDrawerCash !== undefined) return propDrawerCash;
    const prevBD = dailyRegister?.prevBD ?? dailyRegister?.openingCash ?? 0;
    const todaySell = computedTodaySales;
    const phonePe = dailyRegister?.phonePe ?? 0;
    const exp = dailyRegister?.expenses ?? 0;
    const bankShift = dailyRegister?.bankShift ?? 0;
    return Math.max(0, prevBD + todaySell - phonePe - exp - bankShift);
  }, [propDrawerCash, dailyRegister, computedTodaySales]);

  // 5. EXPIRING & REVISIT ALERTS (Dynamic 6-month window)
  const sixMonthsCutoff = getRelativeMonthYear(6);
  const expiringItems = useMemo(() => {
    return medicines.filter(m => m.expiry && m.expiry <= sixMonthsCutoff);
  }, [medicines, sixMonthsCutoff]);

  const upcomingRevisits = useMemo(() => {
    return opdVisits.filter(o => o.rvdate && o.rvdate >= todayISO);
  }, [opdVisits, todayISO]);

  // 6. TOTAL SOLD UNITS
  const totalSoldUnits = useMemo(() => {
    if (propSoldUnits !== undefined) return propSoldUnits;
    return allSales.reduce((acc, s) => {
      if (typeof s.qty === 'number') return acc + s.qty;
      if (typeof s.qty === 'string') {
        const num = parseInt(s.qty.replace(/[^0-9]/g, ''), 10);
        return acc + (isNaN(num) ? 1 : num);
      }
      return acc + 1;
    }, 0);
  }, [propSoldUnits, allSales]);

  // 7. 7-DAY REVENUE VS EXPENSE TREND CHART DATA (Dynamic Last 7 Days)
  const trendData = useMemo(() => {
    const past7Days = getPastNDays(7);
    return past7Days.map(dayItem => {
      const isToday = dayItem.date === todayISO;
      const daySales = allSales
        .filter(s => s.date === dayItem.date)
        .reduce((sum, s) => sum + (Number(s.total || s.amt) || 0), 0);
      const dayExpenses = expenses
        .filter(e => e.date === dayItem.date)
        .reduce((sum, e) => sum + (Number(e.amt) || 0), 0);

      const resolvedSales = isToday ? computedTodaySales : daySales;
      const resolvedExpenses = isToday ? (dailyRegister?.expenses ?? 0) : dayExpenses;

      return {
        day: dayItem.label,
        fullDate: dayItem.date,
        sales: resolvedSales,
        expense: resolvedExpenses,
      };
    });
  }, [allSales, expenses, todayISO, computedTodaySales, dailyRegister?.expenses]);

  // 8. PAYMENT BREAKDOWN PIE DATA
  const paymentData = useMemo(() => {
    const upiVal = dailyRegister?.phonePe ?? dailyRegister?.upiSales ?? 0;
    return [
      { name: 'Cash in Drawer', value: Math.max(0, drawerCash), color: 'var(--color-success)' },
      { name: 'PhonePe / UPI', value: Math.max(0, upiVal), color: 'var(--color-primary)' },
      { name: 'Due Balance', value: Math.max(0, totalDueAmount), color: 'var(--color-danger)' },
    ];
  }, [drawerCash, dailyRegister, totalDueAmount]);

  // 9. STOCK FLOW BAR DATA
  const stockFlowData = useMemo(() => {
    return [
      { name: 'In-Hand Stock', units: totalStockUnits, fill: 'var(--color-primary)' },
      { name: 'Sold Out Units', units: totalSoldUnits, fill: 'var(--color-success)' },
      { name: 'Low Stock (<10)', units: lowStockCount * 8, fill: 'var(--color-warning)' },
    ];
  }, [totalStockUnits, totalSoldUnits, lowStockCount]);

  // Unified click handlers
  const handleExpiryClick = () => {
    if (onOpenExpiryDetails) onOpenExpiryDetails();
    else if (onOpenUniversalModal) onOpenUniversalModal('expiry');
  };

  const handleRevisitClick = () => {
    if (onOpenRevisitDetails) onOpenRevisitDetails();
    else if (onOpenUniversalModal) onOpenUniversalModal('revisits');
  };

  const handleSalesClick = () => {
    if (onOpenSalesDetails) onOpenSalesDetails();
    else if (onOpenUniversalModal) onOpenUniversalModal('today_sales');
    else navigate('daily-sales');
  };

  const handleDueClick = () => {
    if (onOpenDueDetails) onOpenDueDetails();
    else if (onOpenUniversalModal) onOpenUniversalModal('total_due');
    else navigate('due-khata');
  };

  const handleCashClick = () => {
    if (onOpenCashDetails) onOpenCashDetails();
    else if (onOpenUniversalModal) onOpenUniversalModal('drawer_cash');
    else navigate('daily-sales');
  };

  const handleStockClick = () => {
    if (onOpenStockDetails) onOpenStockDetails();
    else if (onOpenUniversalModal) onOpenUniversalModal('stock_skus');
    else navigate('inventory');
  };

  return (
    <div className="space-y-6">
      {/* 1. TOP HERO HEADER & ACTIONS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text flex items-center gap-2.5">
              <span>Pharmacy Overview & Live Analytics</span>
            </h1>
            <span className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs px-3 py-1 rounded-full flex items-center gap-1.5 backdrop-blur-md">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>{formatFullDateWithDay(todayISO)}</span>
            </span>
          </div>
          <p className="text-sm text-text-muted mt-1">
            Real-time counter sales, cash drawer reconciliation, patient dues, and pharmaceutical inventory for today.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {onOpenAIFinder && (
            <button
              id="btn-dash-ai-assistant"
              onClick={onOpenAIFinder}
              className="h-10 px-4 bg-primary/30 hover:bg-primary/40 border border-primary/40 rounded-full flex items-center gap-2 text-xs font-semibold text-primary backdrop-blur-md transition shadow-lg shadow-primary/40 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Ask AI Pharmacist</span>
            </button>
          )}

          <button
            id="btn-dash-open-pos"
            onClick={() => navigate('pos')}
            className="h-10 px-5 bg-success hover:brightness-105 text-primary-foreground rounded-full flex items-center gap-2 text-xs font-bold shadow-lg transition cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>+ POS Billing Counter</span>
          </button>
        </div>
      </div>

      {/* 2. FROSTED ALERT BANNERS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Short Expiry Alert */}
        <div
          id="dash-expiry-alert-card"
          onClick={handleExpiryClick}
          className="p-5 rounded-3xl bg-surface backdrop-blur-xl border border-warning/30 hover:border-warning/50 transition-all cursor-pointer shadow-lg group"
        >
          <div className="flex items-center justify-between font-bold text-warning">
            <span className="flex items-center gap-2.5 text-sm">
              <div className="w-8 h-8 rounded-xl bg-warning/20 border border-warning/30 flex items-center justify-center text-warning">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <span>6-Month Short Expiry Alert</span>
            </span>
            <span
              id="dash-expiry-count"
              className="bg-warning/20 border border-warning/30 text-warning px-3 py-1 rounded-full text-xs font-bold font-mono"
            >
              {expiringItems.length} Batches
            </span>
          </div>
          <p id="dash-expiry-preview" className="text-text-muted text-xs mt-2.5 truncate">
            {expiringItems.map(e => `${e.name} (${e.expiry})`).join(', ') || 'No critical expiring medicines'}
          </p>
          <div className="text-[11px] text-warning font-semibold flex items-center gap-1 mt-3 group-hover:text-warning transition">
            <span>View expiring batches & return list</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>

        {/* OPD Revisit Alert */}
        <div
          id="dash-revisit-alert-card"
          onClick={handleRevisitClick}
          className="p-5 rounded-3xl bg-surface backdrop-blur-xl border border-primary/30 hover:border-primary/50 transition-all cursor-pointer shadow-lg shadow-primary/20 group"
        >
          <div className="flex items-center justify-between font-bold text-primary">
            <span className="flex items-center gap-2.5 text-sm">
              <div className="w-8 h-8 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center text-primary">
                <UserCheck className="w-4 h-4" />
              </div>
              <span>Upcoming OPD Follow-ups</span>
            </span>
            <span
              id="dash-revisit-count"
              className="bg-primary/20 border border-primary/30 text-primary px-3 py-1 rounded-full text-xs font-bold font-mono"
            >
              {upcomingRevisits.length} Patients
            </span>
          </div>
          <p id="dash-revisit-preview" className="text-text-muted text-xs mt-2.5 truncate">
            {upcomingRevisits.map(o => `${o.name} (${o.rvdate})`).join(', ') || 'No follow-up visits pending'}
          </p>
          <div className="text-[11px] text-primary font-semibold flex items-center gap-1 mt-3 group-hover:text-primary transition">
            <span>Send WhatsApp follow-up reminders</span>
            <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
        </div>
      </div>

      {/* 3. CORE 5 KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* KPI 1: Today's Sales */}
        <div
          id="dash-kpi-sales"
          onClick={handleSalesClick}
          className="p-5 rounded-3xl bg-surface backdrop-blur-xl border border-border hover:border-success/40 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-text-muted">
            <p className="text-xs font-medium text-text-muted">Today's Sales</p>
            <div className="w-9 h-9 rounded-xl bg-success/15 border border-success/30 flex items-center justify-center text-success group-hover:bg-success group-hover:text-primary-foreground transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 id="dash-revenue" className="text-2xl font-bold font-mono text-text">
              ₹ {computedTodaySales.toFixed(2)}
            </h3>
            <p className="text-[11px] text-success font-medium mt-1 flex items-center gap-1">
              <span>{todaySalesList.length} Billed Orders</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* KPI 2: Total Due Khata */}
        <div
          id="dash-kpi-due"
          onClick={handleDueClick}
          className="p-5 rounded-3xl bg-surface backdrop-blur-xl border border-border hover:border-danger/40 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-text-muted">
            <p className="text-xs font-medium text-text-muted">Total Due</p>
            <div className="w-9 h-9 rounded-xl bg-danger/15 border border-danger/30 flex items-center justify-center text-danger group-hover:bg-danger group-hover:text-primary-foreground transition">
              <HandCoins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 id="dash-due" className="text-2xl font-bold font-mono text-danger">
              ₹ {totalDueAmount.toFixed(2)}
            </h3>
            <p className="text-[11px] text-danger font-medium mt-1 flex items-center gap-1">
              <span>{patientsDue.length} Patients with Dues</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* KPI 3: Drawer Cash */}
        <div
          id="dash-kpi-cash"
          onClick={handleCashClick}
          className="p-5 rounded-3xl bg-surface backdrop-blur-xl border border-border hover:border-primary/40 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-text-muted">
            <p className="text-xs font-medium text-text-muted">Drawer Cash</p>
            <div className="w-9 h-9 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition">
              <Vault className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 id="dash-cash-balance" className="text-2xl font-bold font-mono text-primary">
              ₹ {drawerCash.toFixed(2)}
            </h3>
            <p className="text-[11px] text-primary font-medium mt-1 flex items-center gap-1">
              <span>Physical Closing Cash</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* KPI 4: Stock SKUs */}
        <div
          id="dash-kpi-skus"
          onClick={handleStockClick}
          className="p-5 rounded-3xl bg-surface backdrop-blur-xl border border-border hover:border-accent/40 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-text-muted">
            <p className="text-xs font-medium text-text-muted">Stock SKUs</p>
            <div className="w-9 h-9 rounded-xl bg-accent/15 border border-accent/30 flex items-center justify-center text-accent group-hover:bg-accent group-hover:text-primary-foreground transition">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 id="dash-skus" className="text-2xl font-bold font-mono text-text">
              {medicines.length} SKUs
            </h3>
            <p className="text-[11px] text-accent font-medium mt-1 flex items-center gap-1">
              <span>{totalStockUnits} Total Units ({lowStockCount} Low)</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>

        {/* KPI 5: Stock Valuation */}
        <div
          id="dash-kpi-val"
          onClick={() => navigate('inventory')}
          className="p-5 rounded-3xl bg-surface backdrop-blur-xl border border-border hover:border-warning/40 transition-all cursor-pointer shadow-lg group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-text-muted">
            <p className="text-xs font-medium text-text-muted">Stock Valuation</p>
            <div className="w-9 h-9 rounded-xl bg-warning/15 border border-warning/30 flex items-center justify-center text-warning group-hover:bg-warning group-hover:text-primary-foreground transition">
              <Coins className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <h3 id="dash-stock-value" className="text-2xl font-bold font-mono text-text">
              ₹ {totalStockValuation.toFixed(2)}
            </h3>
            <p className="text-[11px] text-warning font-medium mt-1 flex items-center gap-1">
              <span>Purchase valuation</span>
              <ArrowUpRight className="w-3 h-3" />
            </p>
          </div>
        </div>
      </div>

      {/* 4. FROSTED CHARTS CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Chart 1: Revenue vs Expense Trend */}
        <div className="p-6 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-text text-sm">Revenue vs Expenses</h4>
              <p className="text-[11px] text-text-muted">7-Day Financial Flow</p>
            </div>
            <span className="text-[10px] font-mono bg-primary/20 border border-primary/30 text-primary px-2.5 py-1 rounded-full font-bold">
              Live
            </span>
          </div>
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trendData}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-danger)" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="var(--color-danger)" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: number) => [`₹ ${val.toFixed(2)}`, '']}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    color: 'var(--color-text)',
                    fontSize: '11px',
                  }}
                />
                <Area type="monotone" dataKey="sales" name="Sales" stroke="var(--color-primary)" strokeWidth={2} fill="url(#salesGrad)" />
                <Area type="monotone" dataKey="expense" name="Expense" stroke="var(--color-danger)" strokeWidth={2} fill="url(#expGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Payment Breakdown */}
        <div className="p-6 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-text text-sm">Payment Breakdown</h4>
              <p className="text-[11px] text-text-muted">Cash vs UPI vs Due Balance</p>
            </div>
            <span className="text-[10px] font-mono bg-emerald-500/20 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 px-2.5 py-1 rounded-full font-bold">
              Current
            </span>
          </div>
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={paymentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {paymentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="var(--color-surface)" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: number) => [`₹ ${val.toFixed(2)}`, '']}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    color: 'var(--color-text)',
                    fontSize: '11px',
                  }}
                />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '11px', paddingTop: '8px', color: 'var(--color-text-muted)' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Stock Flow */}
        <div className="p-6 rounded-3xl bg-surface backdrop-blur-xl border border-border shadow-xl space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h4 className="font-bold text-text text-sm">Inventory Turnover</h4>
              <p className="text-[11px] text-text-muted">Units in Stock vs Sold</p>
            </div>
            <span className="text-[10px] font-mono bg-primary/20 border border-primary/30 text-primary px-2.5 py-1 rounded-full font-bold">
              {totalSoldUnits} Sold
            </span>
          </div>
          <div className="h-56 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stockFlowData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--color-border)" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(val: number) => [`${val} Units`, 'Quantity']}
                  contentStyle={{
                    backgroundColor: 'var(--color-surface-elevated)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid var(--color-border)',
                    borderRadius: '16px',
                    color: 'var(--color-text)',
                    fontSize: '11px',
                  }}
                />
                <Bar dataKey="units" radius={[12, 12, 0, 0]}>
                  {stockFlowData.map((entry, index) => (
                    <Cell key={`bar-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
