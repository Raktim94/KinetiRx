import React from 'react';
import { Calendar, KeyRound, LogOut, Menu, Moon, PlusCircle, Sparkles, Sun, User, Zap } from 'lucide-react';
import { CurrentUser, TabId } from '../types';
import { useTheme } from '../hooks/useTheme';

interface HeaderProps {
  currentTab: TabId;
  currentUser?: CurrentUser;
  currentUserName?: string;
  onOpenMobileMenu?: () => void;
  onOpenNewBill?: () => void;
  onOpenAddStock?: () => void;
  onOpenAIFinder?: () => void;
  onOpenLoginModal?: () => void;
  onOpenChangePassword?: () => void;
  onLogout?: () => void;
  todayDate?: string;
}

const tabTitles: Record<string, { title: string; subtitle: string }> = {
  dashboard: { title: 'Dashboard & Analytics', subtitle: 'Overview & Alerts' },
  'daily-sales': { title: 'Daily Sales & Drawer Register', subtitle: 'Daily Sales & Cash Drawer' },
  pos: { title: 'Smart Pharmacy & Lab POS', subtitle: 'Counter Billing & Invoicing' },
  'due-khata': { title: 'Patient Due Register', subtitle: 'Patient Dues & Reminders' },
  opd: { title: 'OPD & Re-visit Clinical Register', subtitle: 'OPD Visits & Follow-ups' },
  patients: { title: 'Patient Database Profiles', subtitle: 'Patient Database & History' },
  'medicine-orders': { title: 'Special Medicine Need Orders', subtitle: 'Urgent Medicine Procurement Log' },
  inventory: { title: 'Medicine Stock Management', subtitle: 'Medicine Stock, Racks & Distributors' },
  'inward-ocr': { title: 'Supplier Purchase Bill Auto-Scan (OCR)', subtitle: 'Distributor Invoice Scan & Auto-Stock' },
  expenses: { title: 'Daily Expenditure Register', subtitle: 'Daily Expenses & Vouchers' },
  'business-dev': { title: 'Business Dev & Doctor Marketing', subtitle: 'Doctor Outreach & Task List' },
  'employee-mgmt': { title: 'Employee Control & Module Access', subtitle: 'Employee & Permission Control' },
  'invoice-settings': { title: 'Invoice & WhatsApp Settings', subtitle: 'Store Name & Billing Settings' },
  'system-reset': { title: 'System Factory Reset & 5-Day Backup', subtitle: 'System Reset & 5-Day Backup' },
};

export const Header: React.FC<HeaderProps> = ({
  currentTab,
  currentUser,
  currentUserName,
  onOpenMobileMenu,
  onOpenNewBill,
  onOpenAddStock,
  onOpenAIFinder,
  onOpenLoginModal,
  onOpenChangePassword,
  onLogout,
  todayDate = new Date().toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }),
}) => {
  const currentInfo = tabTitles[currentTab] || { title: 'Pharma Care Pro', subtitle: '' };
  const displayName = currentUser?.name || currentUserName || 'Admin (Director)';
  const isSuperAdmin = currentUser ? currentUser.role === 'admin' : true;
  const { theme, toggleTheme } = useTheme();

  return (
    <header
      id="app-header"
      className="glass-panel-subtle border-b border-border px-4 sm:px-6 py-3 flex justify-between items-center shrink-0 z-20 text-text"
    >
      <div className="flex items-center space-x-3">
        {onOpenMobileMenu && (
          <button
            id="open-mobile-menu-btn"
            onClick={onOpenMobileMenu}
            className="p-2 rounded-xl text-text-muted hover:bg-bg lg:hidden transition border border-border"
            aria-label="Open navigation menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        )}

        <div>
          <h2 className="text-base sm:text-lg font-extrabold text-text flex items-center gap-2 tracking-tight">
            <span>{currentInfo.title}</span>
            <span className="text-xs text-text-muted font-normal hidden sm:inline">
              ({currentInfo.subtitle})
            </span>
          </h2>
          <p className="text-[11px] text-text-muted flex items-center gap-1.5 mt-0.5">
            <User className="w-3 h-3 text-primary" />
            <span>
              Active User:{' '}
              <strong className="text-primary font-medium">
                {displayName} ({isSuperAdmin ? 'Super Admin' : 'Staff'})
              </strong>
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center flex-wrap justify-end gap-2 sm:gap-3">
        {/* Theme Toggle */}
        <button
          id="theme-toggle-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-2 rounded-xl text-text-muted hover:text-text border border-border hover:bg-bg transition cursor-pointer"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        {/* AI Generic Finder */}
        {onOpenAIFinder && (
          <button
            id="header-ai-finder-btn"
            onClick={onOpenAIFinder}
            className="flex items-center gap-1.5 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/30 px-3 py-1.5 rounded-xl text-xs font-bold transition shadow-lg shadow-primary/10 backdrop-blur-md cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">AI Medicine Finder</span>
            <span className="sm:hidden">AI Finder</span>
          </button>
        )}

        {/* Quick Action POS Bill */}
        {onOpenNewBill && (
          <button
            id="quick-new-bill-btn"
            onClick={onOpenNewBill}
            className="hidden md:flex items-center gap-1.5 bg-success/10 hover:bg-success/20 text-success border border-success/30 px-2.5 py-1.5 rounded-xl text-xs font-bold transition shadow-md backdrop-blur-md cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>+ Quick POS Bill</span>
          </button>
        )}

        {/* Quick Action Add Stock */}
        {onOpenAddStock && (
          <button
            id="quick-add-stock-btn"
            onClick={onOpenAddStock}
            className="hidden md:flex items-center gap-1.5 bg-bg hover:bg-border text-text border border-border px-2.5 py-1.5 rounded-xl text-xs font-bold transition backdrop-blur-md cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5 text-primary" />
            <span>+ Add Stock</span>
          </button>
        )}

        {/* Switch User Login Button */}
        {onOpenLoginModal && (
          <button
            id="header-switch-user-btn"
            onClick={onOpenLoginModal}
            className="text-xs text-text-muted hover:text-text border border-border px-2.5 py-1.5 rounded-xl font-medium hover:bg-bg transition backdrop-blur-md cursor-pointer"
          >
            Switch User
          </button>
        )}

        {/* Change Own Password — available to any signed-in employee, not
            just from the admin-only Employee Control tab. */}
        {onOpenChangePassword && (
          <button
            id="header-change-password-btn"
            onClick={onOpenChangePassword}
            title="Change your password"
            aria-label="Change your password"
            className="p-2 rounded-xl text-text-muted hover:text-primary border border-border hover:bg-bg transition cursor-pointer"
          >
            <KeyRound className="w-4 h-4" />
          </button>
        )}

        {/* Log Out */}
        {onLogout && (
          <button
            id="header-logout-btn"
            onClick={onLogout}
            title="Log out"
            aria-label="Log out"
            className="p-2 rounded-xl text-text-muted hover:text-rose-400 border border-border hover:bg-bg transition cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}

        {/* Live Date Badge */}
        <div className="bg-bg border border-border px-2.5 sm:px-3 py-1 rounded-xl text-xs font-medium text-text-muted flex items-center gap-1.5 backdrop-blur-md">
          <Calendar className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-text">{todayDate}</span>
        </div>
      </div>
    </header>
  );
};
