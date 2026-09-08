package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strings"

	"kinetirx/backend/internal/aiprovider"
)

// ErrAINotConfigured means neither an operator-supplied AI provider config
// (Settings -> AI OCR / Vision Model) nor the legacy GEMINI_API_KEY
// environment variable is set — callers should fall back to their own
// offline/on-device behavior.
var ErrAINotConfigured = errors.New("no AI provider configured")

// chatContentPart is one part of an OpenAI-style multi-part message content
// array — either a text part or an image part (base64 data URL).
type chatContentPart struct {
	Type     string        `json:"type"`
	Text     string        `json:"text,omitempty"`
	ImageURL *chatImageURL `json:"image_url,omitempty"`
}

type chatImageURL struct {
	URL string `json:"url"`
}

type chatMessage struct {
	Role    string            `json:"role"`
	Content []chatContentPart `json:"content"`
}

type chatCompletionRequest struct {
	Model          string                 `json:"model"`
	Messages       []chatMessage          `json:"messages"`
	Temperature    float64                `json:"temperature"`
	MaxTokens      int                    `json:"max_tokens,omitempty"`
	ResponseFormat map[string]interface{} `json:"response_format,omitempty"`
}

type chatCompletionResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
	Error *struct {
		Message string `json:"message"`
	} `json:"error,omitempty"`
}

// callChatCompletion sends a single OpenAI-compatible chat-completions
// request to the operator's configured endpoint (cfg.BaseURL + api key) and
// returns the first choice's message content. Works against any endpoint
// that speaks this API shape: Gemini's own OpenAI-compat endpoint, OpenAI
// itself, OpenRouter, Groq, a local Ollama vision model, etc. — not just
// Google's native Gemini API (see callGemini in gemini.go for that legacy,
// zero-configuration GEMINI_API_KEY path, kept as-is for back-compat).
func (d *Deps) callChatCompletion(ctx context.Context, cfg aiprovider.Config, systemAndUserText string, imageBase64, imageMimeType string, jsonMode bool) (string, error) {
	parts := []chatContentPart{{Type: "text", Text: systemAndUserText}}
	if imageBase64 != "" {
		dataURL := imageBase64
		if !strings.HasPrefix(dataURL, "data:") {
			mime := imageMimeType
			if mime == "" {
				mime = "image/jpeg"
			}
			dataURL = fmt.Sprintf("data:%s;base64,%s", mime, imageBase64)
		}
		parts = append(parts, chatContentPart{Type: "image_url", ImageURL: &chatImageURL{URL: dataURL}})
	}

	req := chatCompletionRequest{
		Model:       cfg.Model,
		Messages:    []chatMessage{{Role: "user", Content: parts}},
		Temperature: 0.1,
	}
	if jsonMode {
		req.ResponseFormat = map[string]interface{}{"type": "json_object"}
	}

	body, err := json.Marshal(req)
	if err != nil {
		return "", fmt.Errorf("marshal chat completion request: %w", err)
	}

	url := strings.TrimRight(cfg.BaseURL, "/") + "/chat/completions"
	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return "", fmt.Errorf("build chat completion request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+cfg.APIKey)

	resp, err := d.HTTPClient.Do(httpReq)
	if err != nil {
		return "", fmt.Errorf("call AI endpoint: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read AI endpoint response: %w", err)
	}

	var parsed chatCompletionResponse
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		// Some OpenAI-compatible providers — confirmed for Gemini's own
		// OpenAI-compat endpoint — wrap an error response in a JSON array
		// instead of the bare object every other part of this API returns.
		// Try that shape before giving up, so a bad key/model/quota error
		// still surfaces the provider's actual message below instead of a
		// raw unmarshal failure.
		var arr []chatCompletionResponse
		if arrErr := json.Unmarshal(respBody, &arr); arrErr == nil && len(arr) > 0 {
			parsed = arr[0]
		} else {
			// Not JSON at all — almost always means the Base URL points at a
			// documentation page or website rather than the actual API
			// endpoint (e.g. pasting https://ai.google.dev/gemini-api/docs/openai
			// instead of https://generativelanguage.googleapis.com/v1beta/openai).
			snippet := string(respBody)
			if len(snippet) > 200 {
				snippet = snippet[:200] + "…"
			}
			return "", fmt.Errorf("endpoint did not return JSON (got: %q) — double-check the Base URL is the actual API endpoint, not a documentation or website link", snippet)
		}
	}
	if resp.StatusCode != http.StatusOK {
		if parsed.Error != nil {
			return "", fmt.Errorf("AI endpoint error (%d): %s", resp.StatusCode, parsed.Error.Message)
		}
		return "", fmt.Errorf("AI endpoint error: status %d", resp.StatusCode)
	}
	if len(parsed.Choices) == 0 {
		return "", fmt.Errorf("AI endpoint returned no choices")
	}
	return parsed.Choices[0].Message.Content, nil
}

// runAIPrompt resolves and calls whichever AI backend is actually
// configured on this deployment, in priority order:
//  1. An operator-supplied provider (Settings -> AI OCR / Vision Model,
//     stored in ai_provider_config) — any OpenAI-compatible endpoint.
//  2. The legacy GEMINI_API_KEY environment variable — Google's native
//     Gemini REST API, kept exactly as it worked before this config store
//     existed, so an existing deployment that only ever set the env var
//     keeps working unchanged.
//
// Returns ErrAINotConfigured when neither is set, so callers (OCR bill
// scanning, the clinical assistant) can fall back to their own
// offline/on-device behavior exactly as before.
func (d *Deps) runAIPrompt(ctx context.Context, promptText, imageBase64, imageMimeType string, jsonMode bool) (string, error) {
	if cfg, err := aiprovider.GetConfig(ctx, d.DB, d.BackupEncryptionKey); err == nil {
		return d.callChatCompletion(ctx, *cfg, promptText, imageBase64, imageMimeType, jsonMode)
	} else if !errors.Is(err, aiprovider.ErrNotConfigured) {
		// A real store/decryption error (not just "unconfigured") — log it
		// and still fall through to the env-var path rather than hard-failing
		// the whole request over a config-store issue the operator may not
		// even be aware of.
		log.Printf("ai provider config: %v", err)
	}

	if d.GeminiAPIKey == "" {
		return "", ErrAINotConfigured
	}

	contents := []geminiContent{{Role: "user", Parts: []geminiPart{{Text: promptText}}}}
	if imageBase64 != "" {
		mime := imageMimeType
		if mime == "" {
			mime = "image/jpeg"
		}
		contents[0].Parts = append(contents[0].Parts, geminiPart{
			InlineData: &geminiInlineData{MimeType: mime, Data: dataURLPrefix.ReplaceAllString(imageBase64, "")},
		})
	}
	genConfig := geminiGenerationConfig{Temperature: 0.1}
	if jsonMode {
		genConfig.ResponseMimeType = "application/json"
	}
	return d.callGemini(ctx, geminiRequest{Contents: contents, GenerationConfig: genConfig})
}
