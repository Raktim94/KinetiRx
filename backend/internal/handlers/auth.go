package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/auth"
	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/middleware"
)

type loginRequest struct {
	// Identifier matches either the employee's id or their name (case-insensitive).
	Identifier string `json:"identifier" binding:"required"`
	Password   string `json:"password" binding:"required"`
}

type loginResponse struct {
	AccessToken string      `json:"accessToken"`
	ExpiresAt   string      `json:"expiresAt"`
	User        currentUser `json:"user"`
}

type currentUser struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Desig       string   `json:"desig"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
}

// Login handles POST /api/auth/login. It never reveals whether the identifier
// or the password was wrong — both failure modes return the same 401 message,
// which prevents account enumeration.
func (d *Deps) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "identifier and password are required")
		return
	}

	const q = `
		SELECT id, name, desig, password_hash, role, permissions
		FROM employees
		WHERE id = $1 OR lower(name) = lower($1)
		LIMIT 1
	`
	var (
		id, name, desig, passwordHash, role string
		permissions                         []string
	)
	err := d.DB.QueryRow(c.Request.Context(), q, req.Identifier).Scan(&id, &name, &desig, &passwordHash, &role, &permissions)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Unauthorized(c, "Invalid credentials")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to look up employee")
		return
	}

	if !auth.VerifyPassword(passwordHash, req.Password) {
		httpx.Unauthorized(c, "Invalid credentials")
		return
	}

	token, expiresAt, err := d.Tokens.IssueAccessToken(id, name, role, permissions)
	if err != nil {
		httpx.Internal(c, "Failed to issue access token")
		return
	}

	httpx.OK(c, loginResponse{
		AccessToken: token,
		ExpiresAt:   expiresAt.UTC().Format("2006-01-02T15:04:05Z07:00"),
		User: currentUser{
			ID:          id,
			Name:        name,
			Desig:       desig,
			Role:        role,
			Permissions: permissions,
		},
	})
}

// Me handles GET /api/auth/me — returns the authenticated employee's current
// profile, re-read from the database (not just the JWT claims), so a revoked
// or edited permission set is reflected without waiting for token expiry.
func (d *Deps) Me(c *gin.Context) {
	employeeID := middleware.EmployeeID(c)

	const q = `SELECT id, name, desig, role, permissions FROM employees WHERE id = $1`
	var (
		id, name, desig, role string
		permissions           []string
	)
	err := d.DB.QueryRow(c.Request.Context(), q, employeeID).Scan(&id, &name, &desig, &role, &permissions)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Unauthorized(c, "Employee account no longer exists")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load current user")
		return
	}

	httpx.OK(c, currentUser{
		ID:          id,
		Name:        name,
		Desig:       desig,
		Role:        role,
		Permissions: permissions,
	})
}
