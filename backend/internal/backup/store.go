package backup

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"kinetirx/backend/internal/crypto"
)

// ErrNotConfigured means no backup_config row exists yet.
var ErrNotConfigured = errors.New("backup destination not configured")

// GetConfig loads the operator's S3 config and decrypts the secret key.
// Requires encKey — callers that only need ConfigStatus (no secret) should
// use GetConfigStatus instead, which never touches the key at all.
func GetConfig(ctx context.Context, pool *pgxpool.Pool, encKey []byte) (*Config, error) {
	var cfg Config
	var cipherText []byte
	row := pool.QueryRow(ctx,
		`SELECT endpoint, bucket, region, access_key_id, secret_access_key_cipher, interval_days, retain_count
		 FROM backup_config WHERE id = true`)
	if err := row.Scan(&cfg.Endpoint, &cfg.Bucket, &cfg.Region, &cfg.AccessKeyID, &cipherText, &cfg.IntervalDays, &cfg.RetainCount); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotConfigured
		}
		return nil, fmt.Errorf("load backup config: %w", err)
	}
	secret, err := crypto.Decrypt(encKey, cipherText)
	if err != nil {
		return nil, fmt.Errorf("decrypt backup secret: %w", err)
	}
	cfg.SecretAccessKey = secret
	return &cfg, nil
}

// GetConfigStatus loads everything except the secret — safe to return
// directly in an API response.
func GetConfigStatus(ctx context.Context, pool *pgxpool.Pool) (*ConfigStatus, error) {
	var s ConfigStatus
	row := pool.QueryRow(ctx,
		`SELECT endpoint, bucket, region, access_key_id, interval_days, retain_count, updated_at
		 FROM backup_config WHERE id = true`)
	if err := row.Scan(&s.Endpoint, &s.Bucket, &s.Region, &s.AccessKeyID, &s.IntervalDays, &s.RetainCount, &s.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &ConfigStatus{Configured: false}, nil
		}
		return nil, fmt.Errorf("load backup config status: %w", err)
	}
	s.Configured = true
	return &s, nil
}

// SaveConfig upserts the singleton backup_config row, encrypting the secret
// before it ever reaches the database.
func SaveConfig(ctx context.Context, pool *pgxpool.Pool, encKey []byte, cfg Config) error {
	cipherText, err := crypto.Encrypt(encKey, cfg.SecretAccessKey)
	if err != nil {
		return fmt.Errorf("encrypt backup secret: %w", err)
	}
	_, err = pool.Exec(ctx, `
		INSERT INTO backup_config (id, endpoint, bucket, region, access_key_id, secret_access_key_cipher, interval_days, retain_count, updated_at)
		VALUES (true, $1, $2, $3, $4, $5, $6, $7, now())
		ON CONFLICT (id) DO UPDATE SET
			endpoint = EXCLUDED.endpoint, bucket = EXCLUDED.bucket, region = EXCLUDED.region,
			access_key_id = EXCLUDED.access_key_id, secret_access_key_cipher = EXCLUDED.secret_access_key_cipher,
			interval_days = EXCLUDED.interval_days, retain_count = EXCLUDED.retain_count, updated_at = now()`,
		cfg.Endpoint, cfg.Bucket, cfg.Region, cfg.AccessKeyID, cipherText, cfg.IntervalDays, cfg.RetainCount,
	)
	if err != nil {
		return fmt.Errorf("save backup config: %w", err)
	}
	return nil
}

// DeleteConfig removes the backup destination (does not touch backup_history).
func DeleteConfig(ctx context.Context, pool *pgxpool.Pool) error {
	_, err := pool.Exec(ctx, `DELETE FROM backup_config WHERE id = true`)
	if err != nil {
		return fmt.Errorf("delete backup config: %w", err)
	}
	return nil
}

// ListHistory returns backup attempts, most recent first.
func ListHistory(ctx context.Context, pool *pgxpool.Pool, limit int) ([]Record, error) {
	rows, err := pool.Query(ctx,
		`SELECT id, source, status, s3_key, size_bytes, sha256, error, started_at, completed_at
		 FROM backup_history ORDER BY started_at DESC LIMIT $1`, limit)
	if err != nil {
		return nil, fmt.Errorf("list backup history: %w", err)
	}
	defer rows.Close()

	var out []Record
	for rows.Next() {
		var r Record
		if err := rows.Scan(&r.ID, &r.Source, &r.Status, &r.S3Key, &r.SizeBytes, &r.SHA256, &r.Error, &r.StartedAt, &r.CompletedAt); err != nil {
			return nil, fmt.Errorf("scan backup history row: %w", err)
		}
		out = append(out, r)
	}
	return out, nil
}

// GetHistoryRecord fetches one backup_history row by id.
func GetHistoryRecord(ctx context.Context, pool *pgxpool.Pool, id string) (*Record, error) {
	var r Record
	row := pool.QueryRow(ctx,
		`SELECT id, source, status, s3_key, size_bytes, sha256, error, started_at, completed_at
		 FROM backup_history WHERE id = $1`, id)
	if err := row.Scan(&r.ID, &r.Source, &r.Status, &r.S3Key, &r.SizeBytes, &r.SHA256, &r.Error, &r.StartedAt, &r.CompletedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("load backup record: %w", err)
	}
	return &r, nil
}

// LastVerifiedCompletedAt returns when the most recent verified backup
// finished, or the zero time if none exists yet — used by the scheduler to
// decide whether an interval has elapsed.
func LastVerifiedCompletedAt(ctx context.Context, pool *pgxpool.Pool) (time.Time, error) {
	var t *time.Time
	row := pool.QueryRow(ctx, `SELECT completed_at FROM backup_history WHERE status = 'verified' ORDER BY completed_at DESC LIMIT 1`)
	if err := row.Scan(&t); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return time.Time{}, nil
		}
		return time.Time{}, fmt.Errorf("load last verified backup time: %w", err)
	}
	if t == nil {
		return time.Time{}, nil
	}
	return *t, nil
}
