# kinetirx-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) (MCP) server for
**KinetiRx** ("Pharma Care Pro"), a pharmacy management system. It lets an
MCP-aware AI assistant (Claude Desktop, Claude Code, etc.) look up inventory,
patients, due-khata balances, the daily cash register, expenses, and
distributors on a live KinetiRx instance — and, for two clearly-marked
tools, record a real sale or expense.

This server is a **thin client** over the existing KinetiRx REST API
(documented in `../backend/API.md`). It contains no business logic of its
own beyond a couple of clearly-documented client-side conveniences (see
"Derived tools" below) — every tool call is one or more real HTTP requests
against your backend.

## What it is not

- It is **not** a reimplementation of the backend. All authorization,
  validation, and data integrity rules still live in the Go backend; this
  server just calls it.
- It is **not** a network service. It speaks MCP over stdio (newline-
  delimited JSON-RPC on stdin/stdout) — an MCP client launches it as a
  subprocess, the same way it would launch any local CLI tool. There is
  nothing to expose on a port.

## Tools

| Tool | Endpoint(s) called | Mutates data? |
|---|---|---|
| `list_medicines` | `GET /api/medicines` | No |
| `get_medicine` | `GET /api/medicines/:id` | No |
| `search_medicine_stock` | `GET /api/medicines` (client-side filter) | No |
| `get_low_stock_medicines` | `GET /api/medicines` (client-side filter) | No |
| `list_patients` | `GET /api/patients` | No |
| `get_patient` | `GET /api/patients/:id` | No |
| `get_patient_due_khata_balance` | `GET /api/patients/:id` + `GET /api/due-khata` | No |
| `create_sale` | `POST /api/sales` | **Yes — real POS transaction** |
| `get_daily_register` | `GET /api/daily-register` | No |
| `list_expenses` | `GET /api/expenses` | No |
| `add_expense` | `POST /api/expenses` | **Yes — real expense record** |
| `list_distributors` | `GET /api/distributors` | No |
| `get_dashboard_summary` | `GET /api/daily-register`, `/api/sales`, `/api/expenses`, `/api/medicines`, `/api/due-khata`, `/api/patients` | No |

### Derived tools (no direct backend equivalent)

The backend has no dedicated endpoints for a few useful queries — confirmed
against `../backend/API.md`, `../backend/internal/models/models.go`, and
`../backend/internal/handlers/router.go`:

- **`search_medicine_stock`** / **`get_low_stock_medicines`** — there is no
  medicine search endpoint and no reorder-threshold field on the medicine
  record (`Medicine` only has a raw `stock` count). Both tools fetch the
  full medicine list (`GET /api/medicines`) and filter client-side —
  reasonable at the row counts API.md itself describes this API as
  targeting ("thousands, not millions, of rows per table").
- **`get_patient_due_khata_balance`** — `GET /api/due-khata` takes no
  `patientId` filter. This tool fetches the patient record and the full
  due-khata list, then filters/sums client-side.
- **`get_dashboard_summary`** — there is no `/api/dashboard` or similar
  aggregate endpoint. This tool composes one by calling six real endpoints
  and aggregating their results.

### Mutating tools

`create_sale` and `add_expense` are the only tools that write data. Both:

- Are marked `readOnlyHint: false` in their MCP tool annotations.
- Have descriptions that open with **"MUTATING"** and explain the real-world
  consequence (a permanent sales-history row / expense row in the connected
  pharmacy's live database).
- Validate required fields client-side before ever calling the backend
  (e.g. `create_sale` refuses to record a sale with no items and no
  explicit total, rather than silently sending an empty transaction).

`create_sale` in particular writes to an **append-only** table — the
backend has no sale update/delete endpoint (see API.md), so a mistaken call
can only be corrected by recording a new, correcting entry (e.g. a return),
exactly like the real POS workflow. Point an assistant at this tool only
when a user has explicitly confirmed a real transaction, never speculatively.

## Configuration (environment variables)

| Variable | Required | Description |
|---|---|---|
| `KINETIRX_API_URL` | Yes | Base URL of the backend, e.g. `http://localhost:8080` (no `/api` suffix). |
| `KINETIRX_MCP_USERNAME` | One of these two, or `KINETIRX_API_TOKEN` | Employee `id` or `name` used to log in via `POST /api/auth/login`. |
| `KINETIRX_MCP_PASSWORD` | ↑ | That employee's password. |
| `KINETIRX_API_TOKEN` | Alternative to the above | A pre-issued JWT access token to use immediately, skipping the startup login. Since the backend has no refresh-token endpoint (tokens simply expire after 12h), a token supplied this way **cannot be renewed** unless `KINETIRX_MCP_USERNAME`/`PASSWORD` are also set — without them, tool calls will start failing with an auth error once the token expires. |
| `KINETIRX_HTTP_TIMEOUT_SECONDS` | No (default `20`) | Per-request HTTP timeout against the backend. |

The server logs in once at startup (when credentials are configured) so
misconfiguration (bad credentials, unreachable backend) fails fast and
loudly instead of on the assistant's first tool call. On any `401` from the
backend it transparently re-logs-in and retries the request once — this is
what lets it outlive a single 12h access token without a restart.

**Permissions**: several tools call permission-gated endpoints (`inventory`,
`patients`, `due-khata`, `daily-calc`, `daily-sales`, `expenses`, `pos`).
`get_dashboard_summary` alone touches six of them. The simplest setup is to
point `KINETIRX_MCP_USERNAME`/`PASSWORD` at an **admin** account (admins
implicitly pass every permission check, per API.md) — a non-admin account
lacking one of these permissions will get `403 forbidden` from just that
tool, while every other tool keeps working normally.

## Running it

### Locally (Go toolchain)

```bash
cd mcp-server
go build -o kinetirx-mcp .
KINETIRX_API_URL=http://localhost:8080 \
KINETIRX_MCP_USERNAME=EMP-ADMIN-1 \
KINETIRX_MCP_PASSWORD=your-admin-password \
./kinetirx-mcp
```

It will block, speaking MCP JSON-RPC on stdin/stdout — this is meant to be
launched by an MCP client, not run interactively by a human.

### Via Docker

```bash
cd mcp-server
docker build -t kinetirx-mcp .
docker run -i --rm \
  -e KINETIRX_API_URL=http://host.docker.internal:8080 \
  -e KINETIRX_MCP_USERNAME=EMP-ADMIN-1 \
  -e KINETIRX_MCP_PASSWORD=your-admin-password \
  kinetirx-mcp
```

The `-i` flag is required — it keeps stdin open so the MCP client on the
other end of the pipe can actually talk to the process.

### Via the deploy Compose stack

`../deploy/docker-compose.yml` defines an `mcp-server` service gated behind
the `mcp` [Compose profile](https://docs.docker.com/compose/how-tos/profiles/),
so it is **not** started by a normal `docker compose up` (see "Why this
isn't an always-on service" below). Run it on demand, using the backend
already running on the Compose network:

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env \
  --profile mcp run --rm -T mcp-server
```

`-T` disables Compose's pseudo-TTY allocation, which would otherwise
corrupt the JSON-RPC stream. `deploy/.env` needs `KINETIRX_MCP_USERNAME` /
`KINETIRX_MCP_PASSWORD` set (see `deploy/.env.example`); `KINETIRX_API_URL`
is already wired to the internal `backend:8080` compose address.

## Why this isn't an always-on service in docker-compose.yml

MCP servers over stdio are launched *by* their client, one process per
client session — there is no listening socket, no port to publish, and no
meaningful `HEALTHCHECK` for a process whose stdin is only useful once
something is actually piping JSON-RPC into it. Running it detached under
`restart: unless-stopped` (like `postgres`/`backend`/`frontend`) would just
keep a process alive whose stdin is `/dev/null` and whose stdout nobody
reads — pure overhead, and any tool call made through it would have no
client to send a response to.

So it's defined in the compose file (satisfying "wire it into the existing
stack") but gated behind the `mcp` profile, invoked with `run` rather than
`up`, so:

- A plain `docker compose up` continues to start exactly the original three
  services (postgres, backend, frontend) — unaffected.
- An MCP client config can still shell out to
  `docker compose --profile mcp run --rm -T mcp-server` as its launch
  command (see below) and get a properly networked container (reaching
  `backend:8080` over the compose network) without publishing anything or
  running a container 24/7.
- Running the compiled binary directly against `KINETIRX_API_URL` pointed
  at the backend's published `BACKEND_PORT` (no Docker at all) works
  identically and is the simpler option for local development.

## Connecting an MCP client

### Claude Code / Claude Desktop — local binary

```json
{
  "mcpServers": {
    "kinetirx": {
      "command": "/absolute/path/to/mcp-server/kinetirx-mcp",
      "env": {
        "KINETIRX_API_URL": "http://localhost:8080",
        "KINETIRX_MCP_USERNAME": "EMP-ADMIN-1",
        "KINETIRX_MCP_PASSWORD": "your-admin-password"
      }
    }
  }
}
```

### Claude Code / Claude Desktop — via Docker Compose

```json
{
  "mcpServers": {
    "kinetirx": {
      "command": "docker",
      "args": [
        "compose",
        "-f", "/absolute/path/to/deploy/docker-compose.yml",
        "--env-file", "/absolute/path/to/deploy/.env",
        "--profile", "mcp",
        "run", "--rm", "-T", "mcp-server"
      ]
    }
  }
}
```

(For Claude Code specifically, `claude mcp add` can register either form
without hand-editing config — see `claude mcp add --help`.)

## Development

```bash
go build ./...
go vet ./...
gofmt -l .        # should print nothing
```

### Live verification (what was actually run during development)

The full round trip was exercised against a real backend + Postgres,
started the same way as any other verification pass in this project:

```bash
cp deploy/.env.example deploy/.env   # then fill in real/throwaway secrets
docker compose -f deploy/docker-compose.yml --env-file deploy/.env \
  up -d postgres backend --build
```

...then a small MCP client (using the same Go SDK, `CommandTransport`)
connected to a locally-built `kinetirx-mcp` binary over stdio and drove
`tools/list` plus `tools/call` for every read tool, `add_expense` and
`create_sale` (confirmed via a follow-up `list_expenses`/response payload
that the rows were really written), and several error paths (404 lookups,
missing required fields, an empty-sale rejection, and a `patientId`
foreign-key violation) — all behaved as documented. Afterward:

```bash
docker compose -f deploy/docker-compose.yml --env-file deploy/.env down -v
rm deploy/.env
```

(`down -v` drops the Postgres volume, which is also what discarded the
test `add_expense`/`create_sale` rows created during verification — no
separate cleanup of those was needed.)
