package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type medicineInput struct {
	ID           string  `json:"id"`
	Name         string  `json:"name" binding:"required"`
	Company      string  `json:"company"`
	Dist         string  `json:"dist"`
	Distributor  *string `json:"distributor"`
	HSN          string  `json:"hsn"`
	Batch        string  `json:"batch"`
	Pack         string  `json:"pack"`
	Salt         string  `json:"salt"`
	Generic      *string `json:"generic"`
	Group        string  `json:"group"`
	Rack         string  `json:"rack"`
	Stock        float64 `json:"stock"`
	Rate         float64 `json:"rate"`
	OMRP         float64 `json:"omrp"`
	MRP          float64 `json:"mrp"`
	Scheme       string  `json:"scheme"`
	GST          float64 `json:"gst"`
	Disc         float64 `json:"disc"`
	TabsPerStrip float64 `json:"tabsPerStrip"`
	Expiry       string  `json:"expiry"`
	IsLabTest    bool    `json:"isLabTest"`
	TrackStock   *bool   `json:"trackStock"`
	ItemType     string  `json:"itemType"`
}

const medicineColumns = `id, name, company, dist, distributor_id, hsn, batch, pack, salt, generic, group_name, rack,
	stock, rate, omrp, mrp, scheme, gst, disc, tabs_per_strip, expiry, is_lab_test, track_stock, item_type, created_at, updated_at`

func scanMedicine(row pgx.Row) (models.Medicine, error) {
	var m models.Medicine
	err := row.Scan(&m.ID, &m.Name, &m.Company, &m.Dist, &m.Distributor, &m.HSN, &m.Batch, &m.Pack, &m.Salt, &m.Generic,
		&m.Group, &m.Rack, &m.Stock, &m.Rate, &m.OMRP, &m.MRP, &m.Scheme, &m.GST, &m.Disc, &m.TabsPerStrip, &m.Expiry,
		&m.IsLabTest, &m.TrackStock, &m.ItemType, &m.CreatedAt, &m.UpdatedAt)
	return m, err
}

// ListMedicines handles GET /api/medicines.
func (d *Deps) ListMedicines(c *gin.Context) {
	rows, err := d.DB.Query(c.Request.Context(), `SELECT `+medicineColumns+` FROM medicines ORDER BY name ASC`)
	if err != nil {
		httpx.Internal(c, "Failed to list medicines")
		return
	}
	defer rows.Close()

	out := []models.Medicine{}
	for rows.Next() {
		m, err := scanMedicine(rows)
		if err != nil {
			httpx.Internal(c, "Failed to read medicine row")
			return
		}
		out = append(out, m)
	}
	httpx.OK(c, out)
}

// GetMedicine handles GET /api/medicines/:id.
func (d *Deps) GetMedicine(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+medicineColumns+` FROM medicines WHERE id = $1`, c.Param("id"))
	m, err := scanMedicine(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Medicine not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load medicine")
		return
	}
	httpx.OK(c, m)
}

// CreateMedicine handles POST /api/medicines.
func (d *Deps) CreateMedicine(c *gin.Context) {
	var in medicineInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid medicine payload: "+err.Error())
		return
	}
	id := in.ID
	if id == "" {
		id = uuid.NewString()
	}
	trackStock := true
	if in.TrackStock != nil {
		trackStock = *in.TrackStock
	}
	itemType := in.ItemType
	if itemType == "" {
		itemType = "medicine"
	}

	const q = `
		INSERT INTO medicines (id, name, company, dist, distributor_id, hsn, batch, pack, salt, generic, group_name, rack,
			stock, rate, omrp, mrp, scheme, gst, disc, tabs_per_strip, expiry, is_lab_test, track_stock, item_type)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24)
		RETURNING ` + medicineColumns

	row := d.DB.QueryRow(c.Request.Context(), q, id, in.Name, in.Company, in.Dist, in.Distributor, in.HSN, in.Batch,
		in.Pack, in.Salt, in.Generic, in.Group, in.Rack, in.Stock, in.Rate, in.OMRP, in.MRP, in.Scheme, in.GST, in.Disc,
		in.TabsPerStrip, in.Expiry, in.IsLabTest, trackStock, itemType)
	m, err := scanMedicine(row)
	if err != nil {
		httpx.Conflict(c, "Failed to create medicine (id may already exist): "+err.Error())
		return
	}
	httpx.Created(c, m)
}

// UpdateMedicine handles PUT /api/medicines/:id (full replace of mutable fields).
func (d *Deps) UpdateMedicine(c *gin.Context) {
	var in medicineInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid medicine payload: "+err.Error())
		return
	}
	trackStock := true
	if in.TrackStock != nil {
		trackStock = *in.TrackStock
	}
	itemType := in.ItemType
	if itemType == "" {
		itemType = "medicine"
	}

	const q = `
		UPDATE medicines SET
			name = $2, company = $3, dist = $4, distributor_id = $5, hsn = $6, batch = $7, pack = $8, salt = $9,
			generic = $10, group_name = $11, rack = $12, stock = $13, rate = $14, omrp = $15, mrp = $16, scheme = $17,
			gst = $18, disc = $19, tabs_per_strip = $20, expiry = $21, is_lab_test = $22, track_stock = $23,
			item_type = $24, updated_at = now()
		WHERE id = $1
		RETURNING ` + medicineColumns

	row := d.DB.QueryRow(c.Request.Context(), q, c.Param("id"), in.Name, in.Company, in.Dist, in.Distributor, in.HSN,
		in.Batch, in.Pack, in.Salt, in.Generic, in.Group, in.Rack, in.Stock, in.Rate, in.OMRP, in.MRP, in.Scheme, in.GST,
		in.Disc, in.TabsPerStrip, in.Expiry, in.IsLabTest, trackStock, itemType)
	m, err := scanMedicine(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Medicine not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to update medicine")
		return
	}
	httpx.OK(c, m)
}

// DeleteMedicine handles DELETE /api/medicines/:id.
func (d *Deps) DeleteMedicine(c *gin.Context) {
	tag, err := d.DB.Exec(c.Request.Context(), `DELETE FROM medicines WHERE id = $1`, c.Param("id"))
	if err != nil {
		httpx.Internal(c, "Failed to delete medicine")
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.NotFound(c, "Medicine not found")
		return
	}
	httpx.NoContent(c)
}
