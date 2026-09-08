package handlers

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	appaiprovider "kinetirx/backend/internal/aiprovider"
	"kinetirx/backend/internal/httpx"
)

// aiProviderConfigInput is what an operator submits from Settings to point
// bill scanning and the AI assistant at their own OpenAI-compatible
// endpoint — any provider that speaks the chat-completions API (Gemini's
// own OpenAI-compat endpoint, OpenAI, OpenRouter, Groq, a local Ollama
// vision model, etc.), not just Google's native Gemini API.
type aiProviderConfigInput struct {
	BaseURL string `json:"baseUrl" binding:"required"`
	Model   string `json:"model" binding:"required"`
	APIKey  string `json:"apiKey" binding:"required"`
}

func (d *Deps) requireSecretsEncryptionKey(c *gin.Context) bool {
	if len(d.BackupEncryptionKey) == 0 {
		httpx.Error(c, http.StatusPreconditionFailed, "not_configured",
			"Saving a key from Settings isn't available on this deployment yet — set BACKUP_ENCRYPTION_KEY (32 random bytes, e.g. `openssl rand -hex 32`) as a server environment variable and restart the backend, then try again. (The same key also protects S3 backup credentials, if configured.)")
		return false
	}
	return true
}

// GetAIProviderConfig handles GET /api/ai-config — returns everything about
// the configured provider except the key itself.
func (d *Deps) GetAIProviderConfig(c *gin.Context) {
	status, err := appaiprovider.GetConfigStatus(c.Request.Context(), d.DB)
	if err != nil {
		httpx.Internal(c, "Failed to load AI provider configuration")
		return
	}
	httpx.OK(c, status)
}

// PutAIProviderConfig handles POST /api/ai-config. Tests the endpoint with a
// minimal request before saving so a typo in the URL/model/key is caught
// immediately rather than at the next bill scan.
func (d *Deps) PutAIProviderConfig(c *gin.Context) {
	if !d.requireSecretsEncryptionKey(c) {
		return
	}
	var in aiProviderConfigInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid AI provider config payload: "+err.Error())
		return
	}

	cfg := appaiprovider.Config{
		BaseURL: strings.TrimRight(strings.TrimSpace(in.BaseURL), "/"),
		Model:   strings.TrimSpace(in.Model),
		APIKey:  strings.TrimSpace(in.APIKey),
	}

	testCtx, cancel := context.WithTimeout(c.Request.Context(), 20*time.Second)
	defer cancel()
	if _, err := d.callChatCompletion(testCtx, cfg, "Reply with the single word: OK", "", "", false); err != nil {
		httpx.BadRequest(c, "Could not reach this endpoint with these details: "+err.Error())
		return
	}

	if err := appaiprovider.SaveConfig(c.Request.Context(), d.DB, d.BackupEncryptionKey, cfg); err != nil {
		httpx.Internal(c, "Failed to save AI provider configuration")
		return
	}

	status, err := appaiprovider.GetConfigStatus(c.Request.Context(), d.DB)
	if err != nil {
		httpx.Internal(c, "Saved, but failed to reload AI provider configuration")
		return
	}
	httpx.OK(c, status)
}

// DeleteAIProviderConfig handles DELETE /api/ai-config — reverts to the
// legacy GEMINI_API_KEY environment variable (if set) or offline mode.
func (d *Deps) DeleteAIProviderConfig(c *gin.Context) {
	if err := appaiprovider.DeleteConfig(c.Request.Context(), d.DB); err != nil {
		httpx.Internal(c, "Failed to remove AI provider configuration")
		return
	}
	httpx.NoContent(c)
}
