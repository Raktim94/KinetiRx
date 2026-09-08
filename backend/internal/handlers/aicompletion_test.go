package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"kinetirx/backend/internal/aiprovider"
)

func TestCallChatCompletion_ArrayWrappedError(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte(`[{"error":{"code":400,"message":"Please pass a valid API key","status":"INVALID_ARGUMENT"}}]`))
	}))
	defer srv.Close()

	d := &Deps{HTTPClient: &http.Client{Timeout: 5 * time.Second}}
	_, err := d.callChatCompletion(context.Background(), aiprovider.Config{BaseURL: srv.URL, Model: "m", APIKey: "bad"}, "hi", "", "", false)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "Please pass a valid API key") {
		t.Fatalf("expected provider's real message surfaced, got: %v", err)
	}
}

func TestCallChatCompletion_HTMLResponse(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte(`<!doctype html><html><head><title>Not Found</title></head><body>404</body></html>`))
	}))
	defer srv.Close()

	d := &Deps{HTTPClient: &http.Client{Timeout: 5 * time.Second}}
	_, err := d.callChatCompletion(context.Background(), aiprovider.Config{BaseURL: srv.URL, Model: "m", APIKey: "k"}, "hi", "", "", false)
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !strings.Contains(err.Error(), "documentation or website link") {
		t.Fatalf("expected actionable HTML-response hint, got: %v", err)
	}
}
