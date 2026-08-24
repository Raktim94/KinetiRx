# KinetiRx (Pharma Care Pro) Backend API

Base URL: `http://<host>:<port>/api` (default port `8080`).

## Conventions

- All request/response bodies are JSON (`Content-Type: application/json`).
- All routes except `GET /api/health` and `POST /api/auth/login` require a
  valid JWT access token in the `Authorization: Bearer <token>` header.
- Most routes additionally require the authenticated employee to hold a
  specific permission (a `TabType` string from the frontend's permission
  model) **or** have `role: "admin"` (admins implicitly pass every
  permission check). This is enforced server-side; there is no client-side-only
  authorization anywhere in this API.
- Every non-2xx response uses this envelope:

  ```json
  {
    "type": "validation_error",
    "title": "Human-readable summary",
    "status": 400,
    "errors": [{ "field": "name", "message": "..." }],
    "request_id": "..."
  }
  ```

  `errors` is only present for validation failures. `type` is one of:
  `validation_error` (400), `unauthorized` (401), `forbidden` (403),
  `not_found` (404), `conflict` (409), `internal_error` (500), or an
  endpoint-specific type such as `ocr_extraction_failed` / `ai_request_failed`.

- IDs: entities accept an optional client-supplied `id` string on create; if
  omitted, the server generates a UUID. IDs are immutable after creation.
- Timestamps (`createdAt` / `updatedAt`) are RFC3339 UTC, server-managed —
  never accepted from the client.
- List endpoints currently return the full collection as a JSON array (no
  pagination) — pharmacy-scale data volumes (thousands, not millions, of
  rows per table) don't yet warrant cursor pagination; add it first if this
  API is ever exposed beyond a single store's internal traffic.

## Authentication

### `GET /api/auth/setup-status`
No auth required.

Response `200`: `{ "needsSetup": true }` when the `employees` table is
empty (no admin account exists yet) — the frontend shows a "Create Admin
Account" screen instead of the login form in this case. `false` once any
employee exists.

### `POST /api/auth/setup`
No auth required. Only succeeds once — creates the first admin employee
(id `EMP-ADMIN-1`, role `admin`, every permission) and logs them in. Always
`409 conflict` once any employee row exists; use login instead. This is the
UI-driven alternative to setting `KINETIRX_ADMIN_PASSWORD` before first
boot (see the backend README/`.env.example`) — whichever happens first
wins.

Request:
```json
{ "name": "Jane Doe", "password": "plaintext-password (min 8 chars)" }
```

Response `201`: same shape as `POST /api/auth/login`'s `200`.

### `POST /api/auth/login`
No auth required. Rate-limited per IP (10 requests/minute) against brute-force.

Request:
```json
{ "identifier": "EMP-ADMIN-1", "password": "plaintext-password" }
```
`identifier` matches an employee's `id` OR their `name` (case-insensitive).

Response `200`:
```json
{
  "accessToken": "eyJ...",
  "expiresAt": "2026-08-21T08:23:25Z",
  "user": {
    "id": "EMP-ADMIN-1",
    "name": "Master Admin",
    "desig": "Director & Admin",
    "role": "admin",
    "permissions": ["dashboard", "pos", "..."],
    "mustChangePassword": false
  }
}
```
`401 unauthorized` for any wrong identifier or password (identical error for both, to prevent account enumeration).

`mustChangePassword: true` means this account's current password was set by
an admin (on create, or via a reset through `PUT /api/employees/:id`) and is
treated as temporary — the frontend blocks the rest of the app behind a
forced password-change screen until `PUT /api/auth/password` is called.

### `GET /api/auth/me`
Auth required (any authenticated employee). Re-reads the employee record from
the database (not just JWT claims), so permission edits or a deleted account
take effect immediately rather than waiting for token expiry.

Response `200`: same `user` shape as login's `user` field.
`401 unauthorized` if the employee has since been deleted.

Access tokens expire after **12 hours**. There is no refresh-token endpoint
in this version — the client must re-login after expiry.

### `PUT /api/auth/password`
Auth required (any authenticated employee — self-service only, no admin
override; identity comes from the JWT, never from the request body). Rate-
limited per IP (10 requests/minute).

Request:
```json
{ "currentPassword": "plaintext", "newPassword": "plaintext (min 8 chars)" }
```

Verifies `currentPassword` against the caller's own stored hash before
accepting the change (a valid-but-hijacked session token alone isn't
enough). On success, clears `mustChangePassword` and responds `204`.
`401 unauthorized` if `currentPassword` doesn't match.

---

## Medicines / Inventory — `/api/medicines`
Permission: `inventory` (or `admin` role).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/medicines` | List all medicines/lab-tests, ordered by name |
| GET | `/api/medicines/:id` | Get one medicine |
| POST | `/api/medicines` | Create |
| PUT | `/api/medicines/:id` | Full update |
| DELETE | `/api/medicines/:id` | Delete |

Object shape (request body for POST/PUT, response body for all):
```json
{
  "id": "string (optional on create)",
  "name": "string (required)",
  "company": "string",
  "dist": "string",
  "distributor": "string | null",
  "hsn": "string",
  "batch": "string",
  "pack": "string",
  "salt": "string",
  "generic": "string | null",
  "group": "string",
  "rack": "string",
  "stock": 0,
  "rate": 0,
  "omrp": 0,
  "mrp": 0,
  "scheme": "string",
  "gst": 0,
  "disc": 0,
  "tabsPerStrip": 1,
  "expiry": "YYYY-MM",
  "isLabTest": false,
  "trackStock": true,
  "itemType": "medicine | lab_test",
  "createdAt": "2026-08-21T00:00:00Z",
  "updatedAt": "2026-08-21T00:00:00Z"
}
```

---

## Patients — `/api/patients`
Permission: `patients`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/patients` | List all patients |
| GET | `/api/patients/:id` | Get one patient |
| POST | `/api/patients` | Create |
| PUT | `/api/patients/:id` | Full update |
| DELETE | `/api/patients/:id` | Delete |

```json
{
  "id": "string",
  "name": "string (required)",
  "phone": "string",
  "age": "string | null",
  "gender": "string | null",
  "ageGender": "string | null",
  "addr": "string | null",
  "address": "string | null",
  "doc": "string | null",
  "doctor": "string | null",
  "reason": "string | null",
  "totalDue": 0,
  "dueAmount": 0,
  "lastDate": "string | null",
  "lastVisitDate": "string | null",
  "totalVisits": 0,
  "purchaseHistory": [{ "date": "string", "items": "string", "amount": 0 }],
  "bloodTests": ["string"],
  "createdAt": "...", "updatedAt": "..."
}
```

---

## Due-Khata (patient credit ledger) — `/api/due-khata`
Permission: `due-khata`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/due-khata` | List all due-khata entries |
| GET | `/api/due-khata/:id` | Get one |
| POST | `/api/due-khata` | Create |
| PUT | `/api/due-khata/:id` | Full update |
| DELETE | `/api/due-khata/:id` | Delete |

```json
{
  "id": "string",
  "patientId": "string | null (FK -> patients.id, ON DELETE SET NULL)",
  "name": "string (required)",
  "phone": "string",
  "addr": "string",
  "doc": "string",
  "reason": "string",
  "due": 0,
  "lastDate": "string",
  "createdAt": "...", "updatedAt": "..."
}
```

---

## Sales History (POS invoices) — `/api/sales`
Append-mostly: **no PUT/DELETE**. Corrections should be recorded as new
sales records (e.g. a return), preserving an audit trail.

| Method | Path | Permission | Purpose |
|---|---|---|---|
| GET | `/api/sales?date=YYYY-MM-DD&patientId=...` | `daily-sales` | List, optionally filtered |
| GET | `/api/sales/:id` | `daily-sales` | Get one sale |
| POST | `/api/sales` | `pos` | Create a sale |

```json
{
  "id": "string",
  "inv": "string | null",
  "invoiceNo": "string | null",
  "date": "YYYY-MM-DD (required)",
  "cust": "string | null",
  "name": "string | null",
  "patient": "string | null",
  "patientId": "string | null (FK -> patients.id, ON DELETE SET NULL)",
  "phone": "string | null",
  "items": "string | null",
  "qty": "string | null",
  "amt": 0,
  "total": 0,
  "mode": "string (required, e.g. cash/upi/card)",
  "itemsDetail": [{ "name": "string", "qty": 0, "price": 0, "total": 0 }],
  "subtotal": 0,
  "discountPercent": 0,
  "doctor": "string | null",
  "address": "string | null",
  "ageGender": "string | null",
  "paidAmount": 0,
  "dueAmount": 0,
  "createdAt": "...", "updatedAt": "..."
}
```
If `patientId` is supplied but doesn't reference an existing patient, the
insert fails with `409 conflict` (foreign key violation).

---

## Expenses — `/api/expenses`
Permission: `expenses`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/expenses?date=YYYY-MM-DD` | List, optionally filtered by date |
| GET | `/api/expenses/:id` | Get one |
| POST | `/api/expenses` | Create |
| PUT | `/api/expenses/:id` | Full update |
| DELETE | `/api/expenses/:id` | Delete |

```json
{ "id": "string", "date": "YYYY-MM-DD (required)", "cat": "string", "desc": "string", "amt": 0, "createdAt": "...", "updatedAt": "..." }
```

---

## Needed Medicine Orders — `/api/needed-meds`
Permission: `medicine-orders`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/needed-meds` | List all |
| GET | `/api/needed-meds/:id` | Get one |
| POST | `/api/needed-meds` | Create |
| PUT | `/api/needed-meds/:id` | Full update |
| DELETE | `/api/needed-meds/:id` | Delete |

```json
{
  "id": "string",
  "patientId": "string | null (FK -> patients.id, ON DELETE SET NULL)",
  "med": "string (required)",
  "name": "string",
  "phone": "string",
  "dist": "string",
  "time": "string",
  "qty": 0,
  "status": "Distributor Ordered | Processing | Pending | Delivered | Cancelled",
  "createdAt": "...", "updatedAt": "..."
}
```
`status` defaults to `"Pending"` if omitted on create; invalid values return `400`.

---

## OPD Visits — `/api/opd-visits`
Permission: `opd`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/opd-visits` | List all, newest visit date first |
| GET | `/api/opd-visits/:id` | Get one |
| POST | `/api/opd-visits` | Create |
| PUT | `/api/opd-visits/:id` | Full update |
| DELETE | `/api/opd-visits/:id` | Delete |

```json
{
  "id": "string", "name": "string (required)", "phone": "string", "ageSex": "string",
  "doc": "string", "vdate": "string", "rvdate": "string", "btest": "string", "reminder": "string",
  "createdAt": "...", "updatedAt": "..."
}
```

---

## Distributors — `/api/distributors`
Permission: `inventory`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/distributors` | List all |
| GET | `/api/distributors/:id` | Get one |
| POST | `/api/distributors` | Create |
| PUT | `/api/distributors/:id` | Full update |
| DELETE | `/api/distributors/:id` | Delete |

```json
{
  "id": "string", "name": "string (required)", "gstin": "string", "phone": "string", "addr": "string",
  "dlNo": "string | null", "email": "string | null", "contactPerson": "string | null",
  "registeredDate": "string | null", "source": "OCR Purchase Bill | Manual Registration | null",
  "createdAt": "...", "updatedAt": "..."
}
```
Referenced by `medicines.distributor_id` (`ON DELETE SET NULL` — deleting a
distributor never fails or cascades into medicine records).

---

## Marketing Campaigns — `/api/marketing-campaigns`
Permission: `business-dev`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/marketing-campaigns` | List all |
| GET | `/api/marketing-campaigns/:id` | Get one |
| POST | `/api/marketing-campaigns` | Create |
| PUT | `/api/marketing-campaigns/:id` | Full update |
| DELETE | `/api/marketing-campaigns/:id` | Delete |

```json
{
  "id": "string", "doc": "string", "date": "string", "action": "string (required)",
  "status": "7-Day Alert Active | Upcoming | Planned | Completed",
  "createdAt": "...", "updatedAt": "..."
}
```
`status` defaults to `"Planned"` if omitted.

---

## Worksheet Tasks — `/api/worksheet-tasks`
Permission: `business-dev`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/worksheet-tasks` | List all |
| GET | `/api/worksheet-tasks/:id` | Get one |
| POST | `/api/worksheet-tasks` | Create |
| PUT | `/api/worksheet-tasks/:id` | Full update |
| DELETE | `/api/worksheet-tasks/:id` | Delete |

```json
{
  "id": "string", "cat": "string", "desc": "string (required)", "date": "string",
  "status": "Pending | In Progress | Planned | Completed",
  "createdAt": "...", "updatedAt": "..."
}
```
`status` defaults to `"Pending"` if omitted.

---

## Employees — `/api/employees`
`GET` requires `employee-mgmt` permission (or admin). `POST`/`PUT`/`DELETE`
require `role: admin` specifically — permission arrays cannot grant employee
mutation rights, only a real admin role can.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/employees` | `employee-mgmt` | List all (no password/PIN hashes ever included) |
| GET | `/api/employees/:id` | `employee-mgmt` | Get one |
| POST | `/api/employees` | admin | Create |
| PUT | `/api/employees/:id` | admin | Update |
| DELETE | `/api/employees/:id` | admin | Delete |

Create request:
```json
{
  "id": "string (optional)",
  "name": "string (required)",
  "desig": "string",
  "password": "string (required, min 8 chars)",
  "phone": "string | null",
  "role": "admin | staff | ... (default: staff)",
  "pin": "string | null (optional quick-unlock PIN)",
  "permissions": ["pos", "inventory", "..."]
}
```
Update request: same shape, but `password`/`pin` are only changed if
non-empty — omit them to leave the existing credentials untouched. Setting a
new `password` here (an admin resetting someone else's password) marks it
temporary the same as create does — see `mustChangePassword` below.

Response (both, and GET):
```json
{
  "id": "string", "name": "string", "desig": "string", "phone": "string | null",
  "role": "string", "permissions": ["string"], "mustChangePassword": true,
  "createdAt": "...", "updatedAt": "..."
}
```
`password`/`pin` are **never** returned — the underlying bcrypt hashes are
marked `json:"-"` in the Go model and cannot leak through this or any other endpoint.

`mustChangePassword` is always `true` on create, and set back to `true`
whenever an admin sets a new `password` via update — it's cleared only by
the employee themselves via `PUT /api/auth/password`.

---

## Medicine Groups — `/api/medicine-groups`
Permission: `inventory` (or `admin` role). A managed picklist backing
`medicines.group` (labeled "Doctor Specific Group" in the UI — e.g. tagging
stock tied to a particular prescribing doctor's preference); `medicines.group`
itself stays free-text with no FK, so this is purely picker/management UI.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/medicine-groups` | List all, ordered by name |
| GET | `/api/medicine-groups/:id` | Get one |
| POST | `/api/medicine-groups` | Create |
| PUT | `/api/medicine-groups/:id` | Rename |
| DELETE | `/api/medicine-groups/:id` | Delete |

```json
{
  "id": "string (optional on create)", "name": "string (required, unique)",
  "createdAt": "...", "updatedAt": "..."
}
```
Seeded on first migration with the values already in use before this list
was admin-managed: `General`, `Dr. Sayan Majumdar`, `Dr. T.K. Khan`.

Safety rails (all return `409 conflict`):
- Cannot delete or demote (`role` != `admin`) the **last remaining** admin account.
- Cannot delete **your own** account while authenticated as it.

Valid `permissions` values (any of): `dashboard`, `daily-calc`, `daily-sales`,
`pos`, `due-khata`, `medicine-orders`, `inventory`, `inward`, `inward-ocr`,
`opd`, `patients`, `expenses`, `business-dev`, `employee-mgmt`,
`invoice-settings`, `system-reset`. Unknown values return `400`.

---

## Daily Register — `/api/daily-register`
Singleton-per-org record (one row, always). Permission: `daily-calc`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/daily-register` | Get the current register (zeroed defaults if never set) |
| PUT | `/api/daily-register` | Upsert (full replace) the register |

```json
{
  "date": "YYYY-MM-DD | null",
  "prevBD": 0, "todaySell": 0, "phonePe": 0, "expenses": 0, "bankShift": 0,
  "isLocked": false, "openingCash": 0, "totalSales": 0, "cashSales": 0,
  "upiSales": 0, "cardSales": 0, "totalExpenses": 0,
  "denominations": { "2000": 0, "500": 0, "100": 0 },
  "closingPhysicalCash": 0, "cashDifference": 0, "isDrawerClosed": false,
  "updatedAt": "..."
}
```

---

## Invoice Config — `/api/invoice-config`
Singleton-per-org record. `GET` requires only authentication (any employee
needs this to print invoices); `PUT` requires `invoice-settings` permission.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/api/invoice-config` | any authenticated employee | Get current config (defaults if never set) |
| PUT | `/api/invoice-config` | `invoice-settings` | Upsert (full replace) |

```json
{
  "name": "string (required)", "storeName": "string | null", "subtitle": "string | null",
  "dl": "string", "gst": "string", "phone": "string", "waGroup": "string", "addr": "string", "terms": "string",
  "logoUrl": "string | null", "retentionMonths": 6, "retentionPolicyNotice": "string | null",
  "autoPurgeOldInvoices": true, "lastPurgeDate": "string | null",
  "director": "string | null", "pharmacist": "string | null", "currency": "string | null",
  "printerType": "string | null", "headerTheme": "string | null", "updatedAt": "..."
}
```

---

## AI-Powered Endpoints

Both call the Gemini REST API (`gemini-3.7-flash`, `generateContent`)
directly via `net/http` using `GEMINI_API_KEY` from the environment. When
that variable is unset, both return a fallback response (`success: false,
fallback: true`) instead of erroring, so the frontend can degrade gracefully.

### `POST /api/ocr/parse-bill`
Permission: `inward-ocr`.

Request (send either `imageBase64` or `textContent`, not both):
```json
{
  "imageBase64": "data:image/jpeg;base64,... (optional; data: prefix stripped automatically)",
  "mimeType": "image/jpeg (default)",
  "textContent": "raw OCR/plain text of the invoice (optional, used if imageBase64 absent)",
  "distributorHint": "string (optional, currently informational only — not sent to Gemini)"
}
```
`400` if neither `imageBase64` nor `textContent` is supplied.

Success response (Gemini configured, valid JSON extracted):
```json
{
  "success": true,
  "data": {
    "distributor": "string", "gstin": "string", "phone": "string", "address": "string",
    "invNo": "string", "invDate": "YYYY-MM-DD", "totalCost": 0.0,
    "items": [{ "name": "string", "company": "string", "salt": "string", "pack": "string",
      "hsn": "string", "batch": "string", "exp": "YYYY-MM", "qty": 0, "rate": 0.0,
      "dmrp": 0.0, "mrp": 0.0, "scheme": "string", "disc": 0.0, "gst": 0.0 }]
  }
}
```
If Gemini's response isn't valid JSON: `{"success": true, "rawText": "...", "data": null}`.

Fallback (no `GEMINI_API_KEY`):
```json
{ "success": false, "fallback": true, "message": "GEMINI_API_KEY not configured on server. Using built-in pharmaceutical OCR engine." }
```
Gemini call failure: `500` with `type: "ocr_extraction_failed"`.

### `POST /api/ai/ask`
No specific permission beyond authentication (any logged-in employee may
consult the assistant).

Request:
```json
{ "prompt": "string (required)", "medicineContext": "string (optional)" }
```

Success response:
```json
{ "success": true, "response": "Gemini's clinical-pharmacist-styled answer text" }
```
Fallback (no `GEMINI_API_KEY`):
```json
{ "success": false, "fallback": true, "message": "AI assistant is operating in offline mode.", "response": "Clinical Pharmacist Advisory: For <prompt>, ..." }
```
Gemini call failure: `500` with `type: "ai_request_failed"`.

---

## Health Check

### `GET /api/health`
No auth required.
```json
{ "status": "ok", "timestamp": "2026-08-21T00:00:00Z" }
```

---

## Deliberately not implemented

The old prototype exposed `/api/state/sync` and `/api/state/reset` — a
single flat JSON blob synced/replaced wholesale with no auth at all. That
model is replaced entirely by the per-entity REST resources above (each with
its own table, real FKs, and real authorization), so there is no equivalent
"sync the whole blob" or "wipe everything" endpoint in this backend. If a
bulk "factory reset" / "new store onboarding" flow is still needed, it
should be a new, explicitly admin-gated endpoint built on top of these
tables — intentionally left out of this pass rather than resurrected as an
unauthenticated bulk-write foot-gun.
