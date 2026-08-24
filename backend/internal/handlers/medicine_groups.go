package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type medicineGroupInput struct {
	ID   string `json:"id"`
	Name string `json:"name" binding:"required"`
}

const medicineGroupColumns = `id, name, created_at, updated_at`

func scanMedicineGroup(row pgx.Row) (models.MedicineGroup, error) {
	var g models.MedicineGroup
	err := row.Scan(&g.ID, &g.Name, &g.CreatedAt, &g.UpdatedAt)
	return g, err
}

// ListMedicineGroups handles GET /api/medicine-groups.
func (d *Deps) ListMedicineGroups(c *gin.Context) {
	rows, err := d.DB.Query(c.Request.Context(), `SELECT `+medicineGroupColumns+` FROM medicine_groups ORDER BY name ASC`)
	if err != nil {
		httpx.Internal(c, "Failed to list medicine groups")
		return
	}
	defer rows.Close()

	out := []models.MedicineGroup{}
	for rows.Next() {
		g, err := scanMedicineGroup(rows)
		if err != nil {
			httpx.Internal(c, "Failed to read medicine group row")
			return
		}
		out = append(out, g)
	}
	httpx.OK(c, out)
}

// GetMedicineGroup handles GET /api/medicine-groups/:id.
func (d *Deps) GetMedicineGroup(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+medicineGroupColumns+` FROM medicine_groups WHERE id = $1`, c.Param("id"))
	g, err := scanMedicineGroup(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Medicine group not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load medicine group")
		return
	}
	httpx.OK(c, g)
}

// CreateMedicineGroup handles POST /api/medicine-groups.
func (d *Deps) CreateMedicineGroup(c *gin.Context) {
	var in medicineGroupInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid medicine group payload: "+err.Error())
		return
	}
	id := in.ID
	if id == "" {
		id = uuid.NewString()
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`INSERT INTO medicine_groups (id, name) VALUES ($1,$2) RETURNING `+medicineGroupColumns,
		id, in.Name)
	g, err := scanMedicineGroup(row)
	if err != nil {
		httpx.Conflict(c, "Failed to create medicine group (name may already exist): "+err.Error())
		return
	}
	httpx.Created(c, g)
}

// UpdateMedicineGroup handles PUT /api/medicine-groups/:id.
func (d *Deps) UpdateMedicineGroup(c *gin.Context) {
	var in medicineGroupInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid medicine group payload: "+err.Error())
		return
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`UPDATE medicine_groups SET name = $2, updated_at = now() WHERE id = $1 RETURNING `+medicineGroupColumns,
		c.Param("id"), in.Name)
	g, err := scanMedicineGroup(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Medicine group not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to update medicine group (name may already exist): "+err.Error())
		return
	}
	httpx.OK(c, g)
}

// DeleteMedicineGroup handles DELETE /api/medicine-groups/:id.
func (d *Deps) DeleteMedicineGroup(c *gin.Context) {
	tag, err := d.DB.Exec(c.Request.Context(), `DELETE FROM medicine_groups WHERE id = $1`, c.Param("id"))
	if err != nil {
		httpx.Internal(c, "Failed to delete medicine group")
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.NotFound(c, "Medicine group not found")
		return
	}
	httpx.NoContent(c)
}
