// Package config loads and validates process configuration from environment
// variables. All configuration is 12-factor: no config files, no hardcoded
// secrets or defaults for anything security-sensitive.
package config

import (
	"fmt"
	"os"
	"time"
)

// Config holds all runtime configuration for the KinetiRx backend.
type Config struct {
	// Port the HTTP server listens on.
	Port string
	// DatabaseURL is a Postgres connection string (e.g. postgres://user:pass@host:5432/db?sslmode=disable).
	DatabaseURL string
	// JWTSecret signs and verifies access tokens. Must be a long random string in production.
	JWTSecret string
	// JWTAccessTokenTTL is how long an issued access token remains valid.
	JWTAccessTokenTTL time.Duration
	// GeminiAPIKey is optional; when unset, AI endpoints return a fallback response instead of erroring.
	GeminiAPIKey string
	// AdminBootstrapPassword is required on first boot to seed the initial admin employee.
	// It is only consulted when the employees table is empty; once seeded it is never read again.
	AdminBootstrapPassword string
	// AllowedOrigins is the list of origins permitted by CORS for browser clients.
	AllowedOrigins []string
	// GinMode controls gin's run mode ("release" in production).
	GinMode string
}

// Load reads configuration from the environment and validates required values.
// It returns an error (rather than panicking) so callers can fail startup loudly
// with a clear message.
func Load() (*Config, error) {
	cfg := &Config{
		Port:                   getEnvDefault("PORT", "8080"),
		DatabaseURL:            os.Getenv("DATABASE_URL"),
		JWTSecret:              os.Getenv("JWT_SECRET"),
		GeminiAPIKey:           os.Getenv("GEMINI_API_KEY"),
		AdminBootstrapPassword: os.Getenv("KINETIRX_ADMIN_PASSWORD"),
		GinMode:                getEnvDefault("GIN_MODE", "release"),
		JWTAccessTokenTTL:      12 * time.Hour,
	}

	origins := getEnvDefault("ALLOWED_ORIGINS", "http://localhost:5173,http://localhost:3000")
	cfg.AllowedOrigins = splitAndTrim(origins)

	var missing []string
	if cfg.DatabaseURL == "" {
		missing = append(missing, "DATABASE_URL")
	}
	if cfg.JWTSecret == "" {
		missing = append(missing, "JWT_SECRET")
	} else if len(cfg.JWTSecret) < 16 {
		return nil, fmt.Errorf("JWT_SECRET must be at least 16 characters long (got %d)", len(cfg.JWTSecret))
	}
	if len(missing) > 0 {
		return nil, fmt.Errorf("missing required environment variable(s): %v", missing)
	}

	return cfg, nil
}

// ValidatedAdminBootstrapPassword returns KINETIRX_ADMIN_PASSWORD, validated,
// for env-based first-boot seeding — or ("", nil) if it's unset, in which
// case the operator sets up the admin account from the UI instead (see
// POST /api/auth/setup). Only errors when a value was actually supplied but
// is too short, since that's a real misconfiguration worth failing loudly on.
func (c *Config) ValidatedAdminBootstrapPassword() (string, error) {
	if c.AdminBootstrapPassword == "" {
		return "", nil
	}
	if len(c.AdminBootstrapPassword) < 8 {
		return "", fmt.Errorf("KINETIRX_ADMIN_PASSWORD must be at least 8 characters long")
	}
	return c.AdminBootstrapPassword, nil
}

func getEnvDefault(key, def string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return def
}

func splitAndTrim(s string) []string {
	var out []string
	start := 0
	for i := 0; i <= len(s); i++ {
		if i == len(s) || s[i] == ',' {
			part := trimSpace(s[start:i])
			if part != "" {
				out = append(out, part)
			}
			start = i + 1
		}
	}
	return out
}

func trimSpace(s string) string {
	i, j := 0, len(s)
	for i < j && (s[i] == ' ' || s[i] == '\t') {
		i++
	}
	for j > i && (s[j-1] == ' ' || s[j-1] == '\t') {
		j--
	}
	return s[i:j]
}
