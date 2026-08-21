package main

import "strings"

// NoArgs is used as the input type for tools that take no parameters. The
// MCP SDK still needs a concrete type to infer an (empty) input schema.
type NoArgs struct{}

func boolPtr(b bool) *bool { return &b }

// containsFold reports whether substr appears in s, case-insensitively.
// Both empty and non-empty substr behave like strings.Contains would after
// lower-casing; an empty substr always matches.
func containsFold(s, substr string) bool {
	return strings.Contains(strings.ToLower(s), strings.ToLower(substr))
}

func derefStr(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}

func derefFloat(f *float64) float64 {
	if f == nil {
		return 0
	}
	return *f
}
