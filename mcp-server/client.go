package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

// Config holds everything needed to talk to a live KinetiRx backend.
type Config struct {
	// BaseURL is the backend's base URL, e.g. "http://localhost:8080" — no
	// trailing slash, no "/api" suffix (that's added per-request).
	BaseURL string
	// Identifier/Password are employee login credentials used against
	// POST /api/auth/login (identifier matches an employee's id OR name,
	// case-insensitive — see backend/API.md). Required for the client to be
	// able to log in itself and to re-login after a 401 / token expiry.
	Identifier string
	Password   string
	// StaticToken, if set, seeds the client with an already-issued JWT
	// instead of requiring a login at startup. Useful for handing the MCP
	// server a short-lived token minted out-of-band. Because the KinetiRx
	// backend has no refresh-token endpoint (tokens simply expire after 12h,
	// per API.md), a StaticToken with no Identifier/Password configured
	// cannot be renewed once it expires — the server will start returning
	// authentication errors from every tool until restarted with a fresh
	// token or given real credentials.
	StaticToken string
	Timeout     time.Duration
}

// apiError mirrors the KinetiRx backend's standard non-2xx error envelope
// (see "Conventions" in backend/API.md).
type apiError struct {
	Type   string `json:"type"`
	Title  string `json:"title"`
	Status int    `json:"status"`
	Errors []struct {
		Field   string `json:"field"`
		Message string `json:"message"`
	} `json:"errors,omitempty"`
	RequestID string `json:"request_id,omitempty"`
}

func (e *apiError) Error() string {
	var b strings.Builder
	fmt.Fprintf(&b, "kinetirx api error: %s (type=%s, status=%d)", e.Title, e.Type, e.Status)
	for _, fe := range e.Errors {
		fmt.Fprintf(&b, "; %s: %s", fe.Field, fe.Message)
	}
	return b.String()
}

func decodeAPIError(status int, data []byte) error {
	var ae apiError
	if err := json.Unmarshal(data, &ae); err == nil && ae.Title != "" {
		return &ae
	}
	return fmt.Errorf("kinetirx api returned unexpected status %d: %s", status, strings.TrimSpace(string(data)))
}

// Client is a thin, authenticated HTTP client over the KinetiRx REST API. It
// is not a reimplementation of any backend business logic — every tool
// handler built on top of it just shapes a request/response around one or
// more real endpoint calls.
type Client struct {
	cfg Config
	hc  *http.Client

	mu          sync.Mutex
	token       string
	tokenExpiry time.Time
}

// NewClient constructs a Client. It does not perform any network I/O —
// call Login (or let the first tool call trigger a lazy login) to actually
// authenticate.
func NewClient(cfg Config) *Client {
	if cfg.Timeout <= 0 {
		cfg.Timeout = 20 * time.Second
	}
	return &Client{
		cfg:   cfg,
		hc:    &http.Client{Timeout: cfg.Timeout},
		token: cfg.StaticToken,
	}
}

func (c *Client) hasCredentials() bool {
	return c.cfg.Identifier != "" && c.cfg.Password != ""
}

// Login performs POST /api/auth/login and caches the resulting JWT + its
// expiry. Safe to call concurrently; safe to call repeatedly (e.g. to force
// a fresh token after a 401).
func (c *Client) Login(ctx context.Context) error {
	if !c.hasCredentials() {
		return fmt.Errorf("cannot log in to KinetiRx: KINETIRX_MCP_USERNAME/KINETIRX_MCP_PASSWORD are not configured")
	}

	body, err := json.Marshal(map[string]string{
		"identifier": c.cfg.Identifier,
		"password":   c.cfg.Password,
	})
	if err != nil {
		return err
	}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.cfg.BaseURL+"/api/auth/login", bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.hc.Do(req)
	if err != nil {
		return fmt.Errorf("login request to KinetiRx failed: %w", err)
	}
	defer resp.Body.Close()
	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("failed to read login response: %w", err)
	}
	if resp.StatusCode != http.StatusOK {
		return decodeAPIError(resp.StatusCode, data)
	}

	var out struct {
		AccessToken string `json:"accessToken"`
		ExpiresAt   string `json:"expiresAt"`
	}
	if err := json.Unmarshal(data, &out); err != nil {
		return fmt.Errorf("failed to parse login response: %w", err)
	}
	if out.AccessToken == "" {
		return fmt.Errorf("login response did not include an accessToken")
	}

	expiry, err := time.Parse(time.RFC3339, out.ExpiresAt)
	if err != nil {
		// Backend access tokens are documented to last 12h; fall back to a
		// conservative estimate rather than failing login outright.
		expiry = time.Now().Add(11 * time.Hour)
	}

	c.mu.Lock()
	c.token = out.AccessToken
	c.tokenExpiry = expiry
	c.mu.Unlock()
	return nil
}

// ensureToken makes sure the client holds a token that isn't (about to be)
// expired, logging in if necessary.
func (c *Client) ensureToken(ctx context.Context) error {
	c.mu.Lock()
	tok := c.token
	exp := c.tokenExpiry
	c.mu.Unlock()

	if tok != "" && (exp.IsZero() || time.Now().Before(exp.Add(-30*time.Second))) {
		return nil
	}
	return c.Login(ctx)
}

// request performs one authenticated call against the KinetiRx API and
// decodes a JSON response body into out (if non-nil). On a 401 it forces a
// fresh login (when credentials are available) and retries exactly once,
// which is what lets the server outlive a single 12h token without operator
// intervention.
func (c *Client) request(ctx context.Context, method, path string, query url.Values, body any, out any) error {
	if err := c.ensureToken(ctx); err != nil {
		return err
	}

	send := func() (status int, data []byte, err error) {
		var reader io.Reader
		if body != nil {
			b, merr := json.Marshal(body)
			if merr != nil {
				return 0, nil, merr
			}
			reader = bytes.NewReader(b)
		}
		u := c.cfg.BaseURL + path
		if len(query) > 0 {
			u += "?" + query.Encode()
		}
		req, rerr := http.NewRequestWithContext(ctx, method, u, reader)
		if rerr != nil {
			return 0, nil, rerr
		}
		if body != nil {
			req.Header.Set("Content-Type", "application/json")
		}
		c.mu.Lock()
		tok := c.token
		c.mu.Unlock()
		req.Header.Set("Authorization", "Bearer "+tok)

		resp, derr := c.hc.Do(req)
		if derr != nil {
			return 0, nil, fmt.Errorf("request %s %s failed: %w", method, path, derr)
		}
		defer resp.Body.Close()
		data, rerr = io.ReadAll(resp.Body)
		if rerr != nil {
			return 0, nil, fmt.Errorf("failed to read response body from %s %s: %w", method, path, rerr)
		}
		return resp.StatusCode, data, nil
	}

	status, data, err := send()
	if err != nil {
		return err
	}
	if status == http.StatusUnauthorized {
		if !c.hasCredentials() {
			return decodeAPIError(status, data)
		}
		if loginErr := c.Login(ctx); loginErr != nil {
			return fmt.Errorf("received 401 and re-login failed: %w", loginErr)
		}
		status, data, err = send()
		if err != nil {
			return err
		}
	}
	if status < 200 || status >= 300 {
		return decodeAPIError(status, data)
	}
	if out != nil && len(data) > 0 {
		if err := json.Unmarshal(data, out); err != nil {
			return fmt.Errorf("failed to parse response from %s %s: %w", method, path, err)
		}
	}
	return nil
}

func (c *Client) get(ctx context.Context, path string, query url.Values, out any) error {
	return c.request(ctx, http.MethodGet, path, query, nil, out)
}

func (c *Client) post(ctx context.Context, path string, body any, out any) error {
	return c.request(ctx, http.MethodPost, path, nil, body, out)
}
