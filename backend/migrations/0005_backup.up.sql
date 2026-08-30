-- ---------------------------------------------------------------------------
-- backup_config: a single-row table holding the operator's own S3-compatible
-- offsite backup destination (endpoint, bucket, credentials, schedule). The
-- operator types these in themselves from Settings — nothing here is ever
-- pre-filled or hardcoded by the application. secret_access_key is stored
-- AES-256-GCM encrypted (see internal/security) keyed off the
-- BACKUP_ENCRYPTION_KEY environment variable, never in plaintext, and is
-- never included in any GET response — handlers only ever return whether a
-- secret is configured, never its value.
--
-- backup_history: one row per backup attempt (scheduled or manual), tracking
-- verification status so retention only ever counts backups that were
-- actually confirmed restorable (downloaded back and checksum-compared),
-- never a backup that merely "finished uploading".
-- ---------------------------------------------------------------------------

CREATE TABLE backup_config (
    id                       BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
    endpoint                 TEXT NOT NULL,
    bucket                   TEXT NOT NULL,
    region                   TEXT NOT NULL DEFAULT 'auto',
    access_key_id            TEXT NOT NULL,
    secret_access_key_cipher BYTEA NOT NULL,
    interval_days            INTEGER NOT NULL DEFAULT 3 CHECK (interval_days BETWEEN 1 AND 30),
    retain_count             INTEGER NOT NULL DEFAULT 5 CHECK (retain_count BETWEEN 1 AND 30),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE backup_history (
    id           TEXT PRIMARY KEY,
    source       TEXT NOT NULL CHECK (source IN ('scheduled', 'manual')),
    status       TEXT NOT NULL CHECK (status IN ('pending', 'verified', 'failed')),
    s3_key       TEXT,
    size_bytes   BIGINT,
    sha256       TEXT,
    error        TEXT,
    started_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX backup_history_status_completed_idx ON backup_history (status, completed_at DESC);
