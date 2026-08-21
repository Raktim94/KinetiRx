// Command server is the KinetiRx / Pharma Care Pro backend entrypoint. It
// loads configuration, connects to Postgres, applies migrations, seeds the
// initial admin account on first boot, and serves the REST API.
package main

import (
	"context"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"runtime"
	"syscall"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"kinetirx/backend/internal/auth"
	"kinetirx/backend/internal/config"
	"kinetirx/backend/internal/db"
	"kinetirx/backend/internal/handlers"
	"kinetirx/backend/internal/middleware"
	"kinetirx/backend/internal/seed"
)

func main() {
	// Load a local .env for convenience in development. In production, real
	// environment variables (set by the deployment platform / Docker) take
	// precedence and this is a harmless no-op if no .env file exists.
	_ = godotenv.Load()

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("startup: invalid configuration: %v", err)
	}

	gin.SetMode(cfg.GinMode)

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	pool, err := db.Connect(ctx, cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("startup: failed to connect to database: %v", err)
	}
	defer pool.Close()

	migrationsDir := locateMigrationsDir()
	if err := db.Migrate(ctx, pool, os.DirFS(migrationsDir)); err != nil {
		log.Fatalf("startup: failed to apply migrations: %v", err)
	}

	var employeeCount int
	if err := pool.QueryRow(ctx, `SELECT count(*) FROM employees`).Scan(&employeeCount); err != nil {
		log.Fatalf("startup: failed to check employee count: %v", err)
	}
	if employeeCount == 0 {
		adminPassword, err := cfg.RequireAdminBootstrapPassword()
		if err != nil {
			log.Fatalf("startup: %v", err)
		}
		seeded, err := seed.SeedAdminIfEmpty(ctx, pool, adminPassword)
		if err != nil {
			log.Fatalf("startup: failed to seed admin account: %v", err)
		}
		if seeded {
			log.Println("startup: seeded initial admin employee 'Master Admin' (id=EMP-ADMIN-1)")
		}
	}

	tokens := auth.NewTokenIssuer(cfg.JWTSecret, cfg.JWTAccessTokenTTL)
	deps := handlers.NewDeps(pool, tokens, cfg.GeminiAPIKey)
	if cfg.GeminiAPIKey == "" {
		log.Println("startup: GEMINI_API_KEY not set — /api/ocr/parse-bill and /api/ai/ask will return fallback responses")
	}

	router := gin.New()
	router.Use(gin.Recovery())
	router.Use(middleware.RequestID())
	router.Use(middleware.StructuredLogger())
	router.Use(middleware.SecurityHeaders())
	router.Use(middleware.CORS(cfg.AllowedOrigins))

	handlers.RegisterRoutes(router, deps)

	srv := &http.Server{
		Addr:              ":" + cfg.Port,
		Handler:           router,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		WriteTimeout:      60 * time.Second, // generous enough for the Gemini OCR/AI round-trip
		IdleTimeout:       120 * time.Second,
	}

	go func() {
		log.Printf("KinetiRx backend listening on :%s", cfg.Port)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("server: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("shutdown: signal received, draining in-flight requests...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("shutdown: forced to close: %v", err)
	}
	log.Println("shutdown: complete")
}

// locateMigrationsDir resolves the migrations directory relative to this
// source file at compile time, so `go run ./cmd/server` and the compiled
// binary both find it regardless of the process's working directory — except
// in the Docker image, where MIGRATIONS_DIR is set explicitly (see Dockerfile).
func locateMigrationsDir() string {
	if v := os.Getenv("MIGRATIONS_DIR"); v != "" {
		return v
	}
	_, thisFile, _, ok := runtime.Caller(0)
	if !ok {
		return "migrations"
	}
	// cmd/server/main.go -> backend/
	return filepath.Join(filepath.Dir(thisFile), "..", "..", "migrations")
}
