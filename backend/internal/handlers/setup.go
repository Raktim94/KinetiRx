package handlers

import (
	"github.com/gin-gonic/gin"

	"kinetirx/backend/internal/auth"
	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type setupStatusResponse struct {
	NeedsSetup bool `json:"needsSetup"`
}

// SetupStatus handles GET /api/auth/setup-status — public. Tells the
// frontend whether to show the first-run "Create Admin Account" screen
// instead of the normal login form.
func (d *Deps) SetupStatus(c *gin.Context) {
	var count int
	if err := d.DB.QueryRow(c.Request.Context(), `SELECT count(*) FROM employees`).Scan(&count); err != nil {
		httpx.Internal(c, "Failed to check setup status")
		return
	}
	httpx.OK(c, setupStatusResponse{NeedsSetup: count == 0})
}

type setupRequest struct {
	Name     string `json:"name" binding:"required"`
	Password string `json:"password" binding:"required"`
}

// Setup handles POST /api/auth/setup — public, but only succeeds once: it
// creates the first admin account (id EMP-ADMIN-1, role admin, every
// permission) and immediately logs them in. Once any employee row exists
// this always 409s. This is the UI-driven alternative to setting
// KINETIRX_ADMIN_PASSWORD before first boot (see cmd/server/main.go) — an
// operator who didn't set that env var gets this screen instead of a
// backend that refuses to start.
func (d *Deps) Setup(c *gin.Context) {
	var req setupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "name and password are required")
		return
	}
	if len(req.Password) < 8 {
		httpx.BadRequest(c, "password must be at least 8 characters long")
		return
	}

	var count int
	if err := d.DB.QueryRow(c.Request.Context(), `SELECT count(*) FROM employees`).Scan(&count); err != nil {
		httpx.Internal(c, "Failed to check setup status")
		return
	}
	if count > 0 {
		httpx.Conflict(c, "Setup has already been completed — log in instead")
		return
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		httpx.Internal(c, "Failed to hash password")
		return
	}

	permissions := make([]string, len(models.AllTabTypes))
	for i, t := range models.AllTabTypes {
		permissions[i] = string(t)
	}

	const (
		id    = "EMP-ADMIN-1"
		desig = "Director & Admin"
	)
	_, err = d.DB.Exec(c.Request.Context(), `
		INSERT INTO employees (id, name, desig, password_hash, phone, role, permissions)
		VALUES ($1, $2, $3, $4, $5, 'admin', $6)
	`, id, req.Name, desig, passwordHash, nil, permissions)
	if err != nil {
		// Narrow race: another request's setup call won this exact instant
		// (the count check above isn't a lock). Negligible in practice —
		// this endpoint is only ever hit meaningfully once per instance.
		httpx.Internal(c, "Failed to create admin account")
		return
	}

	token, expiresAt, err := d.Tokens.IssueAccessToken(id, req.Name, "admin", permissions)
	if err != nil {
		httpx.Internal(c, "Account created, but failed to issue access token — please log in")
		return
	}

	httpx.Created(c, loginResponse{
		AccessToken: token,
		ExpiresAt:   expiresAt.UTC().Format("2006-01-02T15:04:05Z07:00"),
		User: currentUser{
			ID:          id,
			Name:        req.Name,
			Desig:       desig,
			Role:        "admin",
			Permissions: permissions,
		},
	})
}
