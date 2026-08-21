// Typed fetch client for the real KinetiRx Go backend (see backend/API.md).
//
// Replaces the old flat-JSON `frontend/server.ts` sync-blob protocol
// (`/api/state/sync`, `/api/state/reset`) entirely with per-entity REST
// calls, real JWT auth, and the error envelope documented in API.md.

import {
  DailyRegister,
  Distributor,
  Employee,
  ExpenseRecord,
  InvoiceConfig,
  MarketingCampaign,
  Medicine,
  NeededMedOrder,
  OPDVisit,
  PatientDue,
  PatientRecord,
  SalesRecord,
  TabType,
  WorksheetTask,
} from '../types';

// ---------------------------------------------------------------------------
// Base config
// ---------------------------------------------------------------------------

// VITE_API_URL is baked in at build time (Vite env vars are compile-time).
// - Unset entirely (typical local `npm run dev` without a .env file):
//   default to http://localhost:8080, the backend's default dev port.
// - Explicitly set to an empty string (see frontend/Dockerfile's build arg):
//   resolves to '', so every request path stays relative (`/api/...`) —
//   used by the Docker Compose image, where nginx reverse-proxies /api/*
//   to the backend service (see frontend/nginx.conf) and there's no fixed
//   externally-visible host/port to hardcode.
// - Set to a real URL (e.g. a deployed backend's origin): used as-is.
const rawApiUrl = import.meta.env.VITE_API_URL as string | undefined;
export const API_BASE_URL: string =
  rawApiUrl !== undefined ? rawApiUrl.replace(/\/+$/, '') : 'http://localhost:8080';

const TOKEN_KEY = 'kinetirx_token';

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch {
    // localStorage unavailable (private browsing, etc.) — token will only
    // live for the current page load via the in-memory fallback below.
  }
  memoryToken = token;
}

export function clearToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
  memoryToken = null;
}

// In-memory fallback so auth still works for the current tab even if
// localStorage is blocked.
let memoryToken: string | null = getToken();

function currentToken(): string | null {
  return getToken() ?? memoryToken;
}

// ---------------------------------------------------------------------------
// Error envelope (see API.md "Conventions")
// ---------------------------------------------------------------------------

export interface ApiFieldError {
  field: string;
  message: string;
}

export interface ApiErrorBody {
  type: string;
  title: string;
  status: number;
  errors?: ApiFieldError[];
  request_id?: string;
}

export class ApiError extends Error {
  status: number;
  type: string;
  fieldErrors?: ApiFieldError[];
  requestId?: string;

  constructor(body: ApiErrorBody) {
    super(body.title || `Request failed (${body.status})`);
    this.name = 'ApiError';
    this.status = body.status;
    this.type = body.type;
    this.fieldErrors = body.errors;
    this.requestId = body.request_id;
  }

  /** Human-friendly message including field-level validation detail. */
  describe(): string {
    if (this.fieldErrors && this.fieldErrors.length > 0) {
      const detail = this.fieldErrors.map(e => `${e.field}: ${e.message}`).join('; ');
      return `${this.message} (${detail})`;
    }
    return this.message;
  }
}

// ---------------------------------------------------------------------------
// 401 handling — the app-level auth gate subscribes to this so any request,
// anywhere, that comes back unauthorized forces a clean re-login instead of
// leaving the UI in a broken half-authenticated state.
// ---------------------------------------------------------------------------

type UnauthorizedHandler = () => void;
let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(fn: UnauthorizedHandler | null): void {
  unauthorizedHandler = fn;
}

// ---------------------------------------------------------------------------
// Core request helper
// ---------------------------------------------------------------------------

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = currentToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { ...options, headers });
  } catch (networkErr) {
    throw new ApiError({
      type: 'network_error',
      title: 'Could not reach the KinetiRx server. Check your connection and try again.',
      status: 0,
    });
  }

  if (res.status === 204) {
    return undefined as unknown as T;
  }

  const text = await res.text();
  let body: unknown = null;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    if (res.status === 401) {
      clearToken();
      if (unauthorizedHandler) unauthorizedHandler();
    }
    const parsed = body as Partial<ApiErrorBody> | null;
    throw new ApiError({
      type: parsed?.type || 'internal_error',
      title: parsed?.title || `Request failed (${res.status})`,
      status: res.status,
      errors: parsed?.errors,
      request_id: parsed?.request_id,
    });
  }

  return body as T;
}

// ---------------------------------------------------------------------------
// Generic per-entity CRUD (list/get/create/update/delete)
// ---------------------------------------------------------------------------

export interface CrudClient<T> {
  list: () => Promise<T[]>;
  get: (id: string) => Promise<T>;
  create: (item: T) => Promise<T>;
  update: (id: string, item: T) => Promise<T>;
  remove: (id: string) => Promise<void>;
}

function crud<T extends { id?: string }>(basePath: string): CrudClient<T> {
  return {
    list: () => request<T[]>(basePath),
    get: (id: string) => request<T>(`${basePath}/${encodeURIComponent(id)}`),
    create: (item: T) => request<T>(basePath, { method: 'POST', body: JSON.stringify(item) }),
    update: (id: string, item: T) =>
      request<T>(`${basePath}/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(item) }),
    remove: (id: string) =>
      request<void>(`${basePath}/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  };
}

export const medicinesApi = crud<Medicine>('/api/medicines');
export const patientsApi = crud<PatientRecord>('/api/patients');
export const dueKhataApi = crud<PatientDue>('/api/due-khata');

// The `DueKhataTab` / `POSTab` components (pre-existing, unmodified here)
// actually operate on `patientsDue` using the `PatientRecord` shape
// (`totalDue`, `lastDate`, `doc`, `reason`, ...) rather than the leaner
// `PatientDue` wire shape the backend's `/api/due-khata` resource actually
// uses (`due` instead of `totalDue`, no `dueAmount`/`lastVisitDate`
// duplication). This adapter translates between the two so those
// components can keep calling `setPatientsDue` unmodified while the real
// due-khata table gets correctly-named fields instead of silently losing
// the due amount (which would happen if `totalDue` were sent as-is to a
// field the server doesn't recognize).
function patientDueToRecord(pd: PatientDue): PatientRecord {
  return {
    id: pd.id,
    name: pd.name,
    phone: pd.phone,
    addr: pd.addr,
    address: pd.addr,
    doc: pd.doc,
    doctor: pd.doc,
    reason: pd.reason,
    totalDue: pd.due,
    dueAmount: pd.due,
    lastDate: pd.lastDate,
    lastVisitDate: pd.lastDate,
  };
}

function recordToDueKhataWire(pr: PatientRecord): PatientDue {
  return {
    id: pr.id,
    name: pr.name,
    phone: pr.phone,
    addr: pr.addr || pr.address || '',
    doc: pr.doc || pr.doctor || '',
    reason: pr.reason || '',
    due: pr.totalDue ?? pr.dueAmount ?? 0,
    lastDate: pr.lastDate || pr.lastVisitDate || '',
  };
}

export const dueKhataAsPatientRecordApi: CrudClient<PatientRecord> = {
  list: async () => (await dueKhataApi.list()).map(patientDueToRecord),
  get: async (id: string) => patientDueToRecord(await dueKhataApi.get(id)),
  create: async (item: PatientRecord) =>
    patientDueToRecord(await dueKhataApi.create(recordToDueKhataWire(item))),
  update: async (id: string, item: PatientRecord) =>
    patientDueToRecord(await dueKhataApi.update(id, recordToDueKhataWire(item))),
  remove: (id: string) => dueKhataApi.remove(id),
};
export const expensesApi = crud<ExpenseRecord>('/api/expenses');
export const neededMedsApi = crud<NeededMedOrder>('/api/needed-meds');
export const opdVisitsApi = crud<OPDVisit>('/api/opd-visits');
export const distributorsApi = crud<Distributor>('/api/distributors');
export const marketingCampaignsApi = crud<MarketingCampaign>('/api/marketing-campaigns');
export const worksheetTasksApi = crud<WorksheetTask>('/api/worksheet-tasks');

// Sales history is append-mostly: list/get/create only, no update/delete
// (see API.md — corrections are recorded as new sale records instead).
export const salesApi = {
  list: (params?: { date?: string; patientId?: string }) => {
    const qs = new URLSearchParams();
    if (params?.date) qs.set('date', params.date);
    if (params?.patientId) qs.set('patientId', params.patientId);
    const suffix = qs.toString() ? `?${qs.toString()}` : '';
    return request<SalesRecord[]>(`/api/sales${suffix}`);
  },
  get: (id: string) => request<SalesRecord>(`/api/sales/${encodeURIComponent(id)}`),
  create: (item: SalesRecord) =>
    request<SalesRecord>('/api/sales', { method: 'POST', body: JSON.stringify(item) }),
};

// Employees: the frontend `Employee` type carries a plaintext `pass` field
// for local UX (pre-filling the edit form), but the wire format uses
// `password` and the server NEVER returns it back (bcrypt hash only,
// `json:"-"`). We map pass -> password on the way out and the caller is
// responsible for leaving `pass` empty on fetched-from-server records so an
// unmodified edit doesn't accidentally overwrite the stored password.
function toEmployeeWirePayload(emp: Employee) {
  return {
    id: emp.id,
    name: emp.name,
    desig: emp.desig,
    password: emp.pass || '',
    phone: emp.phone ?? null,
    role: emp.role,
    pin: emp.pin ?? null,
    permissions: emp.permissions,
  };
}

export const employeesApi: CrudClient<Employee> = {
  list: () => request<Employee[]>('/api/employees'),
  get: (id: string) => request<Employee>(`/api/employees/${encodeURIComponent(id)}`),
  create: (emp: Employee) =>
    request<Employee>('/api/employees', {
      method: 'POST',
      body: JSON.stringify(toEmployeeWirePayload(emp)),
    }),
  update: (id: string, emp: Employee) =>
    request<Employee>(`/api/employees/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(toEmployeeWirePayload(emp)),
    }),
  remove: (id: string) =>
    request<void>(`/api/employees/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};

// Singleton-per-org resources (one row, GET / PUT-upsert only).
export const dailyRegisterApi = {
  get: () => request<DailyRegister>('/api/daily-register'),
  put: (value: DailyRegister) =>
    request<DailyRegister>('/api/daily-register', { method: 'PUT', body: JSON.stringify(value) }),
};

export const invoiceConfigApi = {
  get: () => request<InvoiceConfig>('/api/invoice-config'),
  put: (value: InvoiceConfig) =>
    request<InvoiceConfig>('/api/invoice-config', { method: 'PUT', body: JSON.stringify(value) }),
};

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

export interface AuthUser {
  id: string;
  name: string;
  desig?: string;
  role: 'admin' | string;
  permissions: TabType[];
}

export interface LoginResponse {
  accessToken: string;
  expiresAt: string;
  user: AuthUser;
}

export const authApi = {
  login: (identifier: string, password: string) =>
    request<LoginResponse>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier, password }),
    }),
  me: () => request<AuthUser>('/api/auth/me'),
  setupStatus: () => request<{ needsSetup: boolean }>('/api/auth/setup-status'),
  setup: (name: string, password: string) =>
    request<LoginResponse>('/api/auth/setup', {
      method: 'POST',
      body: JSON.stringify({ name, password }),
    }),
};

// ---------------------------------------------------------------------------
// AI-powered endpoints
// ---------------------------------------------------------------------------

export interface OcrParseBillRequest {
  imageBase64?: string;
  mimeType?: string;
  textContent?: string;
  distributorHint?: string;
}

export interface OcrParseBillResponse {
  success: boolean;
  fallback?: boolean;
  message?: string;
  rawText?: string;
  data?: {
    distributor: string;
    gstin: string;
    phone: string;
    address: string;
    invNo: string;
    invDate: string;
    totalCost: number;
    items: Array<{
      name: string;
      company: string;
      salt: string;
      pack: string;
      hsn: string;
      batch: string;
      exp: string;
      qty: number;
      rate: number;
      dmrp: number;
      mrp: number;
      scheme: string;
      disc: number;
      gst: number;
    }>;
  } | null;
}

export const ocrApi = {
  parseBill: (payload: OcrParseBillRequest) =>
    request<OcrParseBillResponse>('/api/ocr/parse-bill', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};

export interface AiAskResponse {
  success: boolean;
  fallback?: boolean;
  message?: string;
  response: string;
}

export const aiApi = {
  ask: (prompt: string, medicineContext?: string) =>
    request<AiAskResponse>('/api/ai/ask', {
      method: 'POST',
      body: JSON.stringify({ prompt, medicineContext }),
    }),
};

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

export const healthApi = {
  check: () => request<{ status: string; timestamp: string }>('/api/health'),
};
