// Package backup implements the self-service S3-compatible offsite backup
// feature: operator-supplied endpoint/bucket/credentials, a scheduled
// pg_dump -> S3 upload -> download-back-and-checksum-verify pipeline,
// retention of only verified backups, and restore either from a verified S3
// backup or from a locally re-uploaded dump file.
package backup

import "time"

// Config is the operator's own S3-compatible backup destination. The secret
// access key is held here only in memory, in plaintext, for the duration of
// a single request/backup run — it is never logged and the database only
// ever stores its encrypted form (see internal/crypto).
type Config struct {
	Endpoint        string
	Bucket          string
	Region          string
	AccessKeyID     string
	SecretAccessKey string
	IntervalDays    int
	RetainCount     int
}

// ConfigStatus is what GET /api/backup/config returns — everything except
// the secret, plus whether one is configured at all.
type ConfigStatus struct {
	Configured   bool      `json:"configured"`
	Endpoint     string    `json:"endpoint,omitempty"`
	Bucket       string    `json:"bucket,omitempty"`
	Region       string    `json:"region,omitempty"`
	AccessKeyID  string    `json:"accessKeyId,omitempty"`
	IntervalDays int       `json:"intervalDays,omitempty"`
	RetainCount  int       `json:"retainCount,omitempty"`
	UpdatedAt    time.Time `json:"updatedAt,omitzero"`
}

// Record is one row of backup_history.
type Record struct {
	ID          string     `json:"id"`
	Source      string     `json:"source"` // "scheduled" | "manual"
	Status      string     `json:"status"` // "pending" | "verified" | "failed"
	S3Key       *string    `json:"s3Key,omitempty"`
	SizeBytes   *int64     `json:"sizeBytes,omitempty"`
	SHA256      *string    `json:"sha256,omitempty"`
	Error       *string    `json:"error,omitempty"`
	StartedAt   time.Time  `json:"startedAt"`
	CompletedAt *time.Time `json:"completedAt,omitempty"`
}
