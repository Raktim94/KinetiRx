package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type expenseInput struct {
	ID   string  `json:"id"`
	Date string  `json:"date" binding:"required"`
	Cat  string  `json:"cat"`
	Desc string  `json:"desc"`
	Amt  float64 `json:"amt"`
}

const expenseColumns = `id, date, cat, description, amt, created_at, updated_at`

func scanExpense(row pgx.Row) (models.ExpenseRecord, error) {
	var e models.ExpenseRecord
	err := row.Scan(&e.ID, &e.Date, &e.Cat, &e.Desc, &e.Amt, &e.CreatedAt, &e.UpdatedAt)
	return e, err
}

// ListExpenses handles GET /api/expenses. Supports optional ?date= filter.
func (d *Deps) ListExpenses(c *gin.Context) {
	date := c.Query("date")
	rows, err := d.DB.Query(c.Request.Context(),
		`SELECT `+expenseColumns+` FROM expenses WHERE ($1 = '' OR date = $1) ORDER BY date DESC, created_at DESC`, date)
	if err != nil {
		httpx.Internal(c, "Failed to list expenses")
		return
	}
	defer rows.Close()

	out := []models.ExpenseRecord{}
	for rows.Next() {
		e, err := scanExpense(rows)
		if err != nil {
			httpx.Internal(c, "Failed to read expense row")
			return
		}
		out = append(out, e)
	}
	httpx.OK(c, out)
}

// GetExpense handles GET /api/expenses/:id.
func (d *Deps) GetExpense(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+expenseColumns+` FROM expenses WHERE id = $1`, c.Param("id"))
	e, err := scanExpense(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Expense not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load expense")
		return
	}
	httpx.OK(c, e)
}

// CreateExpense handles POST /api/expenses.
func (d *Deps) CreateExpense(c *gin.Context) {
	var in expenseInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid expense payload: "+err.Error())
		return
	}
	id := in.ID
	if id == "" {
		id = uuid.NewString()
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`INSERT INTO expenses (id, date, cat, description, amt) VALUES ($1,$2,$3,$4,$5) RETURNING `+expenseColumns,
		id, in.Date, in.Cat, in.Desc, in.Amt)
	e, err := scanExpense(row)
	if err != nil {
		httpx.Conflict(c, "Failed to create expense (id may already exist): "+err.Error())
		return
	}
	httpx.Created(c, e)
}

// UpdateExpense handles PUT /api/expenses/:id.
func (d *Deps) UpdateExpense(c *gin.Context) {
	var in expenseInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid expense payload: "+err.Error())
		return
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`UPDATE expenses SET date = $2, cat = $3, description = $4, amt = $5, updated_at = now() WHERE id = $1 RETURNING `+expenseColumns,
		c.Param("id"), in.Date, in.Cat, in.Desc, in.Amt)
	e, err := scanExpense(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Expense not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to update expense")
		return
	}
	httpx.OK(c, e)
}

// DeleteExpense handles DELETE /api/expenses/:id.
func (d *Deps) DeleteExpense(c *gin.Context) {
	tag, err := d.DB.Exec(c.Request.Context(), `DELETE FROM expenses WHERE id = $1`, c.Param("id"))
	if err != nil {
		httpx.Internal(c, "Failed to delete expense")
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.NotFound(c, "Expense not found")
		return
	}
	httpx.NoContent(c)
}
