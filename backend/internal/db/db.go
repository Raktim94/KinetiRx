// Package db manages the Postgres connection pool and applies SQL migrations
// at startup. Migrations are plain .sql files under backend/migrations,
// named following golang-migrate conventions (NNNN_name.up.sql / .down.sql),
// applied in order and tracked in a schema_migrations table.
package db

import (
	"context"
	"fmt"
	"io/fs"
	"log"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Connect opens a pooled connection to Postgres and verifies it is reachable.
func Connect(ctx context.Context, databaseURL string) (*pgxpool.Pool, error) {
	cfg, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("parse DATABASE_URL: %w", err)
	}
	cfg.MaxConns = 20
	cfg.MinConns = 1
	cfg.MaxConnLifetime = time.Hour
	cfg.MaxConnIdleTime = 30 * time.Minute
	cfg.HealthCheckPeriod = time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, fmt.Errorf("create connection pool: %w", err)
	}

	pingCtx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()
	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("ping database: %w", err)
	}

	return pool, nil
}

type migrationFile struct {
	version int
	name    string
	upSQL   string
}

// Migrate applies every un-applied *.up.sql migration in migrationsDir, in
// ascending version order, inside its own transaction, tracking applied
// versions in a schema_migrations table.
func Migrate(ctx context.Context, pool *pgxpool.Pool, migrationsDir fs.FS) error {
	if _, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version     INTEGER PRIMARY KEY,
			name        TEXT NOT NULL,
			applied_at  TIMESTAMPTZ NOT NULL DEFAULT now()
		)
	`); err != nil {
		return fmt.Errorf("create schema_migrations table: %w", err)
	}

	entries, err := fs.ReadDir(migrationsDir, ".")
	if err != nil {
		return fmt.Errorf("read migrations dir: %w", err)
	}

	var migrations []migrationFile
	for _, e := range entries {
		if e.IsDir() || !strings.HasSuffix(e.Name(), ".up.sql") {
			continue
		}
		base := strings.TrimSuffix(e.Name(), ".up.sql")
		parts := strings.SplitN(base, "_", 2)
		if len(parts) != 2 {
			continue
		}
		version, err := strconv.Atoi(parts[0])
		if err != nil {
			continue
		}
		content, err := fs.ReadFile(migrationsDir, e.Name())
		if err != nil {
			return fmt.Errorf("read migration %s: %w", e.Name(), err)
		}
		migrations = append(migrations, migrationFile{version: version, name: parts[1], upSQL: string(content)})
	}

	sort.Slice(migrations, func(i, j int) bool { return migrations[i].version < migrations[j].version })

	appliedRows, err := pool.Query(ctx, `SELECT version FROM schema_migrations`)
	if err != nil {
		return fmt.Errorf("query applied migrations: %w", err)
	}
	applied := map[int]bool{}
	for appliedRows.Next() {
		var v int
		if err := appliedRows.Scan(&v); err != nil {
			appliedRows.Close()
			return fmt.Errorf("scan applied migration version: %w", err)
		}
		applied[v] = true
	}
	appliedRows.Close()

	for _, m := range migrations {
		if applied[m.version] {
			continue
		}
		log.Printf("db: applying migration %04d_%s", m.version, m.name)
		tx, err := pool.Begin(ctx)
		if err != nil {
			return fmt.Errorf("begin tx for migration %d: %w", m.version, err)
		}
		if _, err := tx.Exec(ctx, m.upSQL); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("apply migration %04d_%s: %w", m.version, m.name, err)
		}
		if _, err := tx.Exec(ctx, `INSERT INTO schema_migrations (version, name) VALUES ($1, $2)`, m.version, m.name); err != nil {
			tx.Rollback(ctx)
			return fmt.Errorf("record migration %04d_%s: %w", m.version, m.name, err)
		}
		if err := tx.Commit(ctx); err != nil {
			return fmt.Errorf("commit migration %04d_%s: %w", m.version, m.name, err)
		}
	}

	return nil
}
