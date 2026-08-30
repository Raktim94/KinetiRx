package backup

import (
	"context"
	"log"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// StartScheduler checks once an hour whether a scheduled backup is due and
// runs one if so. Checking hourly rather than sleeping for IntervalDays
// directly means the schedule survives container restarts — an interval
// isn't lost or reset just because the process happened to restart partway
// through it, since "due" is always computed from the last verified
// backup's timestamp in the database, not from in-memory state.
func StartScheduler(ctx context.Context, pool *pgxpool.Pool, encKey []byte, databaseURL string) {
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()

	checkAndRun(ctx, pool, encKey, databaseURL)

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			checkAndRun(ctx, pool, encKey, databaseURL)
		}
	}
}

func checkAndRun(ctx context.Context, pool *pgxpool.Pool, encKey []byte, databaseURL string) {
	cfg, err := GetConfig(ctx, pool, encKey)
	if err != nil {
		if err != ErrNotConfigured {
			log.Printf("backup scheduler: could not load config: %v", err)
		}
		return
	}

	lastVerified, err := LastVerifiedCompletedAt(ctx, pool)
	if err != nil {
		log.Printf("backup scheduler: could not check last backup time: %v", err)
		return
	}

	due := lastVerified.IsZero() || time.Since(lastVerified) >= time.Duration(cfg.IntervalDays)*24*time.Hour
	if !due {
		return
	}

	log.Printf("backup scheduler: running scheduled backup (interval=%dd, last verified=%s)", cfg.IntervalDays, lastVerified)
	runCtx, cancel := context.WithTimeout(ctx, 30*time.Minute)
	defer cancel()
	if _, err := Run(runCtx, pool, *cfg, databaseURL, "scheduled"); err != nil {
		log.Printf("backup scheduler: scheduled backup failed: %v", err)
		return
	}
	log.Printf("backup scheduler: scheduled backup completed and verified")
}
