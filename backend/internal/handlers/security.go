package handlers

import (
	"errors"
	"regexp"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5"

	"kinetirx/backend/internal/auth"
	"kinetirx/backend/internal/httpx"
)

var pinPattern = regexp.MustCompile(`^[0-9]{4,8}$`)

const (
	maxPinAttempts = 5
	pinLockWindow  = 15 * time.Minute
)

// masterPinStatusResponse never includes the hash — only whether one is set
// and, if the account is currently locked out, when it unlocks.
type masterPinStatusResponse struct {
	IsSet       bool    `json:"isSet"`
	LockedUntil *string `json:"lockedUntil,omitempty"`
}

// GetMasterPinStatus handles GET /api/security/master-pin.
func (d *Deps) GetMasterPinStatus(c *gin.Context) {
	var (
		hash        *string
		lockedUntil *time.Time
	)
	err := d.DB.QueryRow(c.Request.Context(),
		`SELECT master_pin_hash, locked_until FROM security_settings WHERE id = true`).Scan(&hash, &lockedUntil)
	if err != nil {
		httpx.Internal(c, "Failed to load security settings")
		return
	}
	resp := masterPinStatusResponse{IsSet: hash != nil}
	if lockedUntil != nil && lockedUntil.After(time.Now()) {
		s := lockedUntil.UTC().Format(time.RFC3339)
		resp.LockedUntil = &s
	}
	httpx.OK(c, resp)
}

type setMasterPinRequest struct {
	CurrentPin string `json:"currentPin"`
	NewPin     string `json:"newPin" binding:"required"`
}

// SetMasterPin handles PUT /api/security/master-pin — admin-only. If a PIN
// is already set, the correct current one must be supplied to rotate it, so
// a hijacked-but-still-admin session can't silently take over the second
// factor without knowing the existing secret.
func (d *Deps) SetMasterPin(c *gin.Context) {
	var req setMasterPinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "newPin is required")
		return
	}
	if !pinPattern.MatchString(req.NewPin) {
		httpx.BadRequest(c, "PIN must be 4 to 8 digits")
		return
	}

	ctx := c.Request.Context()
	var existingHash *string
	if err := d.DB.QueryRow(ctx, `SELECT master_pin_hash FROM security_settings WHERE id = true`).Scan(&existingHash); err != nil {
		httpx.Internal(c, "Failed to load security settings")
		return
	}
	if existingHash != nil {
		if req.CurrentPin == "" || !auth.VerifyPassword(*existingHash, req.CurrentPin) {
			httpx.Unauthorized(c, "Current Master PIN is incorrect")
			return
		}
	}

	newHash, err := auth.HashPassword(req.NewPin)
	if err != nil {
		httpx.Internal(c, "Failed to secure new PIN")
		return
	}
	if _, err := d.DB.Exec(ctx,
		`UPDATE security_settings SET master_pin_hash = $1, failed_attempts = 0, locked_until = NULL, updated_at = now() WHERE id = true`,
		newHash); err != nil {
		httpx.Internal(c, "Failed to save Master PIN")
		return
	}
	httpx.OK(c, masterPinStatusResponse{IsSet: true})
}

type verifyMasterPinRequest struct {
	Pin string `json:"pin" binding:"required"`
}

type verifyMasterPinResponse struct {
	Valid bool `json:"valid"`
}

// VerifyMasterPin handles POST /api/security/master-pin/verify. A 4-digit
// PIN only has 10,000 possible values, so this enforces a hard lockout after
// a handful of wrong attempts on top of the generic per-IP RateLimit already
// applied to this route in the router — defense in depth against brute force
// from either a single fast client or many slow ones.
func (d *Deps) VerifyMasterPin(c *gin.Context) {
	var req verifyMasterPinRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "pin is required")
		return
	}

	ctx := c.Request.Context()
	var (
		hash           *string
		failedAttempts int
		lockedUntil    *time.Time
	)
	err := d.DB.QueryRow(ctx,
		`SELECT master_pin_hash, failed_attempts, locked_until FROM security_settings WHERE id = true`,
	).Scan(&hash, &failedAttempts, &lockedUntil)
	if errors.Is(err, pgx.ErrNoRows) || hash == nil {
		httpx.BadRequest(c, "No Master PIN has been configured yet — set one in Invoice Settings first")
		return
	}
	if err != nil {
		httpx.Internal(c, "Failed to load security settings")
		return
	}

	if lockedUntil != nil && lockedUntil.After(time.Now()) {
		httpx.Error(c, 423, "locked", "Too many incorrect Master PIN attempts. Try again later.")
		return
	}

	if auth.VerifyPassword(*hash, req.Pin) {
		if _, err := d.DB.Exec(ctx,
			`UPDATE security_settings SET failed_attempts = 0, locked_until = NULL WHERE id = true`,
		); err != nil {
			httpx.Internal(c, "Failed to update security settings")
			return
		}
		httpx.OK(c, verifyMasterPinResponse{Valid: true})
		return
	}

	failedAttempts++
	var lockUntil *time.Time
	if failedAttempts >= maxPinAttempts {
		t := time.Now().Add(pinLockWindow)
		lockUntil = &t
		failedAttempts = 0
	}
	if _, err := d.DB.Exec(ctx,
		`UPDATE security_settings SET failed_attempts = $1, locked_until = $2 WHERE id = true`,
		failedAttempts, lockUntil,
	); err != nil {
		httpx.Internal(c, "Failed to update security settings")
		return
	}
	httpx.OK(c, verifyMasterPinResponse{Valid: false})
}
