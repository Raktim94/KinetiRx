package handlers

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"

	"kinetirx/backend/internal/httpx"
)

// EventsStream handles GET /api/events/stream — a Server-Sent Events feed
// that tells every other connected browser tab which resource just changed,
// so a second cashier/pharmacist/director counter can refetch it and stay
// live-synced without polling. It never streams row data, only a resource
// name, so a client can only ever pull data it was already authorized to
// read through the normal REST endpoint for that resource.
//
// This route is intentionally NOT behind the shared Authenticate middleware:
// the browser's native EventSource API cannot set an Authorization header,
// so the access token travels as a query parameter instead (a well-known,
// narrowly-scoped exception for SSE/EventSource endpoints). The token is
// still fully verified below with the same JWT issuer as every other route —
// this only changes where the token is read from, not whether it's checked.
func (d *Deps) EventsStream(c *gin.Context) {
	token := c.Query("token")
	if token == "" {
		if h := c.GetHeader("Authorization"); strings.HasPrefix(h, "Bearer ") {
			token = strings.TrimPrefix(h, "Bearer ")
		}
	}
	if token == "" {
		httpx.Unauthorized(c, "Missing access token")
		return
	}
	if _, err := d.Tokens.VerifyAccessToken(token); err != nil {
		httpx.Unauthorized(c, "Invalid or expired access token")
		return
	}

	flusher, ok := c.Writer.(http.Flusher)
	if !ok {
		httpx.Internal(c, "Streaming unsupported")
		return
	}

	ch, cancel := d.Events.Subscribe()
	defer cancel()

	c.Header("Content-Type", "text/event-stream")
	c.Header("Cache-Control", "no-cache")
	c.Header("Connection", "keep-alive")
	c.Header("X-Accel-Buffering", "no") // disable nginx response buffering for this route
	c.Writer.WriteHeader(http.StatusOK)
	flusher.Flush()

	heartbeat := time.NewTicker(25 * time.Second)
	defer heartbeat.Stop()

	ctx := c.Request.Context()
	for {
		select {
		case <-ctx.Done():
			return
		case ev, open := <-ch:
			if !open {
				return
			}
			fmt.Fprintf(c.Writer, "data: {\"resource\":%q}\n\n", ev.Resource)
			flusher.Flush()
		case <-heartbeat.C:
			fmt.Fprint(c.Writer, ": ping\n\n")
			flusher.Flush()
		}
	}
}
