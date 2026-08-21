// Package handlers implements the KinetiRx REST API: authentication and full
// CRUD (or singleton GET/PUT, as appropriate) for every pharmacy entity, plus
// the Gemini-backed OCR and AI-assistant endpoints.
package handlers

import (
	"net/http"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"kinetirx/backend/internal/auth"
)

// Deps bundles the shared dependencies every handler needs: the database
// pool, the JWT issuer, and configuration for the Gemini-backed AI endpoints.
type Deps struct {
	DB           *pgxpool.Pool
	Tokens       *auth.TokenIssuer
	GeminiAPIKey string
	HTTPClient   *http.Client
}

// NewDeps builds a Deps with a sane default HTTP client (bounded timeout —
// outbound calls to Gemini must never hang a request indefinitely).
func NewDeps(db *pgxpool.Pool, tokens *auth.TokenIssuer, geminiAPIKey string) *Deps {
	return &Deps{
		DB:           db,
		Tokens:       tokens,
		GeminiAPIKey: geminiAPIKey,
		HTTPClient:   &http.Client{Timeout: 60 * time.Second},
	}
}
