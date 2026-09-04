package handlers

import (
	"errors"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type patientInput struct {
	ID              string                        `json:"id"`
	Name            string                        `json:"name" binding:"required"`
	Phone           string                        `json:"phone"`
	Age             *string                       `json:"age"`
	Gender          *string                       `json:"gender"`
	AgeGender       *string                       `json:"ageGender"`
	Addr            *string                       `json:"addr"`
	Address         *string                       `json:"address"`
	Doc             *string                       `json:"doc"`
	Doctor          *string                       `json:"doctor"`
	Reason          *string                       `json:"reason"`
	TotalDue        float64                       `json:"totalDue"`
	DueAmount       *float64                      `json:"dueAmount"`
	LastDate        *string                       `json:"lastDate"`
	LastVisitDate   *string                       `json:"lastVisitDate"`
	TotalVisits     *int                          `json:"totalVisits"`
	PurchaseHistory []models.PurchaseHistoryEntry `json:"purchaseHistory"`
	BloodTests      []string                      `json:"bloodTests"`
}

const patientColumns = `id, name, phone, age, gender, age_gender, addr, address, doc, doctor, reason, total_due,
	due_amount, last_date, last_visit_date, total_visits, purchase_history, blood_tests, created_at, updated_at`

func scanPatient(row pgx.Row) (models.PatientRecord, error) {
	var p models.PatientRecord
	err := row.Scan(&p.ID, &p.Name, &p.Phone, &p.Age, &p.Gender, &p.AgeGender, &p.Addr, &p.Address, &p.Doc, &p.Doctor,
		&p.Reason, &p.TotalDue, &p.DueAmount, &p.LastDate, &p.LastVisitDate, &p.TotalVisits, &p.PurchaseHistory,
		&p.BloodTests, &p.CreatedAt, &p.UpdatedAt)
	return p, err
}

func normalizeListFields(in *patientInput) {
	if in.PurchaseHistory == nil {
		in.PurchaseHistory = []models.PurchaseHistoryEntry{}
	}
	if in.BloodTests == nil {
		in.BloodTests = []string{}
	}
}

// ListPatients handles GET /api/patients.
func (d *Deps) ListPatients(c *gin.Context) {
	rows, err := d.DB.Query(c.Request.Context(), `SELECT `+patientColumns+` FROM patients ORDER BY name ASC`)
	if err != nil {
		httpx.Internal(c, "Failed to list patients")
		return
	}
	defer rows.Close()

	out := []models.PatientRecord{}
	for rows.Next() {
		p, err := scanPatient(rows)
		if err != nil {
			httpx.Internal(c, "Failed to read patient row")
			return
		}
		out = append(out, p)
	}
	httpx.OK(c, out)
}

// GetPatient handles GET /api/patients/:id.
func (d *Deps) GetPatient(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+patientColumns+` FROM patients WHERE id = $1`, c.Param("id"))
	p, err := scanPatient(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Patient not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load patient")
		return
	}
	httpx.OK(c, p)
}

// NextPatientID handles GET /api/patients/next-id. It atomically reserves
// the next sequential patient ID number from patient_id_seq (see migration
// 0009) so two callers on different terminals can never be handed the same
// number — client-side "scan the loaded list for the highest number"
// generation raced across concurrent devices and produced duplicate IDs,
// which the patients.id primary key then silently rejected on save.
func (d *Deps) NextPatientID(c *gin.Context) {
	var next int64
	err := d.DB.QueryRow(c.Request.Context(), `SELECT nextval('patient_id_seq')`).Scan(&next)
	if err != nil {
		httpx.Internal(c, "Failed to reserve next patient ID")
		return
	}
	httpx.OK(c, gin.H{"id": strconv.FormatInt(next, 10)})
}

// CreatePatient handles POST /api/patients.
func (d *Deps) CreatePatient(c *gin.Context) {
	var in patientInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid patient payload: "+err.Error())
		return
	}
	normalizeListFields(&in)
	id := in.ID
	if id == "" {
		id = uuid.NewString()
	}

	const q = `
		INSERT INTO patients (id, name, phone, age, gender, age_gender, addr, address, doc, doctor, reason, total_due,
			due_amount, last_date, last_visit_date, total_visits, purchase_history, blood_tests)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		RETURNING ` + patientColumns

	row := d.DB.QueryRow(c.Request.Context(), q, id, in.Name, in.Phone, in.Age, in.Gender, in.AgeGender, in.Addr,
		in.Address, in.Doc, in.Doctor, in.Reason, in.TotalDue, in.DueAmount, in.LastDate, in.LastVisitDate,
		in.TotalVisits, in.PurchaseHistory, in.BloodTests)
	p, err := scanPatient(row)
	if err != nil {
		httpx.Conflict(c, "Failed to create patient (id may already exist): "+err.Error())
		return
	}
	httpx.Created(c, p)
}

// UpdatePatient handles PUT /api/patients/:id.
func (d *Deps) UpdatePatient(c *gin.Context) {
	var in patientInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid patient payload: "+err.Error())
		return
	}
	normalizeListFields(&in)

	const q = `
		UPDATE patients SET
			name = $2, phone = $3, age = $4, gender = $5, age_gender = $6, addr = $7, address = $8, doc = $9,
			doctor = $10, reason = $11, total_due = $12, due_amount = $13, last_date = $14, last_visit_date = $15,
			total_visits = $16, purchase_history = $17, blood_tests = $18, updated_at = now()
		WHERE id = $1
		RETURNING ` + patientColumns

	row := d.DB.QueryRow(c.Request.Context(), q, c.Param("id"), in.Name, in.Phone, in.Age, in.Gender, in.AgeGender,
		in.Addr, in.Address, in.Doc, in.Doctor, in.Reason, in.TotalDue, in.DueAmount, in.LastDate, in.LastVisitDate,
		in.TotalVisits, in.PurchaseHistory, in.BloodTests)
	p, err := scanPatient(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Patient not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to update patient")
		return
	}
	httpx.OK(c, p)
}

// DeletePatient handles DELETE /api/patients/:id.
func (d *Deps) DeletePatient(c *gin.Context) {
	tag, err := d.DB.Exec(c.Request.Context(), `DELETE FROM patients WHERE id = $1`, c.Param("id"))
	if err != nil {
		httpx.Internal(c, "Failed to delete patient")
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.NotFound(c, "Patient not found")
		return
	}
	httpx.NoContent(c)
}
