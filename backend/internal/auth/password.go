// Package auth provides password hashing and JWT issuance/verification for
// the KinetiRx backend. No plaintext password or PIN is ever stored or logged.
package auth

import "golang.org/x/crypto/bcrypt"

// bcryptCost is deliberately above the minimum recommended cost (10) to raise
// the cost of offline brute-force attempts while staying fast enough for
// interactive login on modest hardware.
const bcryptCost = 12

// HashPassword bcrypt-hashes a plaintext password/PIN for storage.
func HashPassword(plaintext string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(plaintext), bcryptCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// VerifyPassword reports whether plaintext matches the given bcrypt hash.
func VerifyPassword(hash, plaintext string) bool {
	if hash == "" {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(plaintext)) == nil
}
