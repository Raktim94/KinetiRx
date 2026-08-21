package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type distributorInput struct {
	ID             string  `json:"id"`
	Name           string  `json:"name" binding:"required"`
	Gstin          string  `json:"gstin"`
	Phone          string  `json:"phone"`
	Addr           string  `json:"addr"`
	DlNo           *string `json:"dlNo"`
	Email          *string `json:"email"`
	ContactPerson  *string `json:"contactPerson"`
	RegisteredDate *string `json:"registeredDate"`
	Source         *string `json:"source"`
}

const distributorColumns = `id, name, gstin, phone, addr, dl_no, email, contact_person, registered_date, source, created_at, updated_at`

func scanDistributor(row pgx.Row) (models.Distributor, error) {
	var dist models.Distributor
	err := row.Scan(&dist.ID, &dist.Name, &dist.Gstin, &dist.Phone, &dist.Addr, &dist.DlNo, &dist.Email,
		&dist.ContactPerson, &dist.RegisteredDate, &dist.Source, &dist.CreatedAt, &dist.UpdatedAt)
	return dist, err
}

// ListDistributors handles GET /api/distributors.
func (d *Deps) ListDistributors(c *gin.Context) {
	rows, err := d.DB.Query(c.Request.Context(), `SELECT `+distributorColumns+` FROM distributors ORDER BY name ASC`)
	if err != nil {
		httpx.Internal(c, "Failed to list distributors")
		return
	}
	defer rows.Close()

	out := []models.Distributor{}
	for rows.Next() {
		dist, err := scanDistributor(rows)
		if err != nil {
			httpx.Internal(c, "Failed to read distributor row")
			return
		}
		out = append(out, dist)
	}
	httpx.OK(c, out)
}

// GetDistributor handles GET /api/distributors/:id.
func (d *Deps) GetDistributor(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+distributorColumns+` FROM distributors WHERE id = $1`, c.Param("id"))
	dist, err := scanDistributor(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Distributor not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load distributor")
		return
	}
	httpx.OK(c, dist)
}

// CreateDistributor handles POST /api/distributors.
func (d *Deps) CreateDistributor(c *gin.Context) {
	var in distributorInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid distributor payload: "+err.Error())
		return
	}
	id := in.ID
	if id == "" {
		id = uuid.NewString()
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`INSERT INTO distributors (id, name, gstin, phone, addr, dl_no, email, contact_person, registered_date, source)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING `+distributorColumns,
		id, in.Name, in.Gstin, in.Phone, in.Addr, in.DlNo, in.Email, in.ContactPerson, in.RegisteredDate, in.Source)
	dist, err := scanDistributor(row)
	if err != nil {
		httpx.Conflict(c, "Failed to create distributor (id may already exist): "+err.Error())
		return
	}
	httpx.Created(c, dist)
}

// UpdateDistributor handles PUT /api/distributors/:id.
func (d *Deps) UpdateDistributor(c *gin.Context) {
	var in distributorInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid distributor payload: "+err.Error())
		return
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`UPDATE distributors SET name = $2, gstin = $3, phone = $4, addr = $5, dl_no = $6, email = $7,
			contact_person = $8, registered_date = $9, source = $10, updated_at = now()
		 WHERE id = $1 RETURNING `+distributorColumns,
		c.Param("id"), in.Name, in.Gstin, in.Phone, in.Addr, in.DlNo, in.Email, in.ContactPerson, in.RegisteredDate, in.Source)
	dist, err := scanDistributor(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Distributor not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to update distributor")
		return
	}
	httpx.OK(c, dist)
}

// DeleteDistributor handles DELETE /api/distributors/:id.
func (d *Deps) DeleteDistributor(c *gin.Context) {
	tag, err := d.DB.Exec(c.Request.Context(), `DELETE FROM distributors WHERE id = $1`, c.Param("id"))
	if err != nil {
		httpx.Internal(c, "Failed to delete distributor")
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.NotFound(c, "Distributor not found")
		return
	}
	httpx.NoContent(c)
}
