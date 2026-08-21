// Package seed provisions the initial admin employee on first boot.
package seed

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5/pgxpool"

	"kinetirx/backend/internal/auth"
	"kinetirx/backend/internal/models"
)

// adminEmployeeID is fixed and predictable (mirroring the old prototype's
// 'EMP-ADMIN-1') so operators can reliably reference the seeded account.
const adminEmployeeID = "EMP-ADMIN-1"

// SeedAdminIfEmpty seeds exactly one admin employee ("Master Admin", role
// admin, every permission) when the employees table is empty. The password
// is bcrypt-hashed before storage; the plaintext is never logged or persisted
// anywhere else. Returns (seeded=true, err=nil) if it created the account.
func SeedAdminIfEmpty(ctx context.Context, pool *pgxpool.Pool, plaintextPassword string) (bool, error) {
	var count int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM employees`).Scan(&count); err != nil {
		return false, fmt.Errorf("count employees: %w", err)
	}
	if count > 0 {
		return false, nil
	}

	passwordHash, err := auth.HashPassword(plaintextPassword)
	if err != nil {
		return false, fmt.Errorf("hash admin password: %w", err)
	}

	permissions := make([]string, len(models.AllTabTypes))
	for i, t := range models.AllTabTypes {
		permissions[i] = string(t)
	}

	_, err = pool.Exec(ctx, `
		INSERT INTO employees (id, name, desig, password_hash, phone, role, permissions)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`, adminEmployeeID, "Master Admin", "Director & Admin", passwordHash, nil, "admin", permissions)
	if err != nil {
		return false, fmt.Errorf("insert seed admin: %w", err)
	}

	return true, nil
}
