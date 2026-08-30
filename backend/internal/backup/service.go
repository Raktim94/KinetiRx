package backup

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"os"
	"os/exec"
	"path/filepath"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// dumpToFile shells out to pg_dump (must be present on PATH — the Docker
// runtime image installs postgresql16-client for exactly this) to produce a
// custom-format dump, which pg_restore can apply cleanly regardless of
// object creation order (it handles dependency ordering itself, unlike a
// plain SQL dump).
func dumpToFile(ctx context.Context, databaseURL, destPath string) error {
	cmd := exec.CommandContext(ctx, "pg_dump",
		"--format=custom",
		"--no-owner",
		"--no-privileges",
		"--file="+destPath,
		databaseURL,
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("pg_dump failed: %w: %s", err, string(output))
	}
	return nil
}

// restoreFromFile shells out to pg_restore. --clean --if-exists drops
// existing objects before recreating them, so the restore is idempotent
// against a database that already has this schema (the normal case: you're
// restoring INTO the live app database, not an empty one).
func restoreFromFile(ctx context.Context, databaseURL, srcPath string) error {
	cmd := exec.CommandContext(ctx, "pg_restore",
		"--clean",
		"--if-exists",
		"--no-owner",
		"--no-privileges",
		"--dbname="+databaseURL,
		srcPath,
	)
	output, err := cmd.CombinedOutput()
	if err != nil {
		return fmt.Errorf("pg_restore failed: %w: %s", err, string(output))
	}
	return nil
}

func sha256File(path string) (string, error) {
	f, err := os.Open(path)
	if err != nil {
		return "", err
	}
	defer f.Close()
	h := sha256.New()
	if _, err := io.Copy(h, f); err != nil {
		return "", err
	}
	return hex.EncodeToString(h.Sum(nil)), nil
}

// Run executes one full backup: dump -> upload -> download back and
// checksum-compare (verification — some S3-compatible servers can silently
// truncate or corrupt an upload, and a backup nobody has confirmed is
// restorable is not a backup) -> record the result -> enforce retention.
// Every step's outcome is recorded even on failure, so backup history always
// reflects what actually happened.
func Run(ctx context.Context, pool *pgxpool.Pool, cfg Config, databaseURL, source string) (*Record, error) {
	id := uuid.NewString()
	startedAt := time.Now()
	if _, err := pool.Exec(ctx,
		`INSERT INTO backup_history (id, source, status, started_at) VALUES ($1, $2, 'pending', $3)`,
		id, source, startedAt,
	); err != nil {
		return nil, fmt.Errorf("record backup start: %w", err)
	}

	rec, runErr := run(ctx, cfg, databaseURL, id)
	if runErr != nil {
		errMsg := runErr.Error()
		pool.Exec(ctx, //nolint:errcheck — best-effort failure record; the original error is what matters to the caller
			`UPDATE backup_history SET status = 'failed', error = $2, completed_at = now() WHERE id = $1`,
			id, errMsg,
		)
		return nil, runErr
	}

	completedAt := time.Now()
	if _, err := pool.Exec(ctx,
		`UPDATE backup_history SET status = 'verified', s3_key = $2, size_bytes = $3, sha256 = $4, completed_at = $5 WHERE id = $1`,
		id, rec.S3Key, rec.SizeBytes, rec.SHA256, completedAt,
	); err != nil {
		return nil, fmt.Errorf("record backup completion: %w", err)
	}

	result := &Record{ID: id, Source: source, Status: "verified", S3Key: &rec.S3Key, SizeBytes: &rec.SizeBytes,
		SHA256: &rec.SHA256, StartedAt: startedAt, CompletedAt: &completedAt}

	if err := enforceRetention(ctx, pool, cfg); err != nil {
		// Retention failing doesn't invalidate the backup that was just
		// verified — surface it as a log-worthy error to the caller without
		// discarding the successful result.
		return result, fmt.Errorf("backup succeeded but retention cleanup failed: %w", err)
	}

	return result, nil
}

type runResult struct {
	S3Key     string
	SizeBytes int64
	SHA256    string
}

func run(ctx context.Context, cfg Config, databaseURL, id string) (*runResult, error) {
	tmpDir, err := os.MkdirTemp("", "kinetirx-backup-")
	if err != nil {
		return nil, fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	dumpPath := filepath.Join(tmpDir, "db.dump")
	if err := dumpToFile(ctx, databaseURL, dumpPath); err != nil {
		return nil, err
	}

	info, err := os.Stat(dumpPath)
	if err != nil {
		return nil, fmt.Errorf("stat dump file: %w", err)
	}
	checksum, err := sha256File(dumpPath)
	if err != nil {
		return nil, fmt.Errorf("checksum dump file: %w", err)
	}

	key := fmt.Sprintf("kinetirx-backups/%s-%s.dump", time.Now().UTC().Format("20060102-150405"), id[:8])

	f, err := os.Open(dumpPath)
	if err != nil {
		return nil, fmt.Errorf("reopen dump file: %w", err)
	}
	defer f.Close()
	if err := uploadToS3(ctx, cfg, key, f, info.Size()); err != nil {
		return nil, err
	}

	// Verify: download the object back and compare checksums, rather than
	// trusting HEAD (some S3-compatible servers return spurious 403s on HEAD
	// for objects that GET can read fine).
	verifyPath := filepath.Join(tmpDir, "verify.dump")
	body, err := downloadFromS3(ctx, cfg, key)
	if err != nil {
		return nil, fmt.Errorf("verify (download): %w", err)
	}
	defer body.Close()
	vf, err := os.Create(verifyPath)
	if err != nil {
		return nil, fmt.Errorf("verify (create local copy): %w", err)
	}
	if _, err := io.Copy(vf, body); err != nil {
		vf.Close()
		return nil, fmt.Errorf("verify (copy download): %w", err)
	}
	vf.Close()

	verifyChecksum, err := sha256File(verifyPath)
	if err != nil {
		return nil, fmt.Errorf("verify (checksum downloaded copy): %w", err)
	}
	if verifyChecksum != checksum {
		// The uploaded object is unreliable — remove it rather than leaving a
		// corrupt backup in the bucket that a future restore might pick up.
		deleteFromS3(ctx, cfg, key) //nolint:errcheck — best-effort cleanup after a verification failure
		return nil, fmt.Errorf("uploaded backup failed verification: checksum mismatch (local %s, downloaded %s)", checksum, verifyChecksum)
	}

	return &runResult{S3Key: key, SizeBytes: info.Size(), SHA256: checksum}, nil
}

// enforceRetention keeps only the newest RetainCount verified backups,
// deleting older ones from both S3 and backup_history.
func enforceRetention(ctx context.Context, pool *pgxpool.Pool, cfg Config) error {
	rows, err := pool.Query(ctx,
		`SELECT id, s3_key FROM backup_history WHERE status = 'verified' ORDER BY completed_at DESC OFFSET $1`,
		cfg.RetainCount,
	)
	if err != nil {
		return fmt.Errorf("list backups beyond retention: %w", err)
	}
	type toDelete struct {
		id  string
		key string
	}
	var stale []toDelete
	for rows.Next() {
		var d toDelete
		if err := rows.Scan(&d.id, &d.key); err != nil {
			rows.Close()
			return fmt.Errorf("scan stale backup: %w", err)
		}
		stale = append(stale, d)
	}
	rows.Close()

	for _, d := range stale {
		if d.key != "" {
			if err := deleteFromS3(ctx, cfg, d.key); err != nil {
				return fmt.Errorf("delete stale backup %s from s3: %w", d.id, err)
			}
		}
		if _, err := pool.Exec(ctx, `DELETE FROM backup_history WHERE id = $1`, d.id); err != nil {
			return fmt.Errorf("delete stale backup record %s: %w", d.id, err)
		}
	}
	return nil
}

// RestoreFromS3 downloads the given verified backup and restores it into
// the live database, checksum-verifying the download before touching
// anything. Destructive — callers must gate this behind admin auth and an
// explicit typed confirmation from the operator.
func RestoreFromS3(ctx context.Context, cfg Config, databaseURL string, rec Record) error {
	if rec.S3Key == nil || *rec.S3Key == "" {
		return fmt.Errorf("backup record has no stored object key")
	}
	tmpDir, err := os.MkdirTemp("", "kinetirx-restore-")
	if err != nil {
		return fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	destPath := filepath.Join(tmpDir, "restore.dump")
	body, err := downloadFromS3(ctx, cfg, *rec.S3Key)
	if err != nil {
		return err
	}
	defer body.Close()
	f, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("create local file: %w", err)
	}
	if _, err := io.Copy(f, body); err != nil {
		f.Close()
		return fmt.Errorf("download backup: %w", err)
	}
	f.Close()

	if rec.SHA256 != nil && *rec.SHA256 != "" {
		checksum, err := sha256File(destPath)
		if err != nil {
			return fmt.Errorf("checksum downloaded backup: %w", err)
		}
		if checksum != *rec.SHA256 {
			return fmt.Errorf("downloaded backup failed checksum verification (expected %s, got %s) — refusing to restore", *rec.SHA256, checksum)
		}
	}

	return restoreFromFile(ctx, databaseURL, destPath)
}

// RestoreFromUpload restores from a dump file streamed in by the operator
// (e.g. one they previously downloaded via GET /api/backup/download).
func RestoreFromUpload(ctx context.Context, databaseURL string, uploaded io.Reader) error {
	tmpDir, err := os.MkdirTemp("", "kinetirx-restore-upload-")
	if err != nil {
		return fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	destPath := filepath.Join(tmpDir, "restore.dump")
	f, err := os.Create(destPath)
	if err != nil {
		return fmt.Errorf("create local file: %w", err)
	}
	if _, err := io.Copy(f, uploaded); err != nil {
		f.Close()
		return fmt.Errorf("save uploaded file: %w", err)
	}
	f.Close()

	return restoreFromFile(ctx, databaseURL, destPath)
}

// DumpForDownload runs a fresh pg_dump directly to w — used by
// GET /api/backup/download so "download a local backup" works even when no
// S3 destination is configured at all.
func DumpForDownload(ctx context.Context, databaseURL string, w io.Writer) error {
	tmpDir, err := os.MkdirTemp("", "kinetirx-local-dump-")
	if err != nil {
		return fmt.Errorf("create temp dir: %w", err)
	}
	defer os.RemoveAll(tmpDir)

	dumpPath := filepath.Join(tmpDir, "db.dump")
	if err := dumpToFile(ctx, databaseURL, dumpPath); err != nil {
		return err
	}
	f, err := os.Open(dumpPath)
	if err != nil {
		return fmt.Errorf("reopen dump file: %w", err)
	}
	defer f.Close()
	_, err = io.Copy(w, f)
	return err
}
