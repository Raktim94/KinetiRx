package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type neededMedInput struct {
	ID        string  `json:"id"`
	PatientID *string `json:"patientId"`
	Med       string  `json:"med" binding:"required"`
	Name      string  `json:"name"`
	Phone     string  `json:"phone"`
	Dist      string  `json:"dist"`
	Time      string  `json:"time"`
	Qty       float64 `json:"qty"`
	Status    string  `json:"status"`
}

var validNeededMedStatuses = map[string]bool{
	"Distributor Ordered": true, "Processing": true, "Pending": true, "Delivered": true, "Cancelled": true,
}

const neededMedColumns = `id, patient_id, med, name, phone, dist, time, qty, status, created_at, updated_at`

func scanNeededMed(row pgx.Row) (models.NeededMedOrder, error) {
	var n models.NeededMedOrder
	err := row.Scan(&n.ID, &n.PatientID, &n.Med, &n.Name, &n.Phone, &n.Dist, &n.Time, &n.Qty, &n.Status,
		&n.CreatedAt, &n.UpdatedAt)
	return n, err
}

// ListNeededMeds handles GET /api/needed-meds.
func (d *Deps) ListNeededMeds(c *gin.Context) {
	rows, err := d.DB.Query(c.Request.Context(), `SELECT `+neededMedColumns+` FROM needed_meds ORDER BY created_at DESC`)
	if err != nil {
		httpx.Internal(c, "Failed to list needed medicine orders")
		return
	}
	defer rows.Close()

	out := []models.NeededMedOrder{}
	for rows.Next() {
		n, err := scanNeededMed(rows)
		if err != nil {
			httpx.Internal(c, "Failed to read needed medicine order row")
			return
		}
		out = append(out, n)
	}
	httpx.OK(c, out)
}

// GetNeededMed handles GET /api/needed-meds/:id.
func (d *Deps) GetNeededMed(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+neededMedColumns+` FROM needed_meds WHERE id = $1`, c.Param("id"))
	n, err := scanNeededMed(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Needed medicine order not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load needed medicine order")
		return
	}
	httpx.OK(c, n)
}

// CreateNeededMed handles POST /api/needed-meds.
func (d *Deps) CreateNeededMed(c *gin.Context) {
	var in neededMedInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid needed medicine order payload: "+err.Error())
		return
	}
	if in.Status == "" {
		in.Status = "Pending"
	}
	if !validNeededMedStatuses[in.Status] {
		httpx.BadRequest(c, "status must be one of: Distributor Ordered, Processing, Pending, Delivered, Cancelled")
		return
	}
	id := in.ID
	if id == "" {
		id = uuid.NewString()
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`INSERT INTO needed_meds (id, patient_id, med, name, phone, dist, time, qty, status)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING `+neededMedColumns,
		id, in.PatientID, in.Med, in.Name, in.Phone, in.Dist, in.Time, in.Qty, in.Status)
	n, err := scanNeededMed(row)
	if err != nil {
		httpx.Conflict(c, "Failed to create needed medicine order (id may already exist): "+err.Error())
		return
	}
	d.Events.Publish("neededMeds")
	httpx.Created(c, n)
}

// UpdateNeededMed handles PUT /api/needed-meds/:id.
func (d *Deps) UpdateNeededMed(c *gin.Context) {
	var in neededMedInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid needed medicine order payload: "+err.Error())
		return
	}
	if in.Status != "" && !validNeededMedStatuses[in.Status] {
		httpx.BadRequest(c, "status must be one of: Distributor Ordered, Processing, Pending, Delivered, Cancelled")
		return
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`UPDATE needed_meds SET patient_id = $2, med = $3, name = $4, phone = $5, dist = $6, time = $7, qty = $8,
			status = $9, updated_at = now()
		 WHERE id = $1 RETURNING `+neededMedColumns,
		c.Param("id"), in.PatientID, in.Med, in.Name, in.Phone, in.Dist, in.Time, in.Qty, in.Status)
	n, err := scanNeededMed(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Needed medicine order not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to update needed medicine order")
		return
	}
	d.Events.Publish("neededMeds")
	httpx.OK(c, n)
}

// DeleteNeededMed handles DELETE /api/needed-meds/:id.
func (d *Deps) DeleteNeededMed(c *gin.Context) {
	tag, err := d.DB.Exec(c.Request.Context(), `DELETE FROM needed_meds WHERE id = $1`, c.Param("id"))
	if err != nil {
		httpx.Internal(c, "Failed to delete needed medicine order")
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.NotFound(c, "Needed medicine order not found")
		return
	}
	d.Events.Publish("neededMeds")
	httpx.NoContent(c)
}
