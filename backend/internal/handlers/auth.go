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
	ID                 string   `json:"id"`
	Name               string   `json:"name"`
	Desig              string   `json:"desig"`
	Role               string   `json:"role"`
	Permissions        []string `json:"permissions"`
	MustChangePassword bool     `json:"mustChangePassword"`
}

type changePasswordRequest struct {
	CurrentPassword string `json:"currentPassword" binding:"required"`
	NewPassword     string `json:"newPassword" binding:"required"`
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
		SELECT id, name, desig, password_hash, role, permissions, must_change_password
		FROM employees
		WHERE id = $1 OR lower(name) = lower($1)
		LIMIT 1
	`
	var (
		id, name, desig, passwordHash, role string
		permissions                         []string
		mustChangePassword                  bool
	)
	err := d.DB.QueryRow(c.Request.Context(), q, req.Identifier).Scan(&id, &name, &desig, &passwordHash, &role, &permissions, &mustChangePassword)
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
			ID:                 id,
			Name:               name,
			Desig:              desig,
			Role:               role,
			Permissions:        permissions,
			MustChangePassword: mustChangePassword,
		},
	})
}

// ChangePassword handles PUT /api/auth/password — self-service, for the
// authenticated employee's own account only (identity comes from the JWT via
// middleware.EmployeeID, never from the request body). Requires the current
// password so a hijacked-but-not-yet-expired session token alone isn't
// enough to lock the real owner out. On success, clears must_change_password
// so a temporary password issued by an admin no longer forces this screen.
func (d *Deps) ChangePassword(c *gin.Context) {
	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "currentPassword and newPassword are required")
		return
	}
	if len(req.NewPassword) < 8 {
		httpx.BadRequest(c, "New password must be at least 8 characters long")
		return
	}

	ctx := c.Request.Context()
	employeeID := middleware.EmployeeID(c)

	var passwordHash string
	err := d.DB.QueryRow(ctx, `SELECT password_hash FROM employees WHERE id = $1`, employeeID).Scan(&passwordHash)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Unauthorized(c, "Employee account no longer exists")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load account")
		return
	}
	if !auth.VerifyPassword(passwordHash, req.CurrentPassword) {
		httpx.Unauthorized(c, "Current password is incorrect")
		return
	}

	newHash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		httpx.Internal(c, "Failed to hash password")
		return
	}
	if _, err := d.DB.Exec(ctx,
		`UPDATE employees SET password_hash = $2, must_change_password = false, updated_at = now() WHERE id = $1`,
		employeeID, newHash); err != nil {
		httpx.Internal(c, "Failed to update password")
		return
	}
	httpx.NoContent(c)
}

// Me handles GET /api/auth/me — returns the authenticated employee's current
// profile, re-read from the database (not just the JWT claims), so a revoked
// or edited permission set is reflected without waiting for token expiry.
func (d *Deps) Me(c *gin.Context) {
	employeeID := middleware.EmployeeID(c)

	const q = `SELECT id, name, desig, role, permissions, must_change_password FROM employees WHERE id = $1`
	var (
		id, name, desig, role string
		permissions           []string
		mustChangePassword    bool
	)
	err := d.DB.QueryRow(c.Request.Context(), q, employeeID).Scan(&id, &name, &desig, &role, &permissions, &mustChangePassword)
	if errors.Is(err, pgx.ErrNoRows) {
		httpx.Unauthorized(c, "Employee account no longer exists")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load current user")
		return
	}

	httpx.OK(c, currentUser{
		ID:                 id,
		Name:               name,
		Desig:              desig,
		Role:               role,
		Permissions:        permissions,
		MustChangePassword: mustChangePassword,
	})
}
