package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type patientDueInput struct {
	ID        string  `json:"id"`
	PatientID *string `json:"patientId"`
	Name      string  `json:"name" binding:"required"`
	Phone     string  `json:"phone"`
	Addr      string  `json:"addr"`
	Doc       string  `json:"doc"`
	Reason    string  `json:"reason"`
	Due       float64 `json:"due"`
	LastDate  string  `json:"lastDate"`
}

const patientDueColumns = `id, patient_id, name, phone, addr, doc, reason, due, last_date, created_at, updated_at`

func scanPatientDue(row pgx.Row) (models.PatientDue, error) {
	var p models.PatientDue
	err := row.Scan(&p.ID, &p.PatientID, &p.Name, &p.Phone, &p.Addr, &p.Doc, &p.Reason, &p.Due, &p.LastDate,
		&p.CreatedAt, &p.UpdatedAt)
	return p, err
}

// ListPatientsDue handles GET /api/due-khata.
func (d *Deps) ListPatientsDue(c *gin.Context) {
	rows, err := d.DB.Query(c.Request.Context(), `SELECT `+patientDueColumns+` FROM patients_due ORDER BY last_date DESC NULLS LAST, name ASC`)
	if err != nil {
		httpx.Internal(c, "Failed to list due-khata entries")
		return
	}
	defer rows.Close()

	out := []models.PatientDue{}
	for rows.Next() {
		p, err := scanPatientDue(rows)
		if err != nil {
			httpx.Internal(c, "Failed to read due-khata row")
			return
		}
		out = append(out, p)
	}
	httpx.OK(c, out)
}

// GetPatientDue handles GET /api/due-khata/:id.
func (d *Deps) GetPatientDue(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+patientDueColumns+` FROM patients_due WHERE id = $1`, c.Param("id"))
	p, err := scanPatientDue(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Due-khata entry not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load due-khata entry")
		return
	}
	httpx.OK(c, p)
}

// CreatePatientDue handles POST /api/due-khata.
func (d *Deps) CreatePatientDue(c *gin.Context) {
	var in patientDueInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid due-khata payload: "+err.Error())
		return
	}
	id := in.ID
	if id == "" {
		id = uuid.NewString()
	}

	const q = `
		INSERT INTO patients_due (id, patient_id, name, phone, addr, doc, reason, due, last_date)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
		RETURNING ` + patientDueColumns

	row := d.DB.QueryRow(c.Request.Context(), q, id, in.PatientID, in.Name, in.Phone, in.Addr, in.Doc, in.Reason,
		in.Due, in.LastDate)
	p, err := scanPatientDue(row)
	if err != nil {
		httpx.Conflict(c, "Failed to create due-khata entry (id may already exist): "+err.Error())
		return
	}
	httpx.Created(c, p)
}

// UpdatePatientDue handles PUT /api/due-khata/:id.
func (d *Deps) UpdatePatientDue(c *gin.Context) {
	var in patientDueInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid due-khata payload: "+err.Error())
		return
	}

	const q = `
		UPDATE patients_due SET
			patient_id = $2, name = $3, phone = $4, addr = $5, doc = $6, reason = $7, due = $8, last_date = $9,
			updated_at = now()
		WHERE id = $1
		RETURNING ` + patientDueColumns

	row := d.DB.QueryRow(c.Request.Context(), q, c.Param("id"), in.PatientID, in.Name, in.Phone, in.Addr, in.Doc,
		in.Reason, in.Due, in.LastDate)
	p, err := scanPatientDue(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Due-khata entry not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to update due-khata entry")
		return
	}
	httpx.OK(c, p)
}

// DeletePatientDue handles DELETE /api/due-khata/:id.
func (d *Deps) DeletePatientDue(c *gin.Context) {
	tag, err := d.DB.Exec(c.Request.Context(), `DELETE FROM patients_due WHERE id = $1`, c.Param("id"))
	if err != nil {
		httpx.Internal(c, "Failed to delete due-khata entry")
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.NotFound(c, "Due-khata entry not found")
		return
	}
	httpx.NoContent(c)
}
