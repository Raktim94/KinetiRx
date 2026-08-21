package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/auth"
	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/middleware"
	"kinetirx/backend/internal/models"
)

type employeeInput struct {
	ID          string   `json:"id"`
	Name        string   `json:"name" binding:"required"`
	Desig       string   `json:"desig"`
	Password    *string  `json:"password"`
	Phone       *string  `json:"phone"`
	Role        string   `json:"role"`
	Pin         *string  `json:"pin"`
	Permissions []string `json:"permissions"`
}

const employeeColumns = `id, name, desig, phone, role, permissions, created_at, updated_at`

func scanEmployee(row pgx.Row) (models.Employee, error) {
	var e models.Employee
	err := row.Scan(&e.ID, &e.Name, &e.Desig, &e.Phone, &e.Role, &e.Permissions, &e.CreatedAt, &e.UpdatedAt)
	return e, err
}

func validatePermissions(perms []string) error {
	valid := make(map[string]bool, len(models.AllTabTypes))
	for _, t := range models.AllTabTypes {
		valid[string(t)] = true
	}
	for _, p := range perms {
		if !valid[p] {
			return errors.New("unknown permission: " + p)
		}
	}
	return nil
}

// ListEmployees handles GET /api/employees. Password/PIN hashes are never
// serialized (models.Employee marks them json:"-").
func (d *Deps) ListEmployees(c *gin.Context) {
	rows, err := d.DB.Query(c.Request.Context(), `SELECT `+employeeColumns+` FROM employees ORDER BY name ASC`)
	if err != nil {
		httpx.Internal(c, "Failed to list employees")
		return
	}
	defer rows.Close()

	out := []models.Employee{}
	for rows.Next() {
		e, err := scanEmployee(rows)
		if err != nil {
			httpx.Internal(c, "Failed to read employee row")
			return
		}
		out = append(out, e)
	}
	httpx.OK(c, out)
}

// GetEmployee handles GET /api/employees/:id.
func (d *Deps) GetEmployee(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+employeeColumns+` FROM employees WHERE id = $1`, c.Param("id"))
	e, err := scanEmployee(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Employee not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load employee")
		return
	}
	httpx.OK(c, e)
}

// CreateEmployee handles POST /api/employees. A password is required for
// every new account; it is bcrypt-hashed before being written to the database.
func (d *Deps) CreateEmployee(c *gin.Context) {
	var in employeeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid employee payload: "+err.Error())
		return
	}
	if in.Password == nil || *in.Password == "" {
		httpx.BadRequest(c, "password is required to create an employee")
		return
	}
	if len(*in.Password) < 8 {
		httpx.BadRequest(c, "password must be at least 8 characters long")
		return
	}
	if in.Role == "" {
		in.Role = "staff"
	}
	if in.Permissions == nil {
		in.Permissions = []string{}
	}
	if err := validatePermissions(in.Permissions); err != nil {
		httpx.BadRequest(c, err.Error())
		return
	}

	passwordHash, err := auth.HashPassword(*in.Password)
	if err != nil {
		httpx.Internal(c, "Failed to hash password")
		return
	}
	var pinHash *string
	if in.Pin != nil && *in.Pin != "" {
		h, err := auth.HashPassword(*in.Pin)
		if err != nil {
			httpx.Internal(c, "Failed to hash PIN")
			return
		}
		pinHash = &h
	}

	id := in.ID
	if id == "" {
		id = uuid.NewString()
	}

	row := d.DB.QueryRow(c.Request.Context(),
		`INSERT INTO employees (id, name, desig, password_hash, phone, role, pin_hash, permissions)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING `+employeeColumns,
		id, in.Name, in.Desig, passwordHash, in.Phone, in.Role, pinHash, in.Permissions)
	e, err := scanEmployee(row)
	if err != nil {
		httpx.Conflict(c, "Failed to create employee (id may already exist): "+err.Error())
		return
	}
	httpx.Created(c, e)
}

// UpdateEmployee handles PUT /api/employees/:id. Password/PIN are only
// updated when supplied (non-empty); omitting them leaves the existing hash
// in place so this endpoint can also be used for profile-only edits.
func (d *Deps) UpdateEmployee(c *gin.Context) {
	var in employeeInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid employee payload: "+err.Error())
		return
	}
	if in.Role == "" {
		in.Role = "staff"
	}
	if in.Permissions == nil {
		in.Permissions = []string{}
	}
	if err := validatePermissions(in.Permissions); err != nil {
		httpx.BadRequest(c, err.Error())
		return
	}
	if in.Password != nil && *in.Password != "" && len(*in.Password) < 8 {
		httpx.BadRequest(c, "password must be at least 8 characters long")
		return
	}

	ctx := c.Request.Context()
	id := c.Param("id")

	// Guard against locking everyone out: refuse to demote the last admin.
	if in.Role != "admin" {
		var adminCount int
		if err := d.DB.QueryRow(ctx, `SELECT count(*) FROM employees WHERE role = 'admin' AND id != $1`, id).Scan(&adminCount); err != nil {
			httpx.Internal(c, "Failed to verify remaining admin accounts")
			return
		}
		var wasAdmin bool
		if err := d.DB.QueryRow(ctx, `SELECT role = 'admin' FROM employees WHERE id = $1`, id).Scan(&wasAdmin); err != nil {
			if errors.Is(err, pgx.ErrNoRows) {
				httpx.NotFound(c, "Employee not found")
				return
			}
			httpx.Internal(c, "Failed to load employee")
			return
		}
		if wasAdmin && adminCount == 0 {
			httpx.Conflict(c, "Cannot demote the last remaining administrator account")
			return
		}
	}

	if in.Password != nil && *in.Password != "" {
		passwordHash, err := auth.HashPassword(*in.Password)
		if err != nil {
			httpx.Internal(c, "Failed to hash password")
			return
		}
		if _, err := d.DB.Exec(ctx, `UPDATE employees SET password_hash = $2, updated_at = now() WHERE id = $1`, id, passwordHash); err != nil {
			httpx.Internal(c, "Failed to update password")
			return
		}
	}
	if in.Pin != nil && *in.Pin != "" {
		pinHash, err := auth.HashPassword(*in.Pin)
		if err != nil {
			httpx.Internal(c, "Failed to hash PIN")
			return
		}
		if _, err := d.DB.Exec(ctx, `UPDATE employees SET pin_hash = $2, updated_at = now() WHERE id = $1`, id, pinHash); err != nil {
			httpx.Internal(c, "Failed to update PIN")
			return
		}
	}

	row := d.DB.QueryRow(ctx,
		`UPDATE employees SET name = $2, desig = $3, phone = $4, role = $5, permissions = $6, updated_at = now()
		 WHERE id = $1 RETURNING `+employeeColumns,
		id, in.Name, in.Desig, in.Phone, in.Role, in.Permissions)
	e, err := scanEmployee(row)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Employee not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to update employee")
		return
	}
	httpx.OK(c, e)
}

// DeleteEmployee handles DELETE /api/employees/:id. Refuses to delete the
// last remaining admin account, and refuses self-deletion (an admin
// accidentally locking themselves out has no recovery path without DB access).
func (d *Deps) DeleteEmployee(c *gin.Context) {
	ctx := c.Request.Context()
	id := c.Param("id")

	if id == middleware.EmployeeID(c) {
		httpx.Conflict(c, "You cannot delete your own account while logged in as it")
		return
	}

	var wasAdmin bool
	err := d.DB.QueryRow(ctx, `SELECT role = 'admin' FROM employees WHERE id = $1`, id).Scan(&wasAdmin)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.NotFound(c, "Employee not found")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load employee")
		return
	}
	if wasAdmin {
		var adminCount int
		if err := d.DB.QueryRow(ctx, `SELECT count(*) FROM employees WHERE role = 'admin' AND id != $1`, id).Scan(&adminCount); err != nil {
			httpx.Internal(c, "Failed to verify remaining admin accounts")
			return
		}
		if adminCount == 0 {
			httpx.Conflict(c, "Cannot delete the last remaining administrator account")
			return
		}
	}

	tag, err := d.DB.Exec(ctx, `DELETE FROM employees WHERE id = $1`, id)
	if err != nil {
		httpx.Internal(c, "Failed to delete employee")
		return
	}
	if tag.RowsAffected() == 0 {
		httpx.NotFound(c, "Employee not found")
		return
	}
	httpx.NoContent(c)
}
