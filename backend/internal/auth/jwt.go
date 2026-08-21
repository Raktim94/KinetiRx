package auth

import (
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// ErrInvalidToken is returned for any token that fails signature, expiry, or
// claim-shape validation. Callers should treat all such failures identically
// (401) rather than distinguishing reasons, to avoid leaking validation details.
var ErrInvalidToken = errors.New("invalid or expired token")

// Claims is the JWT payload for an authenticated employee session.
type Claims struct {
	EmployeeID  string   `json:"eid"`
	Name        string   `json:"name"`
	Role        string   `json:"role"`
	Permissions []string `json:"permissions"`
	jwt.RegisteredClaims
}

// TokenIssuer issues and verifies signed JWT access tokens.
type TokenIssuer struct {
	secret []byte
	ttl    time.Duration
}

// NewTokenIssuer builds a TokenIssuer from the configured JWT secret and TTL.
func NewTokenIssuer(secret string, ttl time.Duration) *TokenIssuer {
	return &TokenIssuer{secret: []byte(secret), ttl: ttl}
}

// IssueAccessToken creates a signed JWT for the given employee.
func (t *TokenIssuer) IssueAccessToken(employeeID, name, role string, permissions []string) (string, time.Time, error) {
	now := time.Now().UTC()
	expiresAt := now.Add(t.ttl)
	claims := Claims{
		EmployeeID:  employeeID,
		Name:        name,
		Role:        role,
		Permissions: permissions,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   employeeID,
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			Issuer:    "kinetirx-backend",
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	signed, err := token.SignedString(t.secret)
	if err != nil {
		return "", time.Time{}, fmt.Errorf("sign token: %w", err)
	}
	return signed, expiresAt, nil
}

// VerifyAccessToken validates the signature and expiry of a token string and
// returns its claims. It explicitly rejects the "none" algorithm and any
// algorithm other than HS256.
func (t *TokenIssuer) VerifyAccessToken(tokenString string) (*Claims, error) {
	claims := &Claims{}
	token, err := jwt.ParseWithClaims(tokenString, claims, func(tok *jwt.Token) (interface{}, error) {
		if _, ok := tok.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, ErrInvalidToken
		}
		return t.secret, nil
	}, jwt.WithValidMethods([]string{"HS256"}))
	if err != nil || !token.Valid {
		return nil, ErrInvalidToken
	}
	return claims, nil
}
