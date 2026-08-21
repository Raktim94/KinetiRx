package main

import (
	"context"
	"fmt"
	"net/url"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// --- list_expenses ---------------------------------------------------------

type listExpensesInput struct {
	Date string `json:"date,omitempty" jsonschema:"filter expenses to a specific date, YYYY-MM-DD (optional; omit to list every recorded expense)"`
}

type listExpensesOutput struct {
	Count    int       `json:"count"`
	Total    float64   `json:"total"`
	Expenses []Expense `json:"expenses"`
}

func (a *app) listExpenses(ctx context.Context, _ *mcp.CallToolRequest, in listExpensesInput) (*mcp.CallToolResult, listExpensesOutput, error) {
	q := url.Values{}
	if in.Date != "" {
		q.Set("date", in.Date)
	}
	var expenses []Expense
	if err := a.client.get(ctx, "/api/expenses", q, &expenses); err != nil {
		return nil, listExpensesOutput{}, err
	}
	total := 0.0
	for _, e := range expenses {
		total += e.Amt
	}
	return nil, listExpensesOutput{Count: len(expenses), Total: total, Expenses: expenses}, nil
}

// --- add_expense (MUTATING) -------------------------------------------

type addExpenseInput struct {
	ID   string  `json:"id,omitempty" jsonschema:"optional client-supplied id; a UUID is generated if omitted"`
	Date string  `json:"date" jsonschema:"expense date, YYYY-MM-DD (required)"`
	Cat  string  `json:"cat,omitempty" jsonschema:"expense category, e.g. rent, utilities, salary, supplies (optional)"`
	Desc string  `json:"desc" jsonschema:"description of the expense (required)"`
	Amt  float64 `json:"amt" jsonschema:"expense amount (required, must be > 0)"`
}

type addExpensePayload struct {
	ID   string  `json:"id,omitempty"`
	Date string  `json:"date"`
	Cat  string  `json:"cat,omitempty"`
	Desc string  `json:"desc,omitempty"`
	Amt  float64 `json:"amt"`
}

// addExpense records a REAL expense entry against the pharmacy's books via
// POST /api/expenses — it is immediately reflected in expense totals and
// (once the register is next updated) the daily register.
func (a *app) addExpense(ctx context.Context, _ *mcp.CallToolRequest, in addExpenseInput) (*mcp.CallToolResult, Expense, error) {
	if in.Date == "" {
		return nil, Expense{}, fmt.Errorf("date is required (YYYY-MM-DD)")
	}
	if in.Desc == "" {
		return nil, Expense{}, fmt.Errorf("desc is required")
	}
	if in.Amt <= 0 {
		return nil, Expense{}, fmt.Errorf("amt must be > 0")
	}

	payload := addExpensePayload{ID: in.ID, Date: in.Date, Cat: in.Cat, Desc: in.Desc, Amt: in.Amt}
	var expense Expense
	if err := a.client.post(ctx, "/api/expenses", payload, &expense); err != nil {
		return nil, Expense{}, err
	}
	return nil, expense, nil
}
