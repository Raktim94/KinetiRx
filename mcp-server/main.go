// Command kinetirx-mcp is a Model Context Protocol (MCP) server for
// KinetiRx (product name "Pharma Care Pro"), a pharmacy management system.
//
// It is a thin, stdio-based MCP client over the existing KinetiRx REST API
// (see backend/API.md) — it reimplements no business logic, only shapes
// requests/responses so an MCP-aware assistant can look up inventory,
// patients, and financials, and (for two clearly-marked mutating tools)
// record a real sale or expense against a live pharmacy instance.
package main

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// app bundles the KinetiRx API client that every tool handler is a method
// on.
type app struct {
	client *Client
}

func loadConfig() (Config, error) {
	baseURL := strings.TrimRight(os.Getenv("KINETIRX_API_URL"), "/")
	if baseURL == "" {
		return Config{}, fmt.Errorf("KINETIRX_API_URL is required (e.g. http://localhost:8080)")
	}

	identifier := os.Getenv("KINETIRX_MCP_USERNAME")
	password := os.Getenv("KINETIRX_MCP_PASSWORD")
	staticToken := os.Getenv("KINETIRX_API_TOKEN")

	if staticToken == "" && (identifier == "" || password == "") {
		return Config{}, fmt.Errorf(
			"either KINETIRX_API_TOKEN, or both KINETIRX_MCP_USERNAME and KINETIRX_MCP_PASSWORD, must be set")
	}

	timeout := 20 * time.Second
	if raw := os.Getenv("KINETIRX_HTTP_TIMEOUT_SECONDS"); raw != "" {
		if secs, err := strconv.Atoi(raw); err == nil && secs > 0 {
			timeout = time.Duration(secs) * time.Second
		}
	}

	return Config{
		BaseURL:     baseURL,
		Identifier:  identifier,
		Password:    password,
		StaticToken: staticToken,
		Timeout:     timeout,
	}, nil
}

func main() {
	// MCP over stdio is a text protocol on stdout — all diagnostic logging
	// must go to stderr, never stdout.
	logger := slog.New(slog.NewTextHandler(os.Stderr, nil))

	cfg, err := loadConfig()
	if err != nil {
		logger.Error("configuration error", "err", err)
		os.Exit(1)
	}

	client := NewClient(cfg)

	// Log in once at startup so configuration problems (bad credentials,
	// unreachable backend) surface immediately instead of on the first tool
	// call. If only a static token was provided (no credentials to log in
	// with), skip this — we trust the caller-supplied token and simply
	// won't be able to refresh it once it expires (see Config.StaticToken).
	if cfg.Identifier != "" && cfg.Password != "" {
		ctx, cancel := context.WithTimeout(context.Background(), cfg.Timeout)
		if err := client.Login(ctx); err != nil {
			cancel()
			logger.Error("failed to log in to KinetiRx backend at startup", "url", cfg.BaseURL, "err", err)
			os.Exit(1)
		}
		cancel()
		logger.Info("logged in to KinetiRx backend", "url", cfg.BaseURL, "identifier", cfg.Identifier)
	} else {
		logger.Info("starting with a pre-issued KINETIRX_API_TOKEN; it cannot be auto-refreshed after it expires (no credentials configured)")
	}

	a := &app{client: client}

	server := mcp.NewServer(&mcp.Implementation{
		Name:    "kinetirx-mcp",
		Title:   "KinetiRx / Pharma Care Pro",
		Version: "0.1.0",
	}, &mcp.ServerOptions{
		Logger: logger,
		Instructions: "Tools for operating a live KinetiRx (Pharma Care Pro) pharmacy management " +
			"instance: inventory lookup, patient records, due-khata (patient credit) balances, " +
			"daily register, expenses, and distributors. create_sale and add_expense are mutating " +
			"and write real records to the connected pharmacy's database — use them only when the " +
			"user has explicitly confirmed a real transaction, never for hypothetical or exploratory " +
			"questions. Everything else is read-only.",
	})

	registerTools(server, a)

	logger.Info("kinetirx-mcp server starting on stdio")
	if err := server.Run(context.Background(), &mcp.StdioTransport{}); err != nil {
		logger.Error("server exited with error", "err", err)
		os.Exit(1)
	}
}

// registerTools wires every KinetiRx MCP tool onto the server. Each tool
// maps to one (or, for derived/aggregate tools, a small handful of) real
// backend/API.md endpoint(s) — see the per-file comments for exactly which.
func registerTools(server *mcp.Server, a *app) {
	readOnly := &mcp.ToolAnnotations{ReadOnlyHint: true, DestructiveHint: boolPtr(false), IdempotentHint: true, OpenWorldHint: boolPtr(false)}
	mutating := &mcp.ToolAnnotations{ReadOnlyHint: false, DestructiveHint: boolPtr(false), IdempotentHint: false, OpenWorldHint: boolPtr(false)}

	// --- Inventory -------------------------------------------------------
	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_medicines",
		Description: "List all medicines and lab tests in the pharmacy's inventory, ordered by name. Read-only. Maps to GET /api/medicines.",
		Annotations: readOnly,
	}, a.listMedicines)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "get_medicine",
		Description: "Get full details for one inventory item (medicine or lab test) by id, including stock, pricing, batch, and expiry. Read-only. Maps to GET /api/medicines/:id.",
		Annotations: readOnly,
	}, a.getMedicine)

	mcp.AddTool(server, &mcp.Tool{
		Name: "search_medicine_stock",
		Description: "Search inventory by name/salt/generic/company substring to answer questions like 'do we have <medicine> in stock' or 'how much <medicine> do we have'. " +
			"Returns matching items with their current stock, sorted with in-stock matches first. Read-only, derived client-side from GET /api/medicines (the backend has no dedicated search endpoint).",
		Annotations: readOnly,
	}, a.searchMedicineStock)

	mcp.AddTool(server, &mcp.Tool{
		Name: "get_low_stock_medicines",
		Description: "List medicines whose stock is at or below a threshold (default 10), for restocking/reorder decisions. " +
			"DERIVED: the backend has no reorder-threshold field or low-stock endpoint, so this fetches the full inventory and filters client-side against the given threshold — treat it as a heuristic, not a configured reorder point. Read-only.",
		Annotations: readOnly,
	}, a.getLowStockMedicines)

	// --- Patients ----------------------------------------------------------
	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_patients",
		Description: "List all patients, optionally filtered by a name/phone substring. Read-only. Maps to GET /api/patients.",
		Annotations: readOnly,
	}, a.listPatients)

	mcp.AddTool(server, &mcp.Tool{
		Name:        "get_patient",
		Description: "Get full details for one patient by id, including visit/purchase history and due amounts. Read-only. Maps to GET /api/patients/:id.",
		Annotations: readOnly,
	}, a.getPatient)

	mcp.AddTool(server, &mcp.Tool{
		Name: "get_patient_due_khata_balance",
		Description: "Get a patient's due-khata (store credit / pending payment) balance: both the totalDue/dueAmount recorded on their patient profile, and the independently-summed total of every due-khata ledger entry linked to them. " +
			"DERIVED: the backend has no per-patient due-khata endpoint, so this fetches the patient record plus the full due-khata list and filters/sums client-side. Read-only.",
		Annotations: readOnly,
	}, a.getPatientDueKhataBalance)

	// --- Sales / POS -------------------------------------------------------
	mcp.AddTool(server, &mcp.Tool{
		Name: "create_sale",
		Description: "MUTATING — records a REAL point-of-sale transaction in the pharmacy's sales history (POST /api/sales). " +
			"This immediately becomes a permanent, append-only record (the backend has no sale update/delete endpoint — corrections must be recorded as new entries, e.g. a return). " +
			"Only call this when the user has explicitly confirmed they want to record an actual completed sale, never speculatively or for hypothetical totals. " +
			"Requires date and mode; either itemized `items` or an explicit `total`/`subtotal` is required too. If `patientId` is given it must reference a real, existing patient.",
		Annotations: mutating,
	}, a.createSale)

	mcp.AddTool(server, &mcp.Tool{
		Name: "get_daily_register",
		Description: "Get the current daily cash register: opening cash, cash/UPI/card sales, expenses, closing physical cash, denominations, and lock state. " +
			"This is the singleton register staff maintain at cash-closing time, not necessarily a live auto-total of every raw sale. Read-only. Maps to GET /api/daily-register.",
		Annotations: readOnly,
	}, a.getDailyRegister)

	// --- Expenses ----------------------------------------------------------
	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_expenses",
		Description: "List recorded expenses, optionally filtered to one date (YYYY-MM-DD). Read-only. Maps to GET /api/expenses.",
		Annotations: readOnly,
	}, a.listExpenses)

	mcp.AddTool(server, &mcp.Tool{
		Name: "add_expense",
		Description: "MUTATING — records a REAL expense entry against the pharmacy's books (POST /api/expenses), immediately reflected in expense totals and reports. " +
			"Only call this when the user has explicitly confirmed an actual expense to record. Requires date, desc, and amt (> 0).",
		Annotations: mutating,
	}, a.addExpense)

	// --- Distributors --------------------------------------------------------
	mcp.AddTool(server, &mcp.Tool{
		Name:        "list_distributors",
		Description: "List pharmaceutical wholesale distributors/suppliers on file, optionally filtered by a name substring. Read-only. Maps to GET /api/distributors.",
		Annotations: readOnly,
	}, a.listDistributors)

	// --- Dashboard -----------------------------------------------------------
	mcp.AddTool(server, &mcp.Tool{
		Name: "get_dashboard_summary",
		Description: "Get a composite 'how's the pharmacy doing' snapshot for a given date (default today): daily register totals, sales count/total, expenses count/total, inventory size and low/out-of-stock counts, total outstanding due-khata balance, and patient count. " +
			"DERIVED: the backend has no single dashboard endpoint, so this aggregates several real endpoints (daily register, sales, expenses, medicines, due-khata, patients) into one object. Read-only, but requires the connected account to hold several permissions at once (or the admin role).",
		Annotations: readOnly,
	}, a.getDashboardSummary)
}
