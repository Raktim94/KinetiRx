package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type opdVisitInput struct {
	ID       string `json:"id"`
	Name     string `json:"name" binding:"required"`
	Phone    string `json:"phone"`
	AgeSex   string `json:"ageSex"`
	Doc      string `json:"doc"`
	Vdate    string `json:"vdate"`
	Rvdate   string `json:"rvdate"`
	Btest    string `json:"btest"`
	Reminder string `json:"reminder"`
}

const opdVisitColumns = `id, name, phone, age_sex, doc, vdate, rvdate, btest, reminder, created_at, updated_at`

func scanOPDVisit(row pgx.Row) (models.OPDVisit, error) {
	var o models.OPDVisit
	err := row.Scan(&o.ID, &o.Name, &o.Phone, &o.AgeSex, &o.Doc, &o.Vdate, &o.Rvdate, &o.Btest, &o.Reminder,
		&o.CreatedAt, &o.UpdatedAt)
	return o, err
}

// ListOPDVisits handles GET /api/opd-visits.
func (d *Deps) ListOPDVisits(c *gin.Context) {
	rows, err := d.DB.Query(c.Request.Context(), `SELECT `+opdVisitColumns+` FROM opd_visits ORDER BY vdate DESC, created_at DESC`)
	if err != nil {
		httpx.Internal(c, "Failed to list OPD visits")
		return
	}
	defer rows.Close()

	out := []models.OPDVisit{}
	for rows.Next() {
		o, err := scanOPDVisit(rows)
		if err != nil {
			httpx.Internal(c, "Failed to read OPD visit row")
			return
		}
		out = append(out, o)
	}
	httpx.OK(c, out)
}

// GetOPDVisit handles GET /api/opd-visits/:id.
func (d *Deps) GetOPDVisit(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+opdVisitColumns+` FROM opd_visits WHERE id = $1`, c.Param("id"))
	o, err := scanOPDVisit(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "OPD visit not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load OPD visit")
		return
	}
	httpx.OK(c, o)
}

// CreateOPDVisit handles POST /api/opd-visits.
func (d *Deps) CreateOPDVisit(c *gin.Context) {
	var in opdVisitInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid OPD visit payload: "+err.Error())
		return
	}
	id := in.ID
	if id == "" {
		id = uuid.NewString()
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`INSERT INTO opd_visits (id, name, phone, age_sex, doc, vdate, rvdate, btest, reminder)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING `+opdVisitColumns,
		id, in.Name, in.Phone, in.AgeSex, in.Doc, in.Vdate, in.Rvdate, in.Btest, in.Reminder)
	o, err := scanOPDVisit(row)
	if err != nil {
		httpx.Conflict(c, "Failed to create OPD visit (id may already exist): "+err.Error())
		return
	}
	httpx.Created(c, o)
}

// UpdateOPDVisit handles PUT /api/opd-visits/:id.
func (d *Deps) UpdateOPDVisit(c *gin.Context) {
	var in opdVisitInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid OPD visit payload: "+err.Error())
		return
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`UPDATE opd_visits SET name = $2, phone = $3, age_sex = $4, doc = $5, vdate = $6, rvdate = $7, btest = $8,
			reminder = $9, updated_at = now()
		 WHERE id = $1 RETURNING `+opdVisitColumns,
		c.Param("id"), in.Name, in.Phone, in.AgeSex, in.Doc, in.Vdate, in.Rvdate, in.Btest, in.Reminder)
	o, err := scanOPDVisit(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "OPD visit not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to update OPD visit")
		return
	}
	httpx.OK(c, o)
}

// DeleteOPDVisit handles DELETE /api/opd-visits/:id.
func (d *Deps) DeleteOPDVisit(c *gin.Context) {
	tag, err := d.DB.Exec(c.Request.Context(), `DELETE FROM opd_visits WHERE id = $1`, c.Param("id"))
	if err != nil {
		httpx.Internal(c, "Failed to delete OPD visit")
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.NotFound(c, "OPD visit not found")
		return
	}
	httpx.NoContent(c)
}
