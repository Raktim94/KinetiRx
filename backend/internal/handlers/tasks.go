package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type worksheetTaskInput struct {
	ID     string `json:"id"`
	Cat    string `json:"cat"`
	Desc   string `json:"desc" binding:"required"`
	Date   string `json:"date"`
	Status string `json:"status"`
}

var validTaskStatuses = map[string]bool{
	"Pending": true, "In Progress": true, "Planned": true, "Completed": true,
}

const taskColumns = `id, cat, description, date, status, created_at, updated_at`

func scanTask(row pgx.Row) (models.WorksheetTask, error) {
	var t models.WorksheetTask
	err := row.Scan(&t.ID, &t.Cat, &t.Desc, &t.Date, &t.Status, &t.CreatedAt, &t.UpdatedAt)
	return t, err
}

// ListTasks handles GET /api/worksheet-tasks.
func (d *Deps) ListTasks(c *gin.Context) {
	rows, err := d.DB.Query(c.Request.Context(), `SELECT `+taskColumns+` FROM worksheet_tasks ORDER BY date DESC, created_at DESC`)
	if err != nil {
		httpx.Internal(c, "Failed to list worksheet tasks")
		return
	}
	defer rows.Close()

	out := []models.WorksheetTask{}
	for rows.Next() {
		t, err := scanTask(rows)
		if err != nil {
			httpx.Internal(c, "Failed to read worksheet task row")
			return
		}
		out = append(out, t)
	}
	httpx.OK(c, out)
}

// GetTask handles GET /api/worksheet-tasks/:id.
func (d *Deps) GetTask(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+taskColumns+` FROM worksheet_tasks WHERE id = $1`, c.Param("id"))
	t, err := scanTask(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Worksheet task not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load worksheet task")
		return
	}
	httpx.OK(c, t)
}

// CreateTask handles POST /api/worksheet-tasks.
func (d *Deps) CreateTask(c *gin.Context) {
	var in worksheetTaskInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid worksheet task payload: "+err.Error())
		return
	}
	if in.Status == "" {
		in.Status = "Pending"
	}
	if !validTaskStatuses[in.Status] {
		httpx.BadRequest(c, "status must be one of: Pending, In Progress, Planned, Completed")
		return
	}
	id := in.ID
	if id == "" {
		id = uuid.NewString()
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`INSERT INTO worksheet_tasks (id, cat, description, date, status) VALUES ($1,$2,$3,$4,$5) RETURNING `+taskColumns,
		id, in.Cat, in.Desc, in.Date, in.Status)
	t, err := scanTask(row)
	if err != nil {
		httpx.Conflict(c, "Failed to create worksheet task (id may already exist): "+err.Error())
		return
	}
	httpx.Created(c, t)
}

// UpdateTask handles PUT /api/worksheet-tasks/:id.
func (d *Deps) UpdateTask(c *gin.Context) {
	var in worksheetTaskInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid worksheet task payload: "+err.Error())
		return
	}
	if in.Status != "" && !validTaskStatuses[in.Status] {
		httpx.BadRequest(c, "status must be one of: Pending, In Progress, Planned, Completed")
		return
	}
	row := d.DB.QueryRow(c.Request.Context(),
		`UPDATE worksheet_tasks SET cat = $2, description = $3, date = $4, status = $5, updated_at = now()
		 WHERE id = $1 RETURNING `+taskColumns,
		c.Param("id"), in.Cat, in.Desc, in.Date, in.Status)
	t, err := scanTask(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Worksheet task not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to update worksheet task")
		return
	}
	httpx.OK(c, t)
}

// DeleteTask handles DELETE /api/worksheet-tasks/:id.
func (d *Deps) DeleteTask(c *gin.Context) {
	tag, err := d.DB.Exec(c.Request.Context(), `DELETE FROM worksheet_tasks WHERE id = $1`, c.Param("id"))
	if err != nil {
		httpx.Internal(c, "Failed to delete worksheet task")
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.NotFound(c, "Worksheet task not found")
		return
	}
	httpx.NoContent(c)
}
