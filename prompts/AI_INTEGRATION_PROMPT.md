# KinetiRx (Pharma Care Pro) — AI integration prompt

**Sensitive-data product.** KinetiRx holds patient records, dues and sales for pharmacies and small clinics. Integration here is deliberately narrow. Read the "Do not" list before writing any code.

Verified against `backend/API.md` and `mcp-server/README.md`. Code wins over this file; report mismatches.

## What it is
Self-hosted pharmacy and small-clinic management (Go backend): billing/POS, batch and expiry stock, patient records, due-khata, daily register, expenses, distributors, OPD scheduling, optional AI purchase-bill OCR.

## Honest capability map
| Capability | Status |
|---|---|
| REST API (`http://<host>:8080/api`, JSON, RFC-style error envelope) | available; documented in `backend/API.md` |
| Auth | **JWT from `POST /api/auth/login` (employee id/name + password), 12 h expiry, no refresh endpoint.** Roles and per-tab permissions enforced server-side; `admin` passes everything |
| **API keys / scopes** | **missing** — there are no machine credentials with limited scope |
| **Webhooks** | **missing** |
| OpenAPI / SDK | missing |
| Pagination | none; list endpoints return full arrays (sized for one store) |
| MCP | local **stdio** server `mcp-server/` (Go), 13 tools, thin client over the REST API |

Because there are no scoped keys, **do not expose the KinetiRx API to a public website or to the internet for integration purposes**, and never embed an employee's credentials in a website, bundle or repository.

## Use it when
- A pharmacy owner/staff wants an AI assistant, on their own machine or LAN, to look up stock, low stock, dues, the daily register and expenses.
- A developer is building an internal tool that runs inside the pharmacy network and logs in as a dedicated employee account.

## Do not
- Do not build a public pharmacy website that calls KinetiRx for patients, prescriptions, dues or sales. A public site should be static or use its own backend; KinetiRx has no safe public API.
- Do not send patient or prescription data to an AI agent, a model provider, a log, an issue tracker or a test fixture unless the pharmacy has explicitly authorised it and has suitable data-protection arrangements. Prefer aggregate or non-patient tools (`get_low_stock_medicines`, `search_medicine_stock`, `get_daily_register`).
- Do not use production data for development. Use a seeded non-production instance.
- Do not run the MCP server under the admin account "because it is simplest" (the MCP README suggests this). Create a dedicated employee with only the permissions the assistant needs (e.g. `inventory`, `daily-calc`).
- Do not call write tools speculatively.

## MCP setup (local stdio)
Env: `KINETIRX_API_URL` (no `/api`), and `KINETIRX_MCP_USERNAME` + `KINETIRX_MCP_PASSWORD` **or** `KINETIRX_API_TOKEN` (expires after 12 h and cannot renew without username/password), optional `KINETIRX_HTTP_TIMEOUT_SECONDS` (default 20).
```bash
cd mcp-server && go build -o kinetirx-mcp .
claude mcp add kinetirx \
  -e KINETIRX_API_URL=http://localhost:8080 \
  -e KINETIRX_MCP_USERNAME=<dedicated-employee-id> \
  -e KINETIRX_MCP_PASSWORD='<set in your shell, not in chat>' \
  -- /absolute/path/to/mcp-server/kinetirx-mcp
```
(`claude mcp add` is standard Claude Code syntax; not run against a live KinetiRx while writing this. A Docker form and a Compose `mcp` profile are in `mcp-server/README.md`.)

Tools: `list_medicines`, `get_medicine`, `search_medicine_stock`*, `get_low_stock_medicines`*, `list_patients`, `get_patient`, `get_patient_due_khata_balance`*, `create_sale`, `get_daily_register`, `list_expenses`, `add_expense`, `list_distributors`, `get_dashboard_summary`* (*derived client-side from several endpoints). **`create_sale` and `add_expense` are MUTATING**: `create_sale` writes to an append-only table with no update/delete, so a mistake can only be corrected by another entry. Require the user's explicit confirmation of the exact amounts and items every time. `list_patients`/`get_patient` return personal data: use only when the user asks and keep results out of logs.

## If a developer insists on a custom integration
1. Run it inside the pharmacy's network, server-side, with a dedicated least-privilege employee account; store its password in the environment, never in code.
2. Log in, hold the JWT in memory, re-login on `401` (12 h expiry).
3. Read `backend/API.md` for the exact routes and fields; do not guess. Validate everything; fetch whole-list endpoints sparingly.
4. Propose, don't implement, new capabilities (scoped API keys, read-only role, webhooks, pagination) as product work for the maintainers: they are real gaps.

## Verify
On a seeded non-production instance: login succeeds, a wrong password gives `401`, a non-admin without `patients` permission gets `403` from patient tools, `tools/list` shows 13 tools, no credentials appear in the repo or logs. Report what you could not test.

References: `backend/API.md`, `mcp-server/README.md`.
