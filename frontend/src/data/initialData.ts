import {
  DailyRegisterState,
  Distributor,
  Employee,
  ExpenseRecord,
  InvoiceConfig,
  LabTest,
  MarketingCampaign,
  Medicine,
  NeededMedOrder,
  OPDVisit,
  PatientDue,
  PatientRecord,
  SalesRecord,
  WorksheetTask,
} from '../types';
import { getTodayISODate } from '../utils/dateUtils';

const todayISO = getTodayISODate();

export const initialInvoiceConfig: InvoiceConfig = {
  name: 'PHARMA CARE PRO & DIAGNOSTIC CENTRE',
  storeName: 'PHARMA CARE PRO & DIAGNOSTIC CENTRE',
  subtitle: 'Complete Healthcare, Pharmacy & Diagnostic Solution',
  dl: 'DL-WB-2026-001 / DL-19A',
  gst: '19ABCDE1234F1Z5',
  phone: '+91 98765 43210',
  waGroup: '',
  addr: 'Main Road, Purba Medinipur, West Bengal',
  terms: '* Medicines once sold will not be returned without cash memo. Thank you for your visit!',
  logoUrl: '',
  retentionMonths: 6,
  retentionPolicyNotice: 'The invoices should be stored for six months. After six months, the invoices will be deleted.',
  autoPurgeOldInvoices: true,
  lastPurgeDate: todayISO,
  director: 'Master Admin',
  pharmacist: 'Registered Pharmacist',
  currency: '₹',
  printerType: 'thermal_80mm',
  headerTheme: 'modern_minimal',
};

export const initialDailyRegister: DailyRegisterState = {
  date: todayISO,
  prevBD: 0.0,
  todaySell: 0.0,
  phonePe: 0.0,
  expenses: 0.0,
  bankShift: 0.0,
  isLocked: false,
  openingCash: 0.0,
  totalSales: 0.0,
  cashSales: 0.0,
  upiSales: 0.0,
  cardSales: 0.0,
  totalExpenses: 0.0,
  denominations: { 2000: 0, 500: 0, 200: 0, 100: 0, 50: 0, 20: 0, 10: 0, 5: 0, 2: 0, 1: 0 },
  closingPhysicalCash: 0,
  cashDifference: 0,
  isDrawerClosed: false,
};

export const initialDistributors: Distributor[] = [];

export const initialMedicines: Medicine[] = [];

export const initialLabTests: LabTest[] = [
  {
    id: 'L1',
    name: 'Blood Test - Sample Processing',
    salt: 'Diagnostic Lab',
    company: 'Diagnostic Lab',
    rack: 'LAB-CHAMBER',
    stock: 999,
    mrp: 600.0,
    tabsPerStrip: 1,
  },
  {
    id: 'L2',
    name: 'Complete Blood Count (CBC)',
    salt: 'Hematology Profile',
    company: 'Diagnostic Lab',
    rack: 'LAB-CHAMBER',
    stock: 999,
    mrp: 350.0,
    tabsPerStrip: 1,
  },
  {
    id: 'L3',
    name: 'Blood Sugar (Fasting / PP)',
    salt: 'Biochemistry',
    company: 'Diagnostic Lab',
    rack: 'LAB-CHAMBER',
    stock: 999,
    mrp: 100.0,
    tabsPerStrip: 1,
  },
  {
    id: 'L4',
    name: 'Lipid Profile Full Screen',
    salt: 'Cardiovascular Risk Panel',
    company: 'Diagnostic Lab',
    rack: 'LAB-CHAMBER',
    stock: 999,
    mrp: 550.0,
    tabsPerStrip: 1,
  },
  {
    id: 'L5',
    name: 'Liver Function Test (LFT)',
    salt: 'Hepatic Profile',
    company: 'Diagnostic Lab',
    rack: 'LAB-CHAMBER',
    stock: 999,
    mrp: 450.0,
    tabsPerStrip: 1,
  },
  {
    id: 'L6',
    name: 'Kidney Function Test (KFT/Urea/Creatinine)',
    salt: 'Renal Profile',
    company: 'Diagnostic Lab',
    rack: 'LAB-CHAMBER',
    stock: 999,
    mrp: 400.0,
    tabsPerStrip: 1,
  },
];

export const initialPatientsDue: PatientRecord[] = [];

export const initialPatients: PatientRecord[] = [];

export const initialSalesHistory: SalesRecord[] = [];

export const initialExpenses: ExpenseRecord[] = [];

export const initialNeededMeds: NeededMedOrder[] = [];

export const initialOPDVisits: OPDVisit[] = [];

export const initialMarketingCampaigns: MarketingCampaign[] = [];

export const initialWorksheetTasks: WorksheetTask[] = [];

export const initialEmployees: Employee[] = [
  {
    id: 'EMP-ADMIN-1',
    name: 'Master Admin',
    desig: 'Director & Admin',
    pass: 'admin123',
    phone: '9876543210',
    role: 'admin',
    pin: 'admin123',
    permissions: [
      'dashboard',
      'pos',
      'daily-sales',
      'due-khata',
      'medicine-orders',
      'inventory',
      'inward-ocr',
      'opd',
      'patients',
      'expenses',
      'business-dev',
      'employee-mgmt',
      'invoice-settings',
      'system-reset',
    ],
  },
];

export const initialBrandSaltDictionary: Record<
  string,
  {
    salt: string;
    category: string;
    alternatives: Array<{ name: string; company: string; mrp: number }>;
  }
> = {
  'nexpro l': {
    salt: 'Esomeprazole 40mg + Levosulpiride 75mg',
    category: 'Antacid / GERD & Dyspepsia',
    alternatives: [
      { name: 'Pan L', company: 'Alkem', mrp: 220.0 },
      { name: 'Pantocid L', company: 'Sun Pharma', mrp: 235.0 },
    ],
  },
  'nexpro rd': {
    salt: 'Esomeprazole 40mg + Domperidone 30mg',
    category: 'Antacid / Anti-emetic',
    alternatives: [
      { name: 'Pan D', company: 'Alkem', mrp: 180.0 },
      { name: 'Cyra D', company: 'Systopic', mrp: 140.0 },
    ],
  },
  'pan l': {
    salt: 'Pantoprazole 40mg + Levosulpiride 75mg',
    category: 'Antacid / GERD & Dyspepsia',
    alternatives: [
      { name: 'Pantocid L', company: 'Sun Pharma', mrp: 235.0 },
      { name: 'Nexpro L', company: 'Torrent', mrp: 245.0 },
    ],
  },
  'pan d': {
    salt: 'Pantoprazole 40mg + Domperidone 30mg',
    category: 'Antacid / Anti-emetic',
    alternatives: [
      { name: 'Pantocid D', company: 'Sun Pharma', mrp: 185.0 },
      { name: 'Cyra D', company: 'Systopic', mrp: 140.0 },
    ],
  },
  'pantocid l': {
    salt: 'Pantoprazole 40mg + Levosulpiride 75mg',
    category: 'Antacid / GERD',
    alternatives: [{ name: 'Pan L', company: 'Alkem', mrp: 220.0 }],
  },
  'pantocid d': {
    salt: 'Pantoprazole 40mg + Domperidone 30mg',
    category: 'Antacid / Anti-emetic',
    alternatives: [{ name: 'Pan D', company: 'Alkem', mrp: 180.0 }],
  },
  'cyra d': {
    salt: 'Rabeprazole 20mg + Domperidone 30mg',
    category: 'Antacid / GERD',
    alternatives: [
      { name: 'Razo D', company: 'Dr. Reddy', mrp: 160.0 },
      { name: 'Happi D', company: 'Zydus', mrp: 155.0 },
    ],
  },
  'razo d': {
    salt: 'Rabeprazole 20mg + Domperidone 30mg',
    category: 'Antacid / GERD',
    alternatives: [{ name: 'Cyra D', company: 'Systopic', mrp: 140.0 }],
  },
  'happi d': {
    salt: 'Rabeprazole 20mg + Domperidone 30mg',
    category: 'Antacid / GERD',
    alternatives: [{ name: 'Cyra D', company: 'Systopic', mrp: 140.0 }],
  },
  'dolo 650': {
    salt: 'Paracetamol 650mg',
    category: 'Analgesic / Antipyretic',
    alternatives: [
      { name: 'Calpol 650mg', company: 'GSK', mrp: 31.0 },
      { name: 'Pacimol 650mg', company: 'Ipca', mrp: 28.0 },
    ],
  },
  'calpol 650': {
    salt: 'Paracetamol 650mg',
    category: 'Analgesic / Antipyretic',
    alternatives: [{ name: 'Dolo 650mg', company: 'Micro Labs', mrp: 30.0 }],
  },
  'pacimol 650': {
    salt: 'Paracetamol 650mg',
    category: 'Analgesic / Antipyretic',
    alternatives: [{ name: 'Dolo 650mg', company: 'Micro Labs', mrp: 30.0 }],
  },
  'augmentin 625': {
    salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    category: 'Broad Spectrum Antibiotic',
    alternatives: [
      { name: 'Moxikind CV 625', company: 'Mankind', mrp: 175.0 },
      { name: 'Clavam 625', company: 'Alkem', mrp: 185.0 },
    ],
  },
  'moxikind cv 625': {
    salt: 'Amoxicillin 500mg + Clavulanic Acid 125mg',
    category: 'Antibiotic',
    alternatives: [{ name: 'Augmentin 625', company: 'GSK', mrp: 200.0 }],
  },
  'ecosprin 75': {
    salt: 'Aspirin 75mg',
    category: 'Blood Thinner / Antiplatelet',
    alternatives: [
      { name: 'Delisprin 75mg', company: 'Aristo', mrp: 4.8 },
      { name: 'Alaspran 75mg', company: 'Alkem', mrp: 5.2 },
    ],
  },
  'delisprin 75': {
    salt: 'Aspirin 75mg',
    category: 'Blood Thinner / Antiplatelet',
    alternatives: [{ name: 'Ecosprin 75mg', company: 'USV', mrp: 5.0 }],
  },
  'eno': {
    salt: 'Sodium Bicarbonate + Citric Acid',
    category: 'Antacid',
    alternatives: [
      { name: 'Gas-O-Fast', company: 'Mankind', mrp: 8.5 },
      { name: 'Digene Gel', company: 'Abbott', mrp: 12.0 },
    ],
  },
};
