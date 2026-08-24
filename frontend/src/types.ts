export type TabType =
  | 'dashboard'
  | 'daily-sales'
  | 'pos'
  | 'due-khata'
  | 'medicine-orders'
  | 'inventory'
  | 'inward-ocr'
  | 'opd'
  | 'patients'
  | 'expenses'
  | 'business-dev'
  | 'employee-mgmt'
  | 'invoice-settings'
  | 'system-reset';

export type TabId = TabType;

export interface MedicineGroup {
  id: string;
  name: string;
}

export interface Medicine {
  id: string;
  name: string;
  company: string;
  dist: string;
  distributor?: string;
  hsn: string;
  batch: string;
  pack: string;
  salt: string;
  generic?: string;
  group: string;
  rack: string;
  stock: number;
  rate: number;
  omrp: number;
  mrp: number;
  scheme: string;
  gst: number;
  disc: number;
  tabsPerStrip: number;
  expiry: string; // YYYY-MM
  isLabTest?: boolean;
  trackStock?: boolean;
  itemType?: 'medicine' | 'lab_test';
}

export interface LabTest {
  id: string;
  name: string;
  salt: string;
  company: string;
  rack: string;
  stock: number;
  mrp: number;
  tabsPerStrip: number;
}

export interface PatientRecord {
  id: string;
  name: string;
  phone: string;
  age?: number | string;
  gender?: string;
  ageGender?: string;
  addr?: string;
  address?: string;
  doc?: string;
  doctor?: string;
  reason?: string;
  totalDue: number;
  dueAmount?: number;
  lastDate?: string;
  lastVisitDate?: string;
  totalVisits?: number;
  purchaseHistory?: Array<{
    date: string;
    items: string;
    amount: number;
  }>;
  bloodTests?: string[];
}

export interface PatientDue {
  id: string;
  name: string;
  phone: string;
  addr: string;
  doc: string;
  reason: string;
  due: number;
  lastDate: string;
}

export interface SalesRecord {
  id: string;
  inv?: string;
  invoiceNo?: string;
  date: string;
  cust?: string;
  name?: string;
  patient?: string;
  patientId?: string;
  phone?: string;
  items?: string;
  qty?: string | number;
  amt?: number;
  total?: number;
  mode: string;
  itemsDetail?: Array<{
    name: string;
    qty: number;
    price: number;
    total: number;
  }>;
  subtotal?: number;
  discountPercent?: number;
  doctor?: string;
  address?: string;
  ageGender?: string;
  paidAmount?: number;
  dueAmount?: number;
}

export interface ExpenseRecord {
  id: string;
  date: string;
  cat: string;
  desc: string;
  amt: number;
}

export interface DailyRegisterState {
  date?: string;
  prevBD: number;
  todaySell: number;
  phonePe: number;
  expenses: number;
  bankShift: number;
  isLocked: boolean;
  openingCash?: number;
  totalSales?: number;
  cashSales?: number;
  upiSales?: number;
  cardSales?: number;
  totalExpenses?: number;
  denominations?: Record<string | number, number>;
  closingPhysicalCash?: number;
  cashDifference?: number;
  isDrawerClosed?: boolean;
}

export type DailyRegister = DailyRegisterState;

export interface NeededMedOrder {
  id: string;
  patientId?: string;
  med: string;
  name: string;
  phone: string;
  dist: string;
  time: string;
  qty: number;
  status: 'Distributor Ordered' | 'Processing' | 'Pending' | 'Delivered' | 'Cancelled';
}

export interface OPDVisit {
  id: string;
  name: string;
  phone: string;
  ageSex: string;
  doc: string;
  vdate: string;
  rvdate: string;
  btest: string;
  reminder: string;
}

export interface MarketingCampaign {
  id: string;
  doc: string;
  date: string;
  action: string;
  status: '7-Day Alert Active' | 'Upcoming' | 'Planned' | 'Completed';
}

export interface WorksheetTask {
  id: string;
  cat: string;
  desc: string;
  date: string;
  status: 'Pending' | 'In Progress' | 'Planned' | 'Completed';
}

export interface Distributor {
  id: string;
  name: string;
  gstin: string;
  phone: string;
  addr: string;
  dlNo?: string;
  email?: string;
  contactPerson?: string;
  registeredDate?: string;
  source?: 'OCR Purchase Bill' | 'Manual Registration';
}

export interface CurrentUser {
  id: string;
  name: string;
  role: 'admin' | string;
  permissions: TabId[];
}

export interface Employee {
  id: string;
  name: string;
  desig: string;
  pass: string;
  phone?: string;
  role?: 'admin' | string;
  pin?: string;
  permissions: TabId[];
}

export interface InvoiceConfig {
  name: string;
  storeName?: string;
  subtitle?: string;
  dl: string;
  gst: string;
  phone: string;
  waGroup: string;
  addr: string;
  terms: string;
  logoUrl?: string;
  retentionMonths?: number;
  retentionPolicyNotice?: string;
  autoPurgeOldInvoices?: boolean;
  lastPurgeDate?: string;
  director?: string;
  pharmacist?: string;
  currency?: string;
  printerType?: string;
  headerTheme?: string;
}

export interface CartItem {
  cartId: string;
  id?: string;
  origId?: string;
  itemId?: string;
  name: string;
  price: number;
  qty: number;
  type?: 'strip' | 'loose' | 'return';
  unitType?: 'strip' | 'loose' | 'return';
  unitPrice?: number;
  medicineId?: string;
  pack?: string;
  batch?: string;
  rack?: string;
  expiry?: string;
  mrp?: number;
  rate?: number;
  gst?: number;
  stock?: number;
  quantity?: number;
  isLoose?: boolean;
  looseUnits?: number;
  tabsPerStrip?: number;
  totalPrice?: number;
}

export interface InvoicePrintData {
  invNo: string;
  date: string;
  patientId: string;
  patientName: string;
  phone: string;
  ageGender: string;
  address: string;
  doctor: string;
  items: Array<{
    name: string;
    qty: number;
    price: number;
    total: number;
  }>;
  subtotal: number;
  discountPercent: number;
  grandTotal: number;
  paidAmount: number;
  dueAmount: number;
  paymentMode: string;
}

export interface OrganizationOnboardingData {
  storeName: string;
  subtitle: string;
  phone: string;
  address: string;
  gstin: string;
  dlNo: string;
  currency: string;
  openingCash: number;
  adminPassword?: string;
  directorName: string;
  pharmacistName: string;
  welcomeNotes?: string;
}

export interface SystemBackupSnapshot {
  id: string;
  createdAt: string; // ISO string
  expiresAt: string; // ISO string (createdAt + 5 days)
  label: string;
  reason: 'pre_reset_auto' | 'manual_snapshot' | 'user_backup';
  counts: {
    medicines: number;
    sales: number;
    patients: number;
    expenses: number;
    opdVisits: number;
    neededMeds: number;
    campaigns: number;
  };
  payload: {
    medicines: Medicine[];
    salesHistory: SalesRecord[];
    dailyRegister: DailyRegisterState;
    expenses: ExpenseRecord[];
    patients: PatientRecord[];
    patientsDue?: PatientDue[];
    neededMeds: NeededMedOrder[];
    opdVisits: OPDVisit[];
    marketingCampaigns: MarketingCampaign[];
    worksheetTasks: WorksheetTask[];
    employees: Employee[];
    invoiceConfig: InvoiceConfig;
    distributors: Distributor[];
    adminPass: string;
  };
}
