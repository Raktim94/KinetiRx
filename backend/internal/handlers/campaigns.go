package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type campaignInput struct {
	ID     string `json:"id"`
	Doc    string `json:"doc"`
	Date   string `json:"date"`
	Action string `json:"action" binding:"required"`
	Status string `json:"status"`
}

var validCampaignStatuses = map[string]bool{
	"7-Day Alert Active": true, "Upcoming": true, "Planned": true, "Completed": true,
}

const campaignColumns = `id, doc, date, action, status, created_at, updated_at`

func scanCampaign(row pgx.Row) (models.MarketingCampaign, error) {
	var m models.MarketingCampaign
	err := row.Scan(&m.ID, &m.Doc, &m.Date, &m.Action, &m.Status, &m.CreatedAt, &m.UpdatedAt)
	return m, err
}

// ListCampaigns handles GET /api/marketing-campaigns.
func (d *Deps) ListCampaigns(c *gin.Context) {
	rows, err := d.DB.Query(c.Request.Context(), `SELECT `+campaignColumns+` FROM marketing_campaigns ORDER BY date DESC, created_at DESC`)
	if err != nil {
		httpx.Internal(c, "Failed to list marketing campaigns")
		return
	}
	defer rows.Close()

	out := []models.MarketingCampaign{}
	for rows.Next() {
		m, err := scanCampaign(rows)
		if err != nil {
			httpx.Internal(c, "Failed to read marketing campaign row")
			return
		}
		out = append(out, m)
	}
	httpx.OK(c, out)
}

// GetCampaign handles GET /api/marketing-campaigns/:id.
func (d *Deps) GetCampaign(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+campaignColumns+` FROM marketing_campaigns WHERE id = $1`, c.Param("id"))
	m, err := scanCampaign(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Marketing campaign not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load marketing campaign")
		return
	}
	httpx.OK(c, m)
}

// CreateCampaign handles POST /api/marketing-campaigns.
func (d *Deps) CreateCampaign(c *gin.Context) {
	var in campaignInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid marketing campaign payload: "+err.Error())
		return
	}
	if in.Status == "" {
		in.Status = "Planned"
	}
	if !validCampaignStatuses[in.Status] {
		httpx.BadRequest(c, "status must be one of: 7-Day Alert Active, Upcoming, Planned, Completed")
		return
	}
	id := in.ID
	if id == "" {
		id = uuid.NewString()
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`INSERT INTO marketing_campaigns (id, doc, date, action, status) VALUES ($1,$2,$3,$4,$5) RETURNING `+campaignColumns,
		id, in.Doc, in.Date, in.Action, in.Status)
	m, err := scanCampaign(row)
	if err != nil {
		httpx.Conflict(c, "Failed to create marketing campaign (id may already exist): "+err.Error())
		return
	}
	httpx.Created(c, m)
}

// UpdateCampaign handles PUT /api/marketing-campaigns/:id.
func (d *Deps) UpdateCampaign(c *gin.Context) {
	var in campaignInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid marketing campaign payload: "+err.Error())
		return
	}
	if in.Status != "" && !validCampaignStatuses[in.Status] {
		httpx.BadRequest(c, "status must be one of: 7-Day Alert Active, Upcoming, Planned, Completed")
		return
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`UPDATE marketing_campaigns SET doc = $2, date = $3, action = $4, status = $5, updated_at = now()
		 WHERE id = $1 RETURNING `+campaignColumns,
		c.Param("id"), in.Doc, in.Date, in.Action, in.Status)
	m, err := scanCampaign(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Marketing campaign not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to update marketing campaign")
		return
	}
	httpx.OK(c, m)
}

// DeleteCampaign handles DELETE /api/marketing-campaigns/:id.
func (d *Deps) DeleteCampaign(c *gin.Context) {
	tag, err := d.DB.Exec(c.Request.Context(), `DELETE FROM marketing_campaigns WHERE id = $1`, c.Param("id"))
	if err != nil {
		httpx.Internal(c, "Failed to delete marketing campaign")
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.NotFound(c, "Marketing campaign not found")
		return
	}
	httpx.NoContent(c)
}
