import React, { useState } from 'react';
import {
  Activity,
  Boxes,
  Calculator,
  ChevronDown,
  CreditCard,
  FileCheck2,
  FileText,
  IdCard,
  LogOut,
  Megaphone,
  Receipt,
  RotateCcw,
  ScanLine,
  ShieldCheck,
  Stethoscope,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { CurrentUser, TabType } from '../types';

interface SidebarProps {
  currentTab: TabType;
  setCurrentTab: (tab: TabType) => void;
  currentUser?: CurrentUser;
  onOpenSwitchUser?: () => void;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
  dueKhataCount?: number;
  neededMedsCount?: number;
  opdCount?: number;
  userPermissions?: TabType[];
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  setCurrentTab,
  currentUser,
  onOpenSwitchUser,
  isOpenMobile = false,
  onCloseMobile = () => {},
  dueKhataCount = 0,
  neededMedsCount = 0,
  opdCount = 0,
  userPermissions,
}) => {
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    accounting: true,
    clinical: true,
    stock: true,
    admin: true,
  });

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const isPermitted = (tab: TabType) => {
    if (!currentUser && !userPermissions) return true;
    if (currentUser?.role === 'admin') return true;
    const permissions = userPermissions || currentUser?.permissions || [];
    return permissions.includes(tab);
  };

  const handleTabClick = (tab: TabType) => {
    if (isPermitted(tab)) {
      setCurrentTab(tab);
      onCloseMobile();
    } else {
      alert('Access Denied: You do not have permission to view this module.');
    }
  };

  const activeUserRole =
    currentUser?.role === 'admin' ? 'Super Admin' : currentUser?.name || 'Director';

  const isTabActive = (tab: TabType) => currentTab === tab;

  const navItemClass = (active: boolean) =>
    `w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all font-medium ${
      active
        ? 'bg-primary/10 border border-primary/30 text-primary font-semibold shadow-sm'
        : 'text-text-muted hover:text-text hover:bg-bg border border-transparent'
    }`;

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpenMobile && (
        <div
          id="mobile-sidebar-backdrop"
          onClick={onCloseMobile}
          className="fixed inset-0 bg-[var(--color-overlay)] backdrop-blur-md z-40 lg:hidden transition-opacity"
        />
      )}

      <aside
        id="app-sidebar"
        className={`fixed lg:static top-0 left-0 bottom-0 z-40 w-72 bg-surface backdrop-blur-2xl border-r border-border text-text-muted flex flex-col shrink-0 transition-transform duration-200 ease-in-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-4 sm:p-5 border-b border-border flex items-center justify-between bg-surface">
          <div className="flex items-center space-x-3">
            <img
              src="/logo.png"
              alt="KinetiRx logo"
              className="w-10 h-10 rounded-xl shadow-lg shadow-primary/25 object-cover"
            />
            <div>
              <h1 className="text-base font-bold text-text tracking-tight flex items-center gap-1.5">
                KinetiRx
              </h1>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="inline-block w-2 h-2 rounded-full bg-success animate-pulse" />
                <p className="text-xs text-text-muted font-medium">{activeUserRole}</p>
              </div>
            </div>
          </div>
          <button
            id="close-mobile-nav-btn"
            onClick={onCloseMobile}
            className="p-1.5 rounded-lg text-text-muted hover:text-text hover:bg-bg lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Sections */}
        <nav className="flex-1 p-3.5 space-y-3 overflow-y-auto text-xs custom-scrollbar">
          {/* GROUP 1: ACCOUNTING & POS */}
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => toggleGroup('accounting')}
              className="w-full flex justify-between items-center px-3 py-1.5 text-text-muted hover:text-text transition rounded-lg hover:bg-bg select-none text-left"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Calculator className="w-3.5 h-3.5 text-primary" />
                Accounting & POS
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
                  openGroups.accounting ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {openGroups.accounting && (
              <div className="space-y-1 pl-1">
                {isPermitted('dashboard') && (
                  <button
                    id="nav-dashboard"
                    onClick={() => handleTabClick('dashboard')}
                    className={navItemClass(isTabActive('dashboard'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Activity className="w-4 h-4 text-primary" />
                      <span>Dashboard & Analytics</span>
                    </div>
                  </button>
                )}

                {isPermitted('daily-sales') && (
                  <button
                    id="nav-daily-calc"
                    onClick={() => handleTabClick('daily-sales')}
                    className={navItemClass(isTabActive('daily-sales'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Calculator className="w-4 h-4 text-warning" />
                      <span>Daily Sales Register</span>
                    </div>
                  </button>
                )}

                {isPermitted('pos') && (
                  <button
                    id="nav-pos"
                    onClick={() => handleTabClick('pos')}
                    className={navItemClass(isTabActive('pos'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Receipt className="w-4 h-4 text-success" />
                      <span>Smart Pharmacy POS</span>
                    </div>
                    <span className="bg-success/15 text-success border border-success/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                      Live
                    </span>
                  </button>
                )}

                {isPermitted('due-khata') && (
                  <button
                    id="nav-due-khata"
                    onClick={() => handleTabClick('due-khata')}
                    className={navItemClass(isTabActive('due-khata'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <CreditCard className="w-4 h-4 text-danger" />
                      <span>Due Register</span>
                    </div>
                    {dueKhataCount > 0 && (
                      <span className="bg-danger/15 text-danger border border-danger/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {dueKhataCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* GROUP 2: CLINICAL & PATIENTS */}
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={() => toggleGroup('clinical')}
              className="w-full flex justify-between items-center px-3 py-1.5 text-text-muted hover:text-text transition rounded-lg hover:bg-bg select-none text-left"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Stethoscope className="w-3.5 h-3.5 text-accent" />
                Clinical & Patients
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
                  openGroups.clinical ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {openGroups.clinical && (
              <div className="space-y-1 pl-1">
                {isPermitted('opd') && (
                  <button
                    id="nav-opd"
                    onClick={() => handleTabClick('opd')}
                    className={navItemClass(isTabActive('opd'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Stethoscope className="w-4 h-4 text-accent" />
                      <span>OPD & Re-visits</span>
                    </div>
                    {opdCount > 0 && (
                      <span className="bg-accent/15 text-accent border border-accent/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {opdCount}
                      </span>
                    )}
                  </button>
                )}

                {isPermitted('patients') && (
                  <button
                    id="nav-patients"
                    onClick={() => handleTabClick('patients')}
                    className={navItemClass(isTabActive('patients'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <IdCard className="w-4 h-4 text-primary" />
                      <span>Patient Profiles</span>
                    </div>
                  </button>
                )}

                {isPermitted('medicine-orders') && (
                  <button
                    id="nav-medicine-orders"
                    onClick={() => handleTabClick('medicine-orders')}
                    className={navItemClass(isTabActive('medicine-orders'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileCheck2 className="w-4 h-4 text-primary" />
                      <span>Special Need Orders</span>
                    </div>
                    {neededMedsCount > 0 && (
                      <span className="bg-primary/15 text-primary border border-primary/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {neededMedsCount}
                      </span>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* GROUP 3: STOCK & OPERATIONS */}
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={() => toggleGroup('stock')}
              className="w-full flex justify-between items-center px-3 py-1.5 text-text-muted hover:text-text transition rounded-lg hover:bg-bg select-none text-left"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <Boxes className="w-3.5 h-3.5 text-accent" />
                Stock & Operations
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
                  openGroups.stock ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {openGroups.stock && (
              <div className="space-y-1 pl-1">
                {isPermitted('inventory') && (
                  <button
                    id="nav-inventory"
                    onClick={() => handleTabClick('inventory')}
                    className={navItemClass(isTabActive('inventory'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Boxes className="w-4 h-4 text-accent" />
                      <span>Medicine Stock</span>
                    </div>
                  </button>
                )}

                {isPermitted('inward-ocr') && (
                  <button
                    id="nav-inward"
                    onClick={() => handleTabClick('inward-ocr')}
                    className={navItemClass(isTabActive('inward-ocr'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <ScanLine className="w-4 h-4 text-warning" />
                      <span>OCR Purchase Bills</span>
                    </div>
                  </button>
                )}

                {isPermitted('expenses') && (
                  <button
                    id="nav-expenses"
                    onClick={() => handleTabClick('expenses')}
                    className={navItemClass(isTabActive('expenses'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Wallet className="w-4 h-4 text-warning" />
                      <span>Daily Expenditures</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* GROUP 4: ADMIN & SETTINGS */}
          <div className="space-y-1 pt-1">
            <button
              type="button"
              onClick={() => toggleGroup('admin')}
              className="w-full flex justify-between items-center px-3 py-1.5 text-text-muted hover:text-text transition rounded-lg hover:bg-bg select-none text-left"
            >
              <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-text-muted" />
                Admin & Settings
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 text-text-muted transition-transform duration-200 ${
                  openGroups.admin ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>

            {openGroups.admin && (
              <div className="space-y-1 pl-1">
                {isPermitted('business-dev') && (
                  <button
                    id="nav-business-dev"
                    onClick={() => handleTabClick('business-dev')}
                    className={navItemClass(isTabActive('business-dev'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Megaphone className="w-4 h-4 text-accent" />
                      <span>Doctor Campaigns</span>
                    </div>
                  </button>
                )}

                {isPermitted('employee-mgmt') && (
                  <button
                    id="nav-employee-mgmt"
                    onClick={() => handleTabClick('employee-mgmt')}
                    className={navItemClass(isTabActive('employee-mgmt'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <Users className="w-4 h-4 text-accent" />
                      <span>Employee Control</span>
                    </div>
                  </button>
                )}

                {isPermitted('invoice-settings') && (
                  <button
                    id="nav-invoice-settings"
                    onClick={() => handleTabClick('invoice-settings')}
                    className={navItemClass(isTabActive('invoice-settings'))}
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileText className="w-4 h-4 text-success" />
                      <span>Invoice Settings</span>
                    </div>
                  </button>
                )}

                {isPermitted('system-reset') && (
                  <button
                    id="nav-system-reset"
                    onClick={() => handleTabClick('system-reset')}
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all font-medium ${
                      isTabActive('system-reset')
                        ? 'bg-danger/10 border border-danger/30 text-danger font-semibold shadow-sm'
                        : 'text-text-muted hover:text-danger hover:bg-danger/10 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5">
                      <RotateCcw className={`w-4 h-4 text-danger ${isTabActive('system-reset') ? 'animate-spin-reverse' : ''}`} />
                      <span>Reset & 5-Day Backup</span>
                    </div>
                    <span className="bg-danger/15 text-danger text-[9px] font-bold px-1.5 py-0.5 rounded border border-danger/30">
                      Admin
                    </span>
                  </button>
                )}
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Status Pill (Storage / System Health) */}
        <div className="px-3 py-2">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-primary/10 to-transparent border border-border backdrop-blur-xl">
            <div className="flex justify-between items-center mb-1.5">
              <p className="text-[10px] text-text-muted uppercase tracking-widest font-bold">Cloud Sync & DB</p>
              <span className="text-[10px] font-mono text-success font-semibold">Online</span>
            </div>
            <div className="h-1.5 w-full bg-bg rounded-full overflow-hidden mb-1.5">
              <div className="h-full w-[78%] bg-primary rounded-full" />
            </div>
            <p className="text-[11px] text-text-muted font-mono">100% Encrypted Local ERP</p>
          </div>
        </div>

        {/* Sidebar Footer with Switch User Button */}
        <div className="p-3 border-t border-border bg-surface backdrop-blur-md text-[11px] flex items-center justify-between">
          {onOpenSwitchUser && (
            <button
              id="switch-user-btn"
              onClick={onOpenSwitchUser}
              className="text-primary hover:text-text flex items-center gap-1.5 font-semibold transition px-2.5 py-1.5 rounded-xl hover:bg-bg cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Switch User</span>
            </button>
          )}
          <span className="text-text-muted font-mono text-[10px] bg-bg px-2 py-0.5 rounded-lg border border-border ml-auto">
            v11.0
          </span>
        </div>

        {/* Brand Footer — bottom-left, nodedr branding (consistent across all Nodedr apps) */}
        <a
          href="https://kinetirx.nodedr.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="block px-4 py-2.5 border-t border-border bg-surface text-center text-[11px] leading-tight text-text-muted/70 hover:text-text-muted hover:underline transition"
        >
          KinetiRx · made by Nodedr Infotech Private Limited
        </a>
      </aside>
    </>
  );
};
