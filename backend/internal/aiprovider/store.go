package aiprovider

import (
	"context"
	"errors"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kinetirx/backend/internal/crypto"
)

// ErrNotConfigured means no ai_provider_config row exists yet.
var ErrNotConfigured = errors.New("AI provider not configured")

// GetConfig loads the operator's AI provider config and decrypts the key.
// Callers that only need ConfigStatus (no key) should use GetConfigStatus
// instead, which never touches the key at all.
func GetConfig(ctx context.Context, pool *pgxpool.Pool, encKey []byte) (*Config, error) {
	var cfg Config
	var cipherText []byte
	row := pool.QueryRow(ctx, `SELECT base_url, model, api_key_cipher FROM ai_provider_config WHERE id = true`)
	if err := row.Scan(&cfg.BaseURL, &cfg.Model, &cipherText); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotConfigured
		}
		return nil, fmt.Errorf("load AI provider config: %w", err)
	}
	apiKey, err := crypto.Decrypt(encKey, cipherText)
	if err != nil {
		return nil, fmt.Errorf("decrypt AI provider key: %w", err)
	}
	cfg.APIKey = apiKey
	return &cfg, nil
}

// GetConfigStatus loads everything except the key — safe to return directly
// in an API response.
func GetConfigStatus(ctx context.Context, pool *pgxpool.Pool) (*ConfigStatus, error) {
	var s ConfigStatus
	row := pool.QueryRow(ctx, `SELECT base_url, model, updated_at FROM ai_provider_config WHERE id = true`)
	if err := row.Scan(&s.BaseURL, &s.Model, &s.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &ConfigStatus{Configured: false}, nil
		}
		return nil, fmt.Errorf("load AI provider config status: %w", err)
	}
	s.Configured = true
	return &s, nil
}

// SaveConfig upserts the singleton ai_provider_config row, encrypting the key
// before it ever reaches the database.
func SaveConfig(ctx context.Context, pool *pgxpool.Pool, encKey []byte, cfg Config) error {
	cipherText, err := crypto.Encrypt(encKey, cfg.APIKey)
	if err != nil {
		return fmt.Errorf("encrypt AI provider key: %w", err)
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO ai_provider_config (id, base_url, model, api_key_cipher, updated_at)
		VALUES (true, $1, $2, $3, now())
		ON CONFLICT (id) DO UPDATE SET
			base_url = EXCLUDED.base_url, model = EXCLUDED.model,
			api_key_cipher = EXCLUDED.api_key_cipher, updated_at = now()`,
		cfg.BaseURL, cfg.Model, cipherText,
	)
	if err != nil {
		return fmt.Errorf("save AI provider config: %w", err)
	}
	return nil
}

// DeleteConfig removes the AI provider config, reverting to the
// GEMINI_API_KEY environment-variable fallback (if set) or offline mode.
func DeleteConfig(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `DELETE FROM ai_provider_config WHERE id = true`)
	if err != nil {
		return fmt.Errorf("delete AI provider config: %w", err)
	}
	return nil
}
