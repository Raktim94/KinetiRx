package handlers

import (
	"time"

	"github.com/gin-gonic/gin"
)

// Health handles GET /api/health — the only route reachable without a JWT.
func (d *Deps) Health(c *gin.Context) {
	c.JSON(200, gin.H{
		"status":    "ok",
		"timestamp": time.Now().UTC().Format(time.RFC3339),
	})
}
