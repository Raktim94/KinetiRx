# KinetiRx

**Pharma Care Pro** — a self-hosted pharmacy & small-clinic management system.

![Status](https://img.shields.io/badge/status-active--development-blue)
![License](https://img.shields.io/badge/license-unspecified-lightgrey)
![Backend](https://img.shields.io/badge/backend-Go%20%2B%20Gin-00ADD8)
![Frontend](https://img.shields.io/badge/frontend-React%2019%20%2B%20Vite-646CFF)

KinetiRx runs your pharmacy's day-to-day operations — point-of-sale billing,
medicine inventory, patient records, OPD scheduling, a due-khata (credit
ledger), daily cash-drawer reconciliation, expense tracking, and role-based
staff accounts — on a Postgres database you own, on hardware you control. No
subscription, no third-party SaaS dependency for core operations. Optional
Gemini AI integration adds purchase-bill OCR scanning and a clinical
assistant when you supply an API key; without one, the app runs fully
offline in fallback mode.

Built for independent pharmacies and small clinics that want a real,
auditable system of record instead of a spreadsheet — and that would rather
self-host than hand patient and financial data to a SaaS vendor.

## Features

- **Dashboard** — daily/period overview and analytics
- **Daily Sales** — sales register with cash-drawer reconciliation (daily register: opening cash, denominations, cash/UPI/card split, closing difference)
- **POS** — point-of-sale billing with GST invoicing
- **Due-Khata** — patient credit ledger (dues, payment history)
- **Medicine Orders** — track medicines needed/ordered from distributors
- **Inventory** — medicine & lab-test stock, batch/expiry, distributor tracking
- **Inward OCR** — AI-powered purchase-bill scanning (Gemini) that extracts line items into inventory
- **OPD** — outpatient visit scheduling and follow-up reminders
- **Patients** — patient records, visit history, purchase history, blood-test tracking
- **Expenses** — day-to-day expense logging by category
- **Business Development** — doctor outreach / marketing campaigns and worksheet tasks
- **Employee Management** — role-based staff accounts with per-tab permissions
- **Invoice Settings** — store letterhead, GST/DL numbers, invoice retention policy, printer config
- **System Reset** — administrative data-reset tooling

Every route above (except health check and login) requires a valid JWT and
is authorized server-side against the employee's role/permissions — there is
no client-side-only access control.

## Tech stack

| Layer | Stack |
|---|---|
| Backend | Go + [Gin](https://gin-gonic.com/), PostgreSQL, JWT auth, bcrypt password hashing |
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4, dark/light mode |
| AI | Google Gemini (`gemini-3.7-flash`) for invoice OCR and a clinical assistant — optional, degrades to offline fallback if unconfigured |
| Deployment | Docker Compose (Postgres + backend + nginx-served SPA), CasaOS App Store manifest for one-click NAS install |

## Quick start (Docker Compose)

```bash
git clone https://github.com/Raktim94/KinetiRx.git
cd KinetiRx

cp deploy/.env.example deploy/.env
# Edit deploy/.env and set at minimum:
#   POSTGRES_PASSWORD
#   JWT_SECRET              (openssl rand -hex 32)
#   KINETIRX_ADMIN_PASSWORD (used only on first boot, to seed the admin account)
#   GEMINI_API_KEY          (optional — enables AI OCR + assistant)

docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
```

Open **http://localhost:3080** in a browser. Log in with employee ID
`EMP-ADMIN-1` and the `KINETIRX_ADMIN_PASSWORD` you set — there is no
password-reset flow yet, so keep it safe.

The backend API is also published directly on **http://localhost:8080**
(for curl/health checks/admin scripts); the browser SPA never needs this
since nginx proxies `/api/*` internally. Postgres itself is not published to
the host by default.

### CasaOS

A ready-to-submit [`deploy/casaos-manifest.yml`](deploy/casaos-manifest.yml)
(x-casaos v2 compose-extension spec) is included for one-click installation
from the CasaOS App Store. It is not yet submitted/published — the manifest
currently points at `ghcr.io/raktim94/kinetirx-backend` and
`kinetirx-frontend` images that still need to be built and pushed before
store submission. Once available, install will be a single click from the
CasaOS App Store UI.

## Development setup

Requires Go 1.26+, Node.js, and a local Postgres instance (or run
`docker compose -f deploy/docker-compose.yml up postgres` for just the DB).

**Backend:**
```bash
cd backend
cp .env.example .env   # set DATABASE_URL, JWT_SECRET, KINETIRX_ADMIN_PASSWORD
go run ./cmd/server
```
Runs on `:8080` by default; migrations in `backend/migrations/` run automatically on start.

**Frontend:**
```bash
cd frontend
cp .env.example .env   # optional — defaults to http://localhost:8080 if unset
npm install
npm run dev             # Vite dev server, http://localhost:5173
```
Other scripts: `npm run build` (production build), `npm run preview` (serve the build), `npm run lint` (`tsc --noEmit`).

## Environment variables

### Backend (`backend/.env.example`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `DATABASE_URL` | yes | — | Postgres connection string |
| `JWT_SECRET` | yes | — | Signs JWT access tokens; min 16 chars enforced at startup, use 32+ random bytes |
| `KINETIRX_ADMIN_PASSWORD` | first boot only | — | Plaintext password for the seeded "Master Admin" account (`EMP-ADMIN-1`); bcrypt-hashed on first boot, never read again once the employees table has a row |
| `GEMINI_API_KEY` | no | unset | Enables AI OCR (`/api/ocr/parse-bill`) and the clinical assistant (`/api/ai/ask`); both degrade to a fallback response when unset |
| `PORT` | no | `8080` | Backend listen port |
| `GIN_MODE` | no | `release` | Gin mode (`debug`/`release`) |
| `ALLOWED_ORIGINS` | no | `http://localhost:5173,http://localhost:3000` | CORS allow-list for direct (non-proxied) browser access |

### Frontend (`frontend/.env.example`)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `VITE_API_URL` | no | `http://localhost:8080` (code default) | Base URL of the backend API; only needed when the backend isn't at the default local port |

### Deploy (`deploy/.env.example`) — Compose-level, in addition to the above

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `POSTGRES_USER` | no | `kinetirx` | Postgres role |
| `POSTGRES_PASSWORD` | yes | — | Postgres password |
| `POSTGRES_DB` | no | `kinetirx` | Postgres database name |
| `HTTP_PORT` | no | `3080` | Host port for the frontend (the app you visit) |
| `BACKEND_PORT` | no | `8080` | Host port for direct backend access |

Secrets are never committed — `.env` files are gitignored; only the
`.env.example` templates are tracked.

## Screenshots

Screenshots coming soon.

## Documentation

- Full REST API contract: [`backend/API.md`](backend/API.md)
- Deeper guides (architecture, deployment troubleshooting, contributor setup, MCP server): see the [GitHub Wiki](https://github.com/Raktim94/KinetiRx/wiki)

## License

No license file is currently included in this repository — all rights
reserved by default until one is added. Contact the maintainer before reuse
or redistribution.
