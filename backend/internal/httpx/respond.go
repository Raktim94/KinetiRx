// Package httpx provides a consistent JSON response envelope for the whole
// API: every non-2xx response has the same shape (type, title, status,
// optional field errors, request_id) so frontend error handling stays uniform.
package httpx

import (
	"github.com/gin-gonic/gin"
)

// FieldError describes one invalid request field.
type FieldError struct {
	Field   string `json:"field"`
	Message string `json:"message"`
}

// ErrorBody is the standard error envelope returned on every non-2xx response.
type ErrorBody struct {
	Type      string       `json:"type"`
	Title     string       `json:"title"`
	Status    int          `json:"status"`
	Errors    []FieldError `json:"errors,omitempty"`
	RequestID string       `json:"request_id,omitempty"`
}

// Error aborts the request with a standard error envelope.
func Error(c *gin.Context, status int, errType, title string, fieldErrors ...FieldError) {
	requestID, _ := c.Get("request_id")
	rid, _ := requestID.(string)
	c.AbortWithStatusJSON(status, ErrorBody{
		Type:      errType,
		Title:     title,
		Status:    status,
		Errors:    fieldErrors,
		RequestID: rid,
	})
}

// BadRequest responds 400 with a validation_error envelope.
func BadRequest(c *gin.Context, title string, fieldErrors ...FieldError) {
	Error(c, 400, "validation_error", title, fieldErrors...)
}

// Unauthorized responds 401.
func Unauthorized(c *gin.Context, title string) {
	Error(c, 401, "unauthorized", title)
}

// Forbidden responds 403.
func Forbidden(c *gin.Context, title string) {
	Error(c, 403, "forbidden", title)
}

// NotFound responds 404.
func NotFound(c *gin.Context, title string) {
	Error(c, 404, "not_found", title)
}

// Conflict responds 409.
func Conflict(c *gin.Context, title string) {
	Error(c, 409, "conflict", title)
}

// Internal responds 500 without leaking internal error details.
func Internal(c *gin.Context, title string) {
	Error(c, 500, "internal_error", title)
}

// OK responds 200 with the given payload.
func OK(c *gin.Context, payload interface{}) {
	c.JSON(200, payload)
}

// Created responds 201 with the given payload.
func Created(c *gin.Context, payload interface{}) {
	c.JSON(201, payload)
}

// NoContent responds 204.
func NoContent(c *gin.Context) {
	c.Status(204)
}
