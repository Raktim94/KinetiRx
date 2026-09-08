// Package aiprovider implements the operator's self-service OpenAI-compatible
// AI vision endpoint config: a base URL, model name, and API key, entered
// from Settings, used for accurate AI-vision purchase-bill OCR and the
// clinical AI assistant instead of the zero-configuration GEMINI_API_KEY
// fallback (see internal/handlers/aicompletion.go).
package aiprovider

import "time"

// Config is the operator's own OpenAI-compatible AI endpoint. The API key is
// held here only in memory, in plaintext, for the duration of a single
// request — the database only ever stores its encrypted form (see
// internal/crypto).
type Config struct {
	BaseURL string
	Model   string
	APIKey  string
}

// ConfigStatus is what GET /api/ai-config returns — everything except the
// key, plus whether one is configured at all.
type ConfigStatus struct {
	Configured bool      `json:"configured"`
	BaseURL    string    `json:"baseUrl,omitempty"`
	Model      string    `json:"model,omitempty"`
	UpdatedAt  time.Time `json:"updatedAt,omitzero"`
}
