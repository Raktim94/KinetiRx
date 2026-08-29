package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type saleInput struct {
	ID              string                   `json:"id"`
	Inv             *string                  `json:"inv"`
	InvoiceNo       *string                  `json:"invoiceNo"`
	Date            string                   `json:"date" binding:"required"`
	Cust            *string                  `json:"cust"`
	Name            *string                  `json:"name"`
	Patient         *string                  `json:"patient"`
	PatientID       *string                  `json:"patientId"`
	Phone           *string                  `json:"phone"`
	Items           *string                  `json:"items"`
	Qty             *string                  `json:"qty"`
	Amt             *float64                 `json:"amt"`
	Total           *float64                 `json:"total"`
	Mode            string                   `json:"mode" binding:"required"`
	ItemsDetail     []models.SalesItemDetail `json:"itemsDetail"`
	Subtotal        *float64                 `json:"subtotal"`
	DiscountPercent *float64                 `json:"discountPercent"`
	Doctor          *string                  `json:"doctor"`
	Address         *string                  `json:"address"`
	AgeGender       *string                  `json:"ageGender"`
	PaidAmount      *float64                 `json:"paidAmount"`
	DueAmount       *float64                 `json:"dueAmount"`
}

const saleColumns = `id, inv, invoice_no, date, cust, name, patient, patient_id, phone, items, qty, amt, total, mode,
	items_detail, subtotal, discount_percent, doctor, address, age_gender, paid_amount, due_amount, created_at, updated_at`

func scanSale(row pgx.Row) (models.SalesRecord, error) {
	var s models.SalesRecord
	err := row.Scan(&s.ID, &s.Inv, &s.InvoiceNo, &s.Date, &s.Cust, &s.Name, &s.Patient, &s.PatientID, &s.Phone,
		&s.Items, &s.Qty, &s.Amt, &s.Total, &s.Mode, &s.ItemsDetail, &s.Subtotal, &s.DiscountPercent, &s.Doctor,
		&s.Address, &s.AgeGender, &s.PaidAmount, &s.DueAmount, &s.CreatedAt, &s.UpdatedAt)
	return s, err
}

// ListSales handles GET /api/sales. Supports optional ?date=YYYY-MM-DD and
// ?patientId= filters used by the daily-sales register and patient history views.
func (d *Deps) ListSales(c *gin.Context) {
	date := c.Query("date")
	patientID := c.Query("patientId")

	query := `SELECT ` + saleColumns + ` FROM sales_history WHERE ($1 = '' OR date = $1) AND ($2 = '' OR patient_id = $2) ORDER BY created_at DESC`
	rows, err := d.DB.Query(c.Request.Context(), query, date, patientID)
	if err != nil {
		httpx.Internal(c, "Failed to list sales")
		return
	}
	defer rows.Close()

	out := []models.SalesRecord{}
	for rows.Next() {
		s, err := scanSale(rows)
		if err != nil {
			httpx.Internal(c, "Failed to read sale row")
			return
		}
		out = append(out, s)
	}
	httpx.OK(c, out)
}

// GetSale handles GET /api/sales/:id.
func (d *Deps) GetSale(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+saleColumns+` FROM sales_history WHERE id = $1`, c.Param("id"))
	s, err := scanSale(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Sale not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load sale")
		return
	}
	httpx.OK(c, s)
}

// CreateSale handles POST /api/sales. Sales are append-only: there is no
// update/delete route, matching how POS invoices work in the real business
// (corrections are new records, e.g. returns), which also gives a reliable audit trail.
func (d *Deps) CreateSale(c *gin.Context) {
	var in saleInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid sale payload: "+err.Error())
		return
	}
	if in.ItemsDetail == nil {
		in.ItemsDetail = []models.SalesItemDetail{}
	}
	id := in.ID
	if id == "" {
		id = uuid.NewString()
	}

	const q = `
		INSERT INTO sales_history (id, inv, invoice_no, date, cust, name, patient, patient_id, phone, items, qty, amt,
			total, mode, items_detail, subtotal, discount_percent, doctor, address, age_gender, paid_amount, due_amount)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22)
		RETURNING ` + saleColumns

	row := d.DB.QueryRow(c.Request.Context(), q, id, in.Inv, in.InvoiceNo, in.Date, in.Cust, in.Name, in.Patient,
		in.PatientID, in.Phone, in.Items, in.Qty, in.Amt, in.Total, in.Mode, in.ItemsDetail, in.Subtotal,
		in.DiscountPercent, in.Doctor, in.Address, in.AgeGender, in.PaidAmount, in.DueAmount)
	s, err := scanSale(row)
	if err != nil {
		httpx.Conflict(c, "Failed to create sale (id may already exist, or patientId does not reference an existing patient): "+err.Error())
		return
	}
	d.Events.Publish("sales")
	httpx.Created(c, s)
}
