// Package middleware provides Gin middleware for request IDs, structured
// logging, CORS, JWT authentication, and per-route permission authorization.
package middleware

import (
	"log"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"kinetirx/backend/internal/auth"
	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

// RequestID assigns a unique request_id to every request and echoes it back
// in the X-Request-Id response header, so it can be correlated with logs and
// with the request_id embedded in error responses.
func RequestID() gin.HandlerFunc {
	return func(c *gin.Context) {
		id := c.GetHeader("X-Request-Id")
		if id == "" {
			id = uuid.NewString()
		}
		c.Set("request_id", id)
		c.Header("X-Request-Id", id)
		c.Next()
	}
}

// StructuredLogger logs one line per request with method, path, status,
// latency and request_id. It never logs request/response bodies, so secrets
// (passwords, tokens) supplied in JSON bodies are never written to logs.
func StructuredLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		latency := time.Since(start)
		requestID, _ := c.Get("request_id")
		log.Printf("request_id=%v method=%s path=%s status=%d latency=%s client_ip=%s",
			requestID, c.Request.Method, c.Request.URL.Path, c.Writer.Status(), latency, c.ClientIP())
	}
}

// CORS allows browser clients from the configured allowed origins to call
// this API with credentials/Authorization headers.
func CORS(allowedOrigins []string) gin.HandlerFunc {
	allowed := make(map[string]bool, len(allowedOrigins))
	for _, o := range allowedOrigins {
		allowed[o] = true
	}
	return func(c *gin.Context) {
		origin := c.GetHeader("Origin")
		if origin != "" && allowed[origin] {
			c.Header("Access-Control-Allow-Origin", origin)
			c.Header("Vary", "Origin")
			c.Header("Access-Control-Allow-Credentials", "true")
			c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
			c.Header("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Request-Id")
		}
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	}
}

// SecurityHeaders sets a conservative baseline of security headers on every
// response. This is a JSON API (no HTML rendered), so the CSP is locked down hard.
func SecurityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Content-Security-Policy", "default-src 'none'")
		c.Header("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		c.Next()
	}
}

const (
	ctxEmployeeID  = "employee_id"
	ctxRole        = "role"
	ctxPermissions = "permissions"
	ctxName        = "name"
)

// Authenticate requires a valid "Authorization: Bearer <jwt>" header on every
// route it guards. On success it stores the employee's identity, role and
// permissions in the request context for downstream handlers/authorization.
func Authenticate(issuer *auth.TokenIssuer) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" || !strings.HasPrefix(header, "Bearer ") {
			httpx.Unauthorized(c, "Missing or malformed Authorization header")
			return
		}
		tokenString := strings.TrimPrefix(header, "Bearer ")
		claims, err := issuer.VerifyAccessToken(tokenString)
		if err != nil {
			httpx.Unauthorized(c, "Invalid or expired access token")
			return
		}
		c.Set(ctxEmployeeID, claims.EmployeeID)
		c.Set(ctxRole, claims.Role)
		c.Set(ctxPermissions, claims.Permissions)
		c.Set(ctxName, claims.Name)
		c.Next()
	}
}

// EmployeeID returns the authenticated employee's ID from the request context.
func EmployeeID(c *gin.Context) string {
	v, _ := c.Get(ctxEmployeeID)
	s, _ := v.(string)
	return s
}

// Role returns the authenticated employee's role from the request context.
func Role(c *gin.Context) string {
	v, _ := c.Get(ctxRole)
	s, _ := v.(string)
	return s
}

// Permissions returns the authenticated employee's granted tab permissions.
func Permissions(c *gin.Context) []string {
	v, _ := c.Get(ctxPermissions)
	p, _ := v.([]string)
	return p
}

// RequirePermission authorizes the request only if the authenticated
// employee is an admin (implicit full access) or has the given tab in their
// permissions list. This must run after Authenticate. Authorization is
// enforced server-side here — never trust a client-side permission check.
func RequirePermission(tab models.TabType) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := Role(c)
		if role == "admin" {
			c.Next()
			return
		}
		perms := Permissions(c)
		for _, p := range perms {
			if p == string(tab) {
				c.Next()
				return
			}
		}
		httpx.Forbidden(c, "You do not have permission to access this resource")
	}
}

// RequireAdmin authorizes the request only if the authenticated employee has
// the admin role. Used for the most sensitive routes (employee management,
// system reset).
func RequireAdmin() gin.HandlerFunc {
	return func(c *gin.Context) {
		if Role(c) != "admin" {
			httpx.Forbidden(c, "Administrator access required")
			return
		}
		c.Next()
	}
}
