package middleware

import (
	"sync"
	"time"

	"github.com/gin-gonic/gin"

	"kinetirx/backend/internal/httpx"
)

// RateLimit is a minimal fixed-window per-IP rate limiter — enough to blunt
// credential-stuffing / brute-force attempts against a single self-hosted
// instance without pulling in a dependency or an external store (Redis etc.)
// this app otherwise has no need for. Not suitable for a multi-instance
// deployment (each instance would track its own window), which matches how
// KinetiRx is actually deployed (single container per pharmacy).
func RateLimit(maxRequests int, window time.Duration) gin.HandlerFunc {
	type bucket struct {
		count       int
		windowStart time.Time
	}

	var (
		mu      sync.Mutex
		buckets = map[string]*bucket{}
	)

	return func(c *gin.Context) {
		key := c.ClientIP()
		now := time.Now()

		mu.Lock()
		b, ok := buckets[key]
		if !ok || now.Sub(b.windowStart) >= window {
			b = &bucket{count: 0, windowStart: now}
			buckets[key] = b
		}
		b.count++
		blocked := b.count > maxRequests
		mu.Unlock()

		if blocked {
			httpx.Error(c, 429, "rate_limited", "Too many attempts — please wait a moment and try again")
			c.Abort()
			return
		}
		c.Next()
	}
}
