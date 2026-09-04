import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Header,
} from './components/Header';
import {
  Sidebar,
} from './components/Sidebar';
import {
  AddExpenseModal,
} from './components/modals/AddExpenseModal';
import {
  AddLabStockModal,
} from './components/modals/AddLabStockModal';
import {
  AddNeedMedModal,
} from './components/modals/AddNeedMedModal';
import {
  AddOPDModal,
} from './components/modals/AddOPDModal';
import {
  AddStockModal,
} from './components/modals/AddStockModal';
import { ManageMedicineGroupsModal } from './components/modals/ManageMedicineGroupsModal';
import { LowStockReorderModal } from './components/modals/LowStockReorderModal';
import {
  AIFinderModal,
} from './components/modals/AIFinderModal';
import {
  DistributorModal,
} from './components/modals/DistributorModal';
import {
  AddEmployeeModal,
  ChangeAdminPassModal,
  EditEmployeeModal,
} from './components/modals/EmployeeModals';
import {
  InvoicePrintModal,
} from './components/modals/InvoicePrintModal';
import {
  LoginModal,
} from './components/modals/LoginModal';
import { ForcedPasswordChangeScreen } from './components/ForcedPasswordChangeScreen';
import {
  SetupModal,
} from './components/modals/SetupModal';
import {
  MarketingModal,
  WorksheetModal,
} from './components/modals/MarketingWorksheetModals';
import {
  ModalType,
  UniversalDetailsModal,
} from './components/modals/UniversalDetailsModal';
import {
  BusinessDevTab,
} from './components/tabs/BusinessDevTab';
import {
  DailySalesTab,
} from './components/tabs/DailySalesTab';
import {
  DashboardTab,
} from './components/tabs/DashboardTab';
import {
  DueKhataTab,
} from './components/tabs/DueKhataTab';
import {
  EmployeeMgmtTab,
} from './components/tabs/EmployeeMgmtTab';
import {
  ExpensesTab,
} from './components/tabs/ExpensesTab';
import {
  InventoryTab,
} from './components/tabs/InventoryTab';
import {
  InvoiceSettingsTab,
} from './components/tabs/InvoiceSettingsTab';
import {
  SystemResetTab,
} from './components/tabs/SystemResetTab';
import {
  InwardOCRTab,
} from './components/tabs/InwardOCRTab';
import {
  MedicineOrdersTab,
} from './components/tabs/MedicineOrdersTab';
import {
  OPDTab,
} from './components/tabs/OPDTab';
import {
  PatientsTab,
} from './components/tabs/PatientsTab';
import {
  POSTab,
} from './components/tabs/POSTab';
import { getTodayISODate } from './utils/dateUtils';
import {
  CartItem,
  DailyRegister,
  Distributor,
  Employee,
  ExpenseRecord,
  InvoiceConfig,
  InvoicePrintData,
  MarketingCampaign,
  Medicine,
  MedicineGroup,
  NeededMedOrder,
  OPDVisit,
  OrganizationOnboardingData,
  PatientDue,
  PatientRecord,
  SalesRecord,
  SystemBackupSnapshot,
  TabType,
  WorksheetTask,
} from './types';
import {
  ApiError,
  authApi,
  AuthUser,
  clearToken,
  CrudClient,
  dailyRegisterApi,
  distributorsApi,
  dueKhataAsPatientRecordApi,
  employeesApi,
  expensesApi,
  getToken,
  invoiceConfigApi,
  marketingCampaignsApi,
  medicineGroupsApi,
  medicinesApi,
  neededMedsApi,
  opdVisitsApi,
  patientsApi,
  salesApi,
  setUnauthorizedHandler,
  worksheetTasksApi,
} from './lib/api';
import { useSyncedList, useSyncedSingleton } from './hooks/useSyncedResource';
import { useLiveSync } from './hooks/useLiveSync';

// Sales history is an append-mostly audit trail on the real backend — there
// is no PUT/DELETE endpoint for it by design (see backend/API.md). This
// adapts POSTab's `setSalesHistory(prev => [record, ...prev])` add-only
// usage onto the real `create`-only endpoint, while making it loud (instead
// of a silent no-op) if anything ever attempts an update/delete.
const salesCrud: CrudClient<SalesRecord> = {
  list: () => salesApi.list(),
  get: id => salesApi.get(id),
  create: item => salesApi.create(item),
  update: async () => {
    throw new ApiError({
      type: 'not_supported',
      title: 'Sales records cannot be edited — record a correction as a new sale instead.',
      status: 405,
    });
  },
  remove: async () => {
    throw new ApiError({
      type: 'not_supported',
      title: 'Sales records cannot be deleted on the server — they are an append-only audit trail.',
      status: 405,
    });
  },
};

const emptyDailyRegister: DailyRegister = {
  date: getTodayISODate(),
  prevBD: 0,
  todaySell: 0,
  phonePe: 0,
  expenses: 0,
  bankShift: 0,
  isLocked: false,
  openingCash: 0,
  totalSales: 0,
  cashSales: 0,
  upiSales: 0,
  cardSales: 0,
  totalExpenses: 0,
  denominations: {},
  closingPhysicalCash: 0,
  cashDifference: 0,
  isDrawerClosed: false,
};

const emptyInvoiceConfig: InvoiceConfig = {
  name: '',
  storeName: '',
  subtitle: '',
  dl: '',
  gst: '',
  phone: '',
  waGroup: '',
  addr: '',
  terms: '',
};

// Best-effort bulk create-or-update against a per-entity REST resource — used
// by the backup/restore and factory-reset flows, which operate on whole
// collections at once even though the backend only exposes one-record-at-a-
// time CRUD (there is intentionally no bulk "replace everything" endpoint;
// see backend/API.md "Deliberately not implemented").
async function bulkUpsert<T extends { id: string }>(crud: CrudClient<T>, items: T[]): Promise<void> {
  await Promise.all(
    items.map(async item => {
      try {
        await crud.create(item);
      } catch (err) {
        if (err instanceof ApiError && (err.status === 409 || err.status === 400)) {
          try {
            await crud.update(item.id, item);
          } catch {
            // best effort — leave this one record out rather than aborting the whole restore
          }
        }
      }
    })
  );
}

export function App() {
  // Current active navigation tab
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  // ---------------------------------------------------------------------
  // Auth
  // ---------------------------------------------------------------------
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);
  // null while unknown; only meaningful once !currentUser — decides whether
  // the auth gate below shows "create the first admin account" or "sign in".
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const prevUserRef = useRef<AuthUser | null>(null);

  const showError = useCallback((message: string, err?: unknown) => {
    if (err instanceof ApiError && err.status === 403) {
      alert(`Access Denied: ${err.message || 'You do not have permission to perform this action.'}`);
    } else {
      alert(message);
    }
  }, []);

  // Force a clean re-login from anywhere a request comes back 401 (expired
  // or invalid token) instead of leaving the UI half-authenticated.
  useEffect(() => {
    setUnauthorizedHandler(() => setCurrentUser(null));
    return () => setUnauthorizedHandler(null);
  }, []);

  // Restore session on mount via GET /api/auth/me (re-reads the employee
  // record from the DB, so a deleted account or permission edit takes
  // effect immediately rather than trusting stale JWT claims).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (getToken()) {
        try {
          const user = await authApi.me();
          if (!cancelled) setCurrentUser(user);
          if (!cancelled) setAuthLoading(false);
          return;
        } catch {
          clearToken();
        }
      }
      // No valid session — find out whether this is a fresh instance with
      // no admin account yet (show the create-account screen) or a normal
      // logged-out state (show the login form).
      try {
        const { needsSetup: needs } = await authApi.setupStatus();
        if (!cancelled) setNeedsSetup(needs);
      } catch {
        if (!cancelled) setNeedsSetup(false);
      } finally {
        if (!cancelled) setAuthLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleLogout = () => {
    clearToken();
    setCurrentUser(null);
  };

  // ---------------------------------------------------------------------
  // Core Data Stores — backed by the real Go backend via useSyncedList /
  // useSyncedSingleton (see src/hooks/useSyncedResource.ts). Child
  // components keep calling `setX(...)` exactly like a normal useState
  // setter; every call is diffed and turned into the matching
  // create/update/delete REST call.
  // ---------------------------------------------------------------------
  const [medicines, setMedicines, setMedicinesRaw] = useSyncedList<Medicine>(medicinesApi, showError);
  const [medicineGroups, setMedicineGroups, setMedicineGroupsRaw] = useSyncedList<MedicineGroup>(medicineGroupsApi, showError);
  const [distributors, setDistributors, setDistributorsRaw] = useSyncedList<Distributor>(distributorsApi, showError);
  const [patients, setPatients, setPatientsRaw] = useSyncedList<PatientRecord>(patientsApi, showError);
  // NOTE: `patientsDue` is, at runtime, actually shaped like PatientRecord
  // (totalDue/lastDate/doc/reason) rather than the API's leaner PatientDue
  // wire shape — see the comment on `dueKhataAsPatientRecordApi` in
  // src/lib/api.ts for why an adapter sits in front of /api/due-khata here.
  const [patientsDue, setPatientsDue, setPatientsDueRaw] = useSyncedList<PatientRecord>(
    dueKhataAsPatientRecordApi,
    showError
  );
  const [salesHistory, setSalesHistory, setSalesHistoryRaw] = useSyncedList<SalesRecord>(salesCrud, showError);
  const [expenses, setExpenses, setExpensesRaw] = useSyncedList<ExpenseRecord>(expensesApi, showError);
  const [neededMeds, setNeededMeds, setNeededMedsRaw] = useSyncedList<NeededMedOrder>(neededMedsApi, showError);
  const [opdVisits, setOpdVisits, setOpdVisitsRaw] = useSyncedList<OPDVisit>(opdVisitsApi, showError);
  const [marketingCampaigns, setMarketingCampaigns, setMarketingCampaignsRaw] = useSyncedList<MarketingCampaign>(
    marketingCampaignsApi,
    showError
  );
  const [worksheetTasks, setWorksheetTasks, setWorksheetTasksRaw] = useSyncedList<WorksheetTask>(
    worksheetTasksApi,
    showError
  );
  const [employees, setEmployees, setEmployeesRaw] = useSyncedList<Employee>(employeesApi, showError);
  const [dailyRegister, setDailyRegister, setDailyRegisterRaw] = useSyncedSingleton<DailyRegister>(
    emptyDailyRegister,
    dailyRegisterApi.put,
    showError
  );
  const [invoiceConfig, setInvoiceConfig, setInvoiceConfigRaw] = useSyncedSingleton<InvoiceConfig>(
    emptyInvoiceConfig,
    invoiceConfigApi.put,
    showError
  );

  // Load every entity once we have an authenticated session. Each list is
  // independent — a 403 (module the signed-in employee has no permission
  // for) is expected and skipped quietly since that tab is hidden from
  // their sidebar anyway; any other failure is surfaced.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    setDataLoading(true);

    async function safeList<T>(loader: () => Promise<T[]>, setter: (v: T[]) => void, label: string) {
      try {
        const data = await loader();
        if (!cancelled) setter(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) return;
        showError(
          `Failed to load ${label}: ${err instanceof ApiError ? err.describe() : 'network error contacting the server'}`,
          err
        );
      }
    }
    async function safeSingleton<T>(loader: () => Promise<T>, setter: (v: T) => void, label: string) {
      try {
        const data = await loader();
        if (!cancelled) setter(data);
      } catch (err) {
        if (err instanceof ApiError && err.status === 403) return;
        showError(
          `Failed to load ${label}: ${err instanceof ApiError ? err.describe() : 'network error contacting the server'}`,
          err
        );
      }
    }

    Promise.allSettled([
      safeList(medicinesApi.list, setMedicinesRaw, 'medicines'),
      safeList(medicineGroupsApi.list, setMedicineGroupsRaw, 'medicine groups'),
      safeList(distributorsApi.list, setDistributorsRaw, 'distributors'),
      safeList(patientsApi.list, setPatientsRaw, 'patients'),
      safeList(dueKhataAsPatientRecordApi.list, setPatientsDueRaw, 'due khata'),
      safeList(() => salesApi.list(), setSalesHistoryRaw, 'sales history'),
      safeList(expensesApi.list, setExpensesRaw, 'expenses'),
      safeList(neededMedsApi.list, setNeededMedsRaw, 'needed medicines'),
      safeList(opdVisitsApi.list, setOpdVisitsRaw, 'OPD visits'),
      safeList(marketingCampaignsApi.list, setMarketingCampaignsRaw, 'marketing campaigns'),
      safeList(worksheetTasksApi.list, setWorksheetTasksRaw, 'worksheet tasks'),
      safeList(employeesApi.list, setEmployeesRaw, 'employees'),
      safeSingleton(dailyRegisterApi.get, setDailyRegisterRaw, 'daily register'),
      safeSingleton(invoiceConfigApi.get, setInvoiceConfigRaw, 'invoice settings'),
    ]).then(() => {
      if (!cancelled) setDataLoading(false);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Multi-device live sync: when another counter's mutation lands, refetch
  // just the affected resource. Errors are swallowed (unlike the initial
  // load above) — a live-sync refresh failing on a transient blink shouldn't
  // interrupt whoever's mid-sale with an alert; the next event or reconnect
  // will catch it up.
  const handleLiveResourceChanged = useCallback((resource: string) => {
    switch (resource) {
      case 'medicines':
        medicinesApi.list().then(setMedicinesRaw).catch(() => {});
        break;
      case 'sales':
        salesApi.list().then(setSalesHistoryRaw).catch(() => {});
        break;
      case 'dueKhata':
        dueKhataAsPatientRecordApi.list().then(setPatientsDueRaw).catch(() => {});
        break;
      case 'dailyRegister':
        dailyRegisterApi.get().then(setDailyRegisterRaw).catch(() => {});
        break;
      case 'neededMeds':
        neededMedsApi.list().then(setNeededMedsRaw).catch(() => {});
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useLiveSync(!!currentUser, handleLiveResourceChanged);

  // Clear locally cached data on logout / session expiry so a subsequent
  // login (possibly as a different employee) never shows stale data.
  useEffect(() => {
    if (prevUserRef.current && !currentUser) {
      setMedicinesRaw([]);
      setMedicineGroupsRaw([]);
      setDistributorsRaw([]);
      setPatientsRaw([]);
      setPatientsDueRaw([]);
      setSalesHistoryRaw([]);
      setExpensesRaw([]);
      setNeededMedsRaw([]);
      setOpdVisitsRaw([]);
      setMarketingCampaignsRaw([]);
      setWorksheetTasksRaw([]);
      setEmployeesRaw([]);
      setDailyRegisterRaw(emptyDailyRegister);
      setInvoiceConfigRaw(emptyInvoiceConfig);
      setCart([]);
      setCurrentTab('dashboard');
    }
    prevUserRef.current = currentUser;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser]);

  // POS Cart State — ephemeral, checkout-only, never persisted server-side.
  const [cart, setCart] = useState<CartItem[]>([]);

  // Modal Management States
  const [invoicePrintData, setInvoicePrintData] = useState<InvoicePrintData | null>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [aiFinderOpen, setAiFinderOpen] = useState(false);
  const [aiFinderQuery, setAiFinderQuery] = useState('');
  const [distributorModalOpen, setDistributorModalOpen] = useState(false);
  const [addStockModalOpen, setAddStockModalOpen] = useState(false);
  const [manageGroupsModalOpen, setManageGroupsModalOpen] = useState(false);
  const [lowStockReorderModalOpen, setLowStockReorderModalOpen] = useState(false);
  const [addLabStockModalOpen, setAddLabStockModalOpen] = useState(false);
  const [addNeedMedModalOpen, setAddNeedMedModalOpen] = useState(false);
  const [prefillNeedMed, setPrefillNeedMed] = useState('');
  const [addExpenseModalOpen, setAddExpenseModalOpen] = useState(false);
  const [addOPDModalOpen, setAddOPDModalOpen] = useState(false);
  const [marketingModalOpen, setMarketingModalOpen] = useState(false);
  const [campaignToEdit, setCampaignToEdit] = useState<MarketingCampaign | null>(null);
  const [worksheetModalOpen, setWorksheetModalOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<WorksheetTask | null>(null);
  const [addEmployeeModalOpen, setAddEmployeeModalOpen] = useState(false);
  const [editEmployeeModalOpen, setEditEmployeeModalOpen] = useState(false);
  const [empToEdit, setEmpToEdit] = useState<Employee | null>(null);
  const [changeAdminPassModalOpen, setChangeAdminPassModalOpen] = useState(false);
  const [loginModalOpen, setLoginModalOpen] = useState(false);
  const [universalModalType, setUniversalModalType] = useState<ModalType>(null);
  const [selectedPatientForCV, setSelectedPatientForCV] = useState<PatientRecord | null>(null);

  // 6-Month Invoice Retention — the real backend deliberately has no DELETE
  // for sales records (append-only audit trail, see backend/API.md), so
  // this can no longer actually purge old invoices. Kept as an informative
  // no-op rather than silently removed, since InvoiceSettingsTab still
  // offers the button.
  const handlePurgeOldInvoices = () => {
    alert(
      'Invoice retention notice: the live server keeps sales history as a permanent, append-only audit trail — old invoices can no longer be deleted from this screen. If you need to prune historical data, do it directly at the database layer.'
    );
  };

  // 5-Day Rolling Backup Snapshots State — a local-only convenience export/
  // import feature, independent of the real per-entity server sync above.
  const [backupSnapshots, setBackupSnapshots] = useState<SystemBackupSnapshot[]>(() => {
    try {
      const saved = localStorage.getItem('pcp_backup_snapshots_v1');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error loading backup snapshots', e);
    }
    return [];
  });

  useEffect(() => {
    try {
      localStorage.setItem('pcp_backup_snapshots_v1', JSON.stringify(backupSnapshots));
    } catch (e) {
      console.error('Failed to save backup snapshots to localStorage', e);
    }
  }, [backupSnapshots]);

  const handleCreateSnapshot = (
    label?: string,
    reason: 'pre_reset_auto' | 'manual_snapshot' | 'user_backup' = 'manual_snapshot'
  ) => {
    const now = new Date();
    const expires = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const snapLabel =
      label ||
      `Snapshot (${now.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      })} ${now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})`;

    const newSnapshot: SystemBackupSnapshot = {
      id: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      createdAt: now.toISOString(),
      expiresAt: expires.toISOString(),
      label: snapLabel,
      reason,
      counts: {
        medicines: medicines.length,
        sales: salesHistory.length,
        patients: patients.length,
        expenses: expenses.length,
        opdVisits: opdVisits.length,
        neededMeds: neededMeds.length,
        campaigns: marketingCampaigns.length,
      },
      payload: {
        medicines,
        salesHistory,
        dailyRegister,
        expenses,
        patients,
        // Runtime shape here is actually PatientRecord (see the
        // dueKhataAsPatientRecordApi comment in src/lib/api.ts) even though
        // SystemBackupSnapshot's payload type declares PatientDue[].
        patientsDue: patientsDue as unknown as PatientDue[],
        neededMeds,
        opdVisits,
        marketingCampaigns,
        worksheetTasks,
        employees,
        invoiceConfig,
        distributors,
        adminPass: '',
      },
    };

    setBackupSnapshots(prev => [newSnapshot, ...prev]);
    return newSnapshot;
  };

  // Push a restored payload's collections to the real backend (best-effort
  // create-or-update per record — see `bulkUpsert`) and reflect them
  // locally. There is intentionally no server-side bulk-replace endpoint.
  const applyRestorePayload = async (p: {
    medicines?: Medicine[];
    distributors?: Distributor[];
    patients?: PatientRecord[];
    patientsDue?: PatientRecord[];
    salesHistory?: SalesRecord[];
    expenses?: ExpenseRecord[];
    neededMeds?: NeededMedOrder[];
    opdVisits?: OPDVisit[];
    marketingCampaigns?: MarketingCampaign[];
    worksheetTasks?: WorksheetTask[];
    employees?: Employee[];
    dailyRegister?: DailyRegister;
    invoiceConfig?: InvoiceConfig;
  }) => {
    try {
      await Promise.all([
        p.medicines ? bulkUpsert(medicinesApi, p.medicines) : undefined,
        p.distributors ? bulkUpsert(distributorsApi, p.distributors) : undefined,
        p.patients ? bulkUpsert(patientsApi, p.patients) : undefined,
        p.patientsDue ? bulkUpsert(dueKhataAsPatientRecordApi, p.patientsDue) : undefined,
        p.salesHistory ? bulkUpsert(salesCrud, p.salesHistory) : undefined,
        p.expenses ? bulkUpsert(expensesApi, p.expenses) : undefined,
        p.neededMeds ? bulkUpsert(neededMedsApi, p.neededMeds) : undefined,
        p.opdVisits ? bulkUpsert(opdVisitsApi, p.opdVisits) : undefined,
        p.marketingCampaigns ? bulkUpsert(marketingCampaignsApi, p.marketingCampaigns) : undefined,
        p.worksheetTasks ? bulkUpsert(worksheetTasksApi, p.worksheetTasks) : undefined,
        p.employees ? bulkUpsert(employeesApi, p.employees) : undefined,
      ]);
      if (p.invoiceConfig) await invoiceConfigApi.put(p.invoiceConfig);
      if (p.dailyRegister) await dailyRegisterApi.put(p.dailyRegister);
    } catch (err) {
      showError('Some records failed to restore to the server. Reload to see the true current state.', err);
    }

    if (p.medicines) setMedicinesRaw(p.medicines);
    if (p.distributors) setDistributorsRaw(p.distributors);
    if (p.patients) setPatientsRaw(p.patients);
    if (p.patientsDue) setPatientsDueRaw(p.patientsDue);
    if (p.salesHistory) setSalesHistoryRaw(p.salesHistory);
    if (p.expenses) setExpensesRaw(p.expenses);
    if (p.neededMeds) setNeededMedsRaw(p.neededMeds);
    if (p.opdVisits) setOpdVisitsRaw(p.opdVisits);
    if (p.marketingCampaigns) setMarketingCampaignsRaw(p.marketingCampaigns);
    if (p.worksheetTasks) setWorksheetTasksRaw(p.worksheetTasks);
    if (p.employees) setEmployeesRaw(p.employees);
    if (p.dailyRegister) setDailyRegisterRaw(p.dailyRegister);
    if (p.invoiceConfig) setInvoiceConfigRaw(p.invoiceConfig);
    setCurrentTab('dashboard');
  };

  const handleRestoreSnapshot = (snapshot: SystemBackupSnapshot) => {
    if (!snapshot || !snapshot.payload) return;
    const p = snapshot.payload;
    void applyRestorePayload({
      medicines: p.medicines,
      distributors: p.distributors,
      patients: p.patients,
      patientsDue: p.patientsDue as unknown as PatientRecord[] | undefined,
      salesHistory: p.salesHistory,
      expenses: p.expenses,
      neededMeds: p.neededMeds,
      opdVisits: p.opdVisits,
      marketingCampaigns: p.marketingCampaigns,
      worksheetTasks: p.worksheetTasks,
      employees: p.employees,
      dailyRegister: p.dailyRegister as DailyRegister,
      invoiceConfig: p.invoiceConfig,
    });
  };

  const handleRestoreFromFile = (fileContent: string): boolean => {
    try {
      const data = JSON.parse(fileContent);
      if (data.medicines || data.salesHistory || data.invoiceConfig) {
        void applyRestorePayload({
          medicines: data.medicines,
          distributors: data.distributors,
          patients: data.patients,
          patientsDue: data.patientsDue,
          salesHistory: data.salesHistory,
          expenses: data.expenses,
          neededMeds: data.neededMeds,
          opdVisits: data.opdVisits,
          marketingCampaigns: data.marketingCampaigns,
          worksheetTasks: data.worksheetTasks,
          employees: data.employees,
          dailyRegister: data.dailyRegister,
          invoiceConfig: data.invoiceConfig,
        });
        return true;
      }
    } catch (e) {
      console.error('Failed to parse backup JSON file', e);
    }
    return false;
  };

  const handleDeleteSnapshot = (snapshotId: string) => {
    setBackupSnapshots(prev => prev.filter(s => s.id !== snapshotId));
  };

  // Factory Reset — the backend intentionally has no single "wipe
  // everything" endpoint (see backend/API.md "Deliberately not
  // implemented"), so this loops the documented per-entity DELETE
  // endpoints instead, then re-brands the current admin account in place
  // (the backend refuses to let an admin delete or demote themselves, and
  // refuses to delete the last remaining admin — so delete-and-recreate,
  // like the old prototype did, isn't possible here).
  const handleExecuteFactoryReset = async (
    onboardingData: OrganizationOnboardingData,
    newAdminPass: string
  ) => {
    if (!currentUser) return;

    handleCreateSnapshot(
      `Pre-Reset Automatic Backup (${new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
      })} ${new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })})`,
      'pre_reset_auto'
    );

    try {
      await Promise.all([
        ...medicines.map(m => medicinesApi.remove(m.id).catch(() => undefined)),
        ...patients.map(p => patientsApi.remove(p.id).catch(() => undefined)),
        ...patientsDue.map(p => dueKhataAsPatientRecordApi.remove(p.id).catch(() => undefined)),
        ...expenses.map(e => expensesApi.remove(e.id).catch(() => undefined)),
        ...neededMeds.map(n => neededMedsApi.remove(n.id).catch(() => undefined)),
        ...opdVisits.map(o => opdVisitsApi.remove(o.id).catch(() => undefined)),
        ...marketingCampaigns.map(c => marketingCampaignsApi.remove(c.id).catch(() => undefined)),
        ...worksheetTasks.map(t => worksheetTasksApi.remove(t.id).catch(() => undefined)),
        ...distributors.map(d => distributorsApi.remove(d.id).catch(() => undefined)),
        ...employees.filter(e => e.id !== currentUser.id).map(e => employeesApi.remove(e.id).catch(() => undefined)),
      ]);

      const finalDirectorName = onboardingData.directorName?.trim() || 'Admin (Director)';
      const finalStoreName = onboardingData.storeName?.trim() || 'NEW HEALTHCARE & PHARMACY CENTRE';
      const finalAdminPass = newAdminPass?.trim();

      const selfEmp = await employeesApi.get(currentUser.id);
      const updatedSelf = await employeesApi.update(currentUser.id, {
        ...selfEmp,
        name: finalDirectorName,
        desig: 'Director & Admin',
        pass: finalAdminPass || '',
        phone: onboardingData.phone || selfEmp.phone,
      } as Employee);

      const newInvoiceConfig: InvoiceConfig = {
        name: finalStoreName,
        storeName: finalStoreName,
        subtitle: onboardingData.subtitle?.trim() || 'Complete Healthcare, Pharmacy & Diagnostic Solution',
        phone: onboardingData.phone?.trim() || '',
        addr: onboardingData.address?.trim() || '',
        gst: onboardingData.gstin?.trim() || '',
        dl: onboardingData.dlNo?.trim() || '',
        director: finalDirectorName,
        pharmacist: onboardingData.pharmacistName?.trim() || 'Registered Pharmacist',
        currency: onboardingData.currency?.trim() || 'INR',
        waGroup: '',
        terms:
          onboardingData.welcomeNotes?.trim() ||
          'Goods once sold cannot be returned without original cash receipt. Computerized invoice.',
        retentionMonths: 6,
        autoPurgeOldInvoices: false,
        logoUrl: '',
        printerType: 'thermal_80mm',
        headerTheme: 'modern_minimal',
      };
      await invoiceConfigApi.put(newInvoiceConfig);

      const newRegister: DailyRegister = {
        ...emptyDailyRegister,
        date: getTodayISODate(),
        openingCash: onboardingData.openingCash || 0,
      };
      await dailyRegisterApi.put(newRegister);

      // Reflect locally now that the server confirms the wipe.
      setMedicinesRaw([]);
      setPatientsRaw([]);
      setPatientsDueRaw([]);
      setExpensesRaw([]);
      setNeededMedsRaw([]);
      setOpdVisitsRaw([]);
      setMarketingCampaignsRaw([]);
      setWorksheetTasksRaw([]);
      setDistributorsRaw([]);
      setEmployeesRaw([updatedSelf]);
      setInvoiceConfigRaw(newInvoiceConfig);
      setDailyRegisterRaw(newRegister);
      setCart([]);
      setCurrentUser({ ...currentUser, name: updatedSelf.name });
      setCurrentTab('dashboard');
      alert(
        'Factory reset complete. Medicines, patients, due khata, expenses, orders, visits, campaigns, tasks and distributors were deleted on the server. Sales history is kept as a permanent audit trail (the backend never allows deleting it) and was not touched.'
      );
    } catch (err) {
      showError(
        'Factory reset failed partway through — some records may already be deleted while others remain. Please review each module and retry.',
        err
      );
    }
  };

  // Tab switching with permission check — enforced client-side for UX, and
  // for real by the server on every request (403 if violated).
  const handleSelectTab = (tab: TabType) => {
    if (!currentUser) return;
    if (currentUser.role === 'admin' || currentUser.permissions.includes(tab)) {
      setCurrentTab(tab);
    } else {
      alert(`Access Restricted: You do not have permission for the "${tab}" module.`);
    }
  };

  // Add to cart helper (from AI Finder or other tabs)
  const handleAddToCart = (medicine: Medicine) => {
    setCart(prev => {
      const existsIndex = prev.findIndex(
        item => item.medicineId === medicine.id || item.itemId === medicine.id
      );
      if (existsIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existsIndex
            ? {
                ...item,
                qty: (item.qty || 1) + 1,
                quantity: (item.qty || 1) + 1,
                totalPrice: ((item.qty || 1) + 1) * (item.price || item.mrp || medicine.mrp),
              }
            : item
        );
      }
      return [
        ...prev,
        {
          cartId: `${medicine.id}-${Date.now()}`,
          id: medicine.id,
          itemId: medicine.id,
          medicineId: medicine.id,
          name: medicine.name,
          pack: medicine.pack,
          batch: medicine.batch,
          rack: medicine.rack,
          mrp: medicine.mrp,
          price: medicine.mrp,
          unitPrice: medicine.mrp,
          rate: medicine.rate,
          gst: medicine.gst,
          stock: medicine.stock,
          qty: 1,
          quantity: 1,
          unitType: 'strip',
          isLoose: false,
          looseUnits: 0,
          tabsPerStrip: medicine.tabsPerStrip || 10,
          totalPrice: medicine.mrp,
        },
      ];
    });
    setCurrentTab('pos');
  };

  // Handle special need ordering
  const handleOrderSpecial = (medName: string) => {
    setPrefillNeedMed(medName);
    setAddNeedMedModalOpen(true);
  };

  // ---------------------------------------------------------------------
  // Auth gate — nothing else renders until we have a valid session.
  // ---------------------------------------------------------------------
  if (authLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg text-text">
        <p className="text-sm text-text-muted">Loading KinetiRx…</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="h-screen w-screen bg-bg">
        {needsSetup ? (
          <SetupModal onSetupSuccess={user => setCurrentUser(user)} />
        ) : (
          <LoginModal isOpen onClose={() => {}} allowClose={false} onLoginSuccess={user => setCurrentUser(user)} />
        )}
      </div>
    );
  }

  if (currentUser.mustChangePassword) {
    return (
      <ForcedPasswordChangeScreen
        currentUser={currentUser}
        onPasswordChanged={() => setCurrentUser({ ...currentUser, mustChangePassword: false })}
        onLogout={handleLogout}
      />
    );
  }

  if (dataLoading) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-bg text-text">
        <p className="text-sm text-text-muted">Loading your pharmacy data…</p>
      </div>
    );
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-bg font-sans text-text antialiased selection:bg-primary selection:text-primary-foreground">
      {/* Ambient Clinical Lighting Backdrops (subtle, theme-aware via primary/accent tokens) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/10 dark:bg-primary/15 blur-[130px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-accent/10 dark:bg-accent/15 blur-[130px]" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[40%] rounded-full bg-accent/5 dark:bg-accent/10 blur-[110px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[35%] h-[35%] rounded-full bg-primary/5 dark:bg-primary/10 blur-[120px]" />
      </div>

      {/* Dark Frosted Sidebar */}
      <Sidebar
        currentTab={currentTab}
        setCurrentTab={handleSelectTab}
        isOpenMobile={isMobileSidebarOpen}
        onCloseMobile={() => setIsMobileSidebarOpen(false)}
        dueKhataCount={patientsDue.length}
        neededMedsCount={neededMeds.length}
        opdCount={opdVisits.length}
        userPermissions={currentUser.permissions}
      />

      {/* Main Container Area */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Frosted Header Bar */}
        <Header
          currentTab={currentTab}
          onOpenMobileMenu={() => setIsMobileSidebarOpen(true)}
          onOpenAIFinder={() => {
            setAiFinderQuery('');
            setAiFinderOpen(true);
          }}
          onOpenLoginModal={() => setLoginModalOpen(true)}
          onOpenChangePassword={() => setChangeAdminPassModalOpen(true)}
          onLogout={handleLogout}
          currentUserName={currentUser.name}
        />

        {/* Dynamic Scrollable Body Area */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-transparent">
          <div className="max-w-7xl mx-auto space-y-5">
            {/* 1. DASHBOARD OVERVIEW */}
            {currentTab === 'dashboard' && (
              <DashboardTab
                invoiceConfig={invoiceConfig}
                medicines={medicines}
                salesHistory={salesHistory}
                dailyRegister={dailyRegister}
                expenses={expenses}
                patientsDue={patientsDue}
                neededMeds={neededMeds}
                opdVisits={opdVisits}
                marketingCampaigns={marketingCampaigns}
                onOpenUniversalModal={type => setUniversalModalType(type)}
                onOpenAIFinder={() => {
                  setAiFinderQuery('');
                  setAiFinderOpen(true);
                }}
                onNavigateTab={tab => handleSelectTab(tab)}
              />
            )}

            {/* 2. POS BILLING COUNTER */}
            {currentTab === 'pos' && (
              <POSTab
                medicines={medicines}
                setMedicines={setMedicines}
                cart={cart}
                setCart={setCart}
                invoiceConfig={invoiceConfig}
                salesHistory={salesHistory}
                setSalesHistory={setSalesHistory}
                dailyRegister={dailyRegister}
                setDailyRegister={setDailyRegister}
                patientsDue={patientsDue}
                setPatientsDue={setPatientsDue}
                patients={patients}
                setPatients={setPatients}
                onPrintInvoice={data => setInvoicePrintData(data)}
                onOpenAIFinderWithQuery={q => {
                  setAiFinderQuery(q);
                  setAiFinderOpen(true);
                }}
              />
            )}

            {/* 3. DAILY SALES REGISTER */}
            {currentTab === 'daily-sales' && (
              <DailySalesTab
                invoiceConfig={invoiceConfig}
                currentUser={currentUser}
                dailyRegister={dailyRegister}
                setDailyRegister={setDailyRegister}
                salesHistory={salesHistory}
                expenses={expenses}
                setExpenses={setExpenses}
                onPrintInvoice={data => setInvoicePrintData(data)}
                onOpenAddExpenseModal={() => setAddExpenseModalOpen(true)}
              />
            )}

            {/* 4. DUE KHATA MANAGEMENT */}
            {currentTab === 'due-khata' && (
              <DueKhataTab
                invoiceConfig={invoiceConfig}
                patientsDue={patientsDue}
                setPatientsDue={setPatientsDue}
                shopName={invoiceConfig.name}
                shopPhone={invoiceConfig.phone}
              />
            )}

            {/* 5. SPECIAL MEDICINE ORDERS */}
            {currentTab === 'medicine-orders' && (
              <MedicineOrdersTab
                neededMeds={neededMeds}
                setNeededMeds={setNeededMeds}
                distributors={distributors}
                invoiceConfig={invoiceConfig}
                patients={patients}
                onViewPatientProfile={p => {
                  setSelectedPatientForCV(p);
                  setUniversalModalType('patient_cv');
                }}
                onOpenAddNeedModal={() => {
                  setPrefillNeedMed('');
                  setAddNeedMedModalOpen(true);
                }}
              />
            )}

            {/* 6. MEDICINE STOCK ERP INVENTORY */}
            {currentTab === 'inventory' && (
              <InventoryTab
                invoiceConfig={invoiceConfig}
                medicines={medicines}
                setMedicines={setMedicines}
                onOpenAddStockModal={() => setAddStockModalOpen(true)}
                onOpenAddLabStockModal={() => setAddLabStockModalOpen(true)}
                onOpenDistributorsModal={() => setDistributorModalOpen(true)}
                onOpenManageGroupsModal={() => setManageGroupsModalOpen(true)}
                onOpenLowStockReorderModal={() => setLowStockReorderModalOpen(true)}
              />
            )}

            {/* 7. OCR INWARD INVOICE AUTO-SCAN */}
            {currentTab === 'inward-ocr' && (
              <InwardOCRTab
                distributors={distributors}
                setDistributors={setDistributors}
                medicines={medicines}
                setMedicines={setMedicines}
                invoiceConfig={invoiceConfig}
                expenses={expenses}
                setExpenses={setExpenses}
              />
            )}

            {/* 8. OPD & RE-VISITS */}
            {currentTab === 'opd' && (
              <OPDTab
                opdVisits={opdVisits}
                onOpenAddOPDModal={() => setAddOPDModalOpen(true)}
                shopName={invoiceConfig.name}
                shopPhone={invoiceConfig.phone}
              />
            )}

            {/* 9. PATIENT MASTER DATABASE */}
            {currentTab === 'patients' && (
              <PatientsTab
                invoiceConfig={invoiceConfig}
                patients={patients}
                setPatients={setPatients}
                onViewPatientProfile={p => {
                  setSelectedPatientForCV(p);
                  setUniversalModalType('patient_cv');
                }}
                shopName={invoiceConfig.name}
                waGroupLink={invoiceConfig.waGroup}
              />
            )}

            {/* 10. DAILY EXPENDITURES REGISTER */}
            {currentTab === 'expenses' && (
              <ExpensesTab
                invoiceConfig={invoiceConfig}
                expenses={expenses}
                setExpenses={setExpenses}
                onOpenAddExpenseModal={() => setAddExpenseModalOpen(true)}
              />
            )}

            {/* 11. DOCTOR CAMPAIGN & WORKSHEET */}
            {currentTab === 'business-dev' && (
              <BusinessDevTab
                marketingCampaigns={marketingCampaigns}
                worksheetTasks={worksheetTasks}
                onOpenMarketingModal={campaign => {
                  setCampaignToEdit(campaign || null);
                  setMarketingModalOpen(true);
                }}
                onOpenWorksheetModal={task => {
                  setTaskToEdit(task || null);
                  setWorksheetModalOpen(true);
                }}
              />
            )}

            {/* 12. EMPLOYEE ACCESS MANAGEMENT */}
            {currentTab === 'employee-mgmt' && (
              <EmployeeMgmtTab
                employees={employees}
                adminPass=""
                onOpenAddEmployeeModal={() => setAddEmployeeModalOpen(true)}
                onOpenEditEmployeeModal={emp => {
                  setEmpToEdit(emp);
                  setEditEmployeeModalOpen(true);
                }}
                onOpenChangeAdminPassModal={() => setChangeAdminPassModalOpen(true)}
                onDeleteEmployee={async id => {
                  if (!confirm('Are you sure you want to remove this employee?')) return;
                  try {
                    // employeesApi.remove already performs the real DELETE here — update
                    // local state with the Raw setter (no diffing) so it isn't re-sent.
                    await employeesApi.remove(id);
                    setEmployeesRaw(prev => prev.filter(e => e.id !== id));
                  } catch (err) {
                    showError(
                      err instanceof ApiError ? err.describe() : 'Could not reach the KinetiRx server. Check your connection and try again.',
                      err
                    );
                  }
                }}
              />
            )}

            {/* 13. INVOICE & WHATSAPP SETTINGS */}
            {currentTab === 'invoice-settings' && (
              <InvoiceSettingsTab
                invoiceConfig={invoiceConfig}
                setInvoiceConfig={setInvoiceConfig}
                salesHistory={salesHistory}
                onPurgeOldInvoices={handlePurgeOldInvoices}
                onPrintInvoice={data => setInvoicePrintData(data)}
                onNavigateToReset={() => handleSelectTab('system-reset')}
              />
            )}

            {/* 14. SYSTEM FACTORY RESET & 5-DAY BACKUP */}
            {currentTab === 'system-reset' && (
              <SystemResetTab
                currentUser={currentUser}
                adminPass=""
                invoiceConfig={invoiceConfig}
                medicines={medicines}
                salesHistory={salesHistory}
                dailyRegister={dailyRegister}
                expenses={expenses}
                patients={patients}
                neededMeds={neededMeds}
                opdVisits={opdVisits}
                marketingCampaigns={marketingCampaigns}
                worksheetTasks={worksheetTasks}
                employees={employees}
                distributors={distributors}
                backupSnapshots={backupSnapshots}
                onNavigateToSettings={() => handleSelectTab('invoice-settings')}
                onExecuteFactoryReset={handleExecuteFactoryReset}
                onRestoreSnapshot={handleRestoreSnapshot}
                onCreateManualSnapshot={handleCreateSnapshot}
                onDeleteSnapshot={handleDeleteSnapshot}
                onRestoreFromFile={handleRestoreFromFile}
              />
            )}
          </div>
        </main>
      </div>

      {/* MODALS LAYER */}
      {/* 1. Tax Invoice Print / PDF Modal */}
      <InvoicePrintModal
        invoice={invoicePrintData}
        onClose={() => setInvoicePrintData(null)}
        config={invoiceConfig}
      />

      {/* 2. AI Generic Finder & Live Market Modal */}
      <AIFinderModal
        isOpen={aiFinderOpen}
        invoiceConfig={invoiceConfig}
        onClose={() => setAiFinderOpen(false)}
        initialQuery={aiFinderQuery}
        medicines={medicines}
        onAddToCart={handleAddToCart}
        onOrderSpecial={handleOrderSpecial}
      />

      {/* 3. Manage Distributors Directory Modal */}
      <DistributorModal
        isOpen={distributorModalOpen}
        onClose={() => setDistributorModalOpen(false)}
        distributors={distributors}
        setDistributors={setDistributors}
      />

      {/* 4. Add Medicine Stock Modal */}
      <AddStockModal
        isOpen={addStockModalOpen}
        invoiceConfig={invoiceConfig}
        onClose={() => setAddStockModalOpen(false)}
        distributors={distributors}
        setDistributors={setDistributors}
        medicineGroups={medicineGroups}
        onSaveMedicine={m =>
          setMedicines(prev => {
            // New stock of an item already on the shelf should top up that
            // item's quantity, not create a second, duplicate-looking row —
            // matched the same way InwardOCRTab's auto-scan already merges
            // incoming stock: by name, or by batch number when both are set.
            const existingIdx = prev.findIndex(
              p =>
                p.name.trim().toLowerCase() === m.name.trim().toLowerCase() ||
                (m.batch && p.batch && p.batch.trim().toLowerCase() === m.batch.trim().toLowerCase())
            );
            if (existingIdx === -1) return [m, ...prev];
            const updated = [...prev];
            const current = updated[existingIdx];
            updated[existingIdx] = {
              ...current,
              stock: Number((current.stock + m.stock).toFixed(2)),
              rate: m.rate || current.rate,
              omrp: m.omrp || current.omrp,
              mrp: m.mrp || current.mrp,
              batch: m.batch || current.batch,
              expiry: m.expiry || current.expiry,
              hsn: m.hsn || current.hsn,
              gst: m.gst || current.gst,
              dist: m.dist || current.dist,
              rack: m.rack || current.rack,
            };
            return updated;
          })
        }
      />

      {/* 4C. Manage Doctor / Stock Groups Modal */}
      <ManageMedicineGroupsModal
        isOpen={manageGroupsModalOpen}
        onClose={() => setManageGroupsModalOpen(false)}
        groups={medicineGroups}
        setGroups={setMedicineGroups}
      />

      {/* 4D. Low Stock Bulk Reorder Modal */}
      <LowStockReorderModal
        isOpen={lowStockReorderModalOpen}
        onClose={() => setLowStockReorderModalOpen(false)}
        medicines={medicines}
        distributors={distributors}
        onCreateNeededMeds={orders => setNeededMeds(prev => [...orders, ...prev])}
      />

      {/* 4B. Add New Lab Stock / Test Modal */}
      <AddLabStockModal
        isOpen={addLabStockModalOpen}
        invoiceConfig={invoiceConfig}
        onClose={() => setAddLabStockModalOpen(false)}
        onSaveLabStock={labItem => setMedicines(prev => [labItem, ...prev])}
      />

      {/* 5. Add Special Need Medicine Modal */}
      <AddNeedMedModal
        isOpen={addNeedMedModalOpen}
        invoiceConfig={invoiceConfig}
        onClose={() => setAddNeedMedModalOpen(false)}
        distributors={distributors}
        setDistributors={setDistributors}
        patients={patients}
        medicines={medicines}
        prefillMedName={prefillNeedMed}
        onSaveNeedMed={order => setNeededMeds(prev => [order, ...prev])}
        onQuickAddPatient={p => setPatients(prev => [p, ...prev])}
      />

      {/* 6. Log Daily Expense Modal */}
      <AddExpenseModal
        isOpen={addExpenseModalOpen}
        onClose={() => setAddExpenseModalOpen(false)}
        onSaveExpense={expense => {
          setExpenses(prev => [expense, ...prev]);
          setDailyRegister(prev => {
            const currentRegDate = prev.date || getTodayISODate();
            if (expense.date === currentRegDate) {
              const updatedExpenses = Number(((prev.expenses || 0) + expense.amt).toFixed(2));
              return {
                ...prev,
                expenses: updatedExpenses,
              };
            }
            return prev;
          });
        }}
      />

      {/* 7. Record OPD Patient Consultation Modal */}
      <AddOPDModal
        isOpen={addOPDModalOpen}
        onClose={() => setAddOPDModalOpen(false)}
        onSaveOPD={visit => setOpdVisits(prev => [visit, ...prev])}
        patients={patients}
        onQuickAddPatient={p => setPatients(prev => [p, ...prev])}
      />

      {/* 8. Doctor Campaign Modal */}
      <MarketingModal
        isOpen={marketingModalOpen}
        onClose={() => {
          setMarketingModalOpen(false);
          setCampaignToEdit(null);
        }}
        campaignToEdit={campaignToEdit}
        onSaveCampaign={campaign => {
          setMarketingCampaigns(prev => {
            const exists = prev.some(c => c.id === campaign.id);
            if (exists) {
              return prev.map(c => (c.id === campaign.id ? campaign : c));
            }
            return [campaign, ...prev];
          });
        }}
      />

      {/* 9. Monthly Maintenance Worksheet Modal */}
      <WorksheetModal
        isOpen={worksheetModalOpen}
        onClose={() => {
          setWorksheetModalOpen(false);
          setTaskToEdit(null);
        }}
        taskToEdit={taskToEdit}
        onSaveTask={task => {
          setWorksheetTasks(prev => {
            const exists = prev.some(t => t.id === task.id);
            if (exists) {
              return prev.map(t => (t.id === task.id ? task : t));
            }
            return [task, ...prev];
          });
        }}
      />

      {/* 10. Employee Add / Edit Modals — both call the API themselves and
          hand back the server-confirmed record, so wire them to the Raw
          setter (no diffing) instead of the syncing one to avoid re-POSTing
          / re-PUTting what's already persisted. */}
      <AddEmployeeModal
        isOpen={addEmployeeModalOpen}
        onClose={() => setAddEmployeeModalOpen(false)}
        onSaveEmployee={emp => setEmployeesRaw(prev => [emp, ...prev])}
      />

      <EditEmployeeModal
        isOpen={editEmployeeModalOpen}
        onClose={() => {
          setEditEmployeeModalOpen(false);
          setEmpToEdit(null);
        }}
        emp={empToEdit}
        onUpdateEmployee={emp => {
          setEmployeesRaw(prev => prev.map(e => (e.id === emp.id ? emp : e)));
        }}
      />

      {/* 11. Change Admin Password Modal */}
      <ChangeAdminPassModal
        isOpen={changeAdminPassModalOpen}
        onClose={() => setChangeAdminPassModalOpen(false)}
      />

      {/* 12. Switch User / Login Modal */}
      <LoginModal
        isOpen={loginModalOpen}
        onClose={() => setLoginModalOpen(false)}
        onLoginSuccess={user => setCurrentUser(user)}
      />

      {/* 13. Universal Interactive KPI & Breakdown Modal */}
      <UniversalDetailsModal
        type={universalModalType}
        invoiceConfig={invoiceConfig}
        onClose={() => setUniversalModalType(null)}
        medicines={medicines}
        opdVisits={opdVisits}
        patientsDue={patientsDue}
        salesHistory={salesHistory}
        dailyRegister={dailyRegister}
        expenses={expenses}
        selectedPatient={selectedPatientForCV}
      />
    </div>
  );
}

export default App;
