package main

import (
	"context"
	"net/url"
	"time"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type getDashboardSummaryInput struct {
	Date string `json:"date,omitempty" jsonschema:"date to summarize, YYYY-MM-DD; defaults to today (server local date) if omitted"`
}

type getDashboardSummaryOutput struct {
	Date string `json:"date"`

	// Straight from the singleton daily register (GET /api/daily-register).
	DailyRegister DailyRegister `json:"dailyRegister"`

	// Computed from GET /api/sales?date=<date>.
	SalesCountToday int     `json:"salesCountToday"`
	SalesTotalToday float64 `json:"salesTotalToday"`

	// Computed from GET /api/expenses?date=<date>.
	ExpensesCountToday int     `json:"expensesCountToday"`
	ExpensesTotalToday float64 `json:"expensesTotalToday"`

	// Computed from GET /api/medicines.
	TotalMedicines  int `json:"totalMedicines"`
	LowStockCount   int `json:"lowStockCount"`
	OutOfStockCount int `json:"outOfStockCount"`

	// Computed from GET /api/due-khata.
	TotalOutstandingDue float64 `json:"totalOutstandingDue"`
	DueKhataEntryCount  int     `json:"dueKhataEntryCount"`

	// Computed from GET /api/patients.
	TotalPatients int `json:"totalPatients"`
}

// getDashboardSummary is a derived, composite view: the KinetiRx backend
// has no single dashboard/summary/aggregate endpoint (confirmed against
// backend/API.md and backend/internal/handlers/router.go — there is no
// /api/dashboard route). This tool instead calls several real endpoints
// (daily register, today's sales, today's expenses, inventory, due-khata,
// patients) and aggregates them into one object, so an assistant can answer
// "how's the pharmacy doing today" style questions without making six
// separate tool calls itself. Every number here is computed directly from
// live data at call time, not cached or estimated.
//
// Note: the account used to run this MCP server needs several permissions
// at once for this tool to fully succeed — daily-calc, daily-sales,
// expenses, inventory, due-khata, and patients (or the admin role, which
// implicitly passes every permission check). See backend/API.md.
func (a *app) getDashboardSummary(ctx context.Context, _ *mcp.CallToolRequest, in getDashboardSummaryInput) (*mcp.CallToolResult, getDashboardSummaryOutput, error) {
	date := in.Date
	if date == "" {
		date = time.Now().Format("2006-01-02")
	}

	out := getDashboardSummaryOutput{Date: date}

	if err := a.client.get(ctx, "/api/daily-register", nil, &out.DailyRegister); err != nil {
		return nil, out, err
	}

	var sales []Sale
	salesQ := url.Values{"date": []string{date}}
	if err := a.client.get(ctx, "/api/sales", salesQ, &sales); err != nil {
		return nil, out, err
	}
	out.SalesCountToday = len(sales)
	for _, s := range sales {
		if s.Total != nil {
			out.SalesTotalToday += *s.Total
		} else if s.Amt != nil {
			out.SalesTotalToday += *s.Amt
		}
	}

	var expenses []Expense
	expQ := url.Values{"date": []string{date}}
	if err := a.client.get(ctx, "/api/expenses", expQ, &expenses); err != nil {
		return nil, out, err
	}
	out.ExpensesCountToday = len(expenses)
	for _, e := range expenses {
		out.ExpensesTotalToday += e.Amt
	}

	var meds []Medicine
	if err := a.client.get(ctx, "/api/medicines", nil, &meds); err != nil {
		return nil, out, err
	}
	out.TotalMedicines = len(meds)
	for _, m := range meds {
		if !m.TrackStock {
			continue
		}
		if m.Stock <= 0 {
			out.OutOfStockCount++
		} else if m.Stock <= defaultLowStockThreshold {
			out.LowStockCount++
		}
	}

	var dueEntries []PatientDue
	if err := a.client.get(ctx, "/api/due-khata", nil, &dueEntries); err != nil {
		return nil, out, err
	}
	out.DueKhataEntryCount = len(dueEntries)
	for _, d := range dueEntries {
		out.TotalOutstandingDue += d.Due
	}

	var patients []Patient
	if err := a.client.get(ctx, "/api/patients", nil, &patients); err != nil {
		return nil, out, err
	}
	out.TotalPatients = len(patients)

	return nil, out, nil
}
