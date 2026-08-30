// Package crypto provides AES-256-GCM encryption for secrets that must be
// stored at rest (currently: the S3 backup secret access key). The key comes
// from the BACKUP_ENCRYPTION_KEY environment variable, never from the
// database — the whole point is that reading the database alone (a backup
// dump, a compromised DB credential) is not enough to recover the plaintext
// secret.
package crypto

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
)

// KeySize is the required length, in bytes, of the encryption key.
const KeySize = 32 // AES-256

// ParseKeyHex decodes a hex-encoded 32-byte key (e.g. from `openssl rand -hex 32`).
func ParseKeyHex(hexKey string) ([]byte, error) {
	if hexKey == "" {
		return nil, nil
	}
	key, err := hex.DecodeString(hexKey)
	if err != nil {
		return nil, fmt.Errorf("BACKUP_ENCRYPTION_KEY must be hex-encoded: %w", err)
	}
	if len(key) != KeySize {
		return nil, fmt.Errorf("BACKUP_ENCRYPTION_KEY must decode to exactly %d bytes (got %d) — generate one with `openssl rand -hex 32`", KeySize, len(key))
	}
	return key, nil
}

// Encrypt seals plaintext with AES-256-GCM under key, returning
// nonce||ciphertext||tag as a single byte slice suitable for storage.
func Encrypt(key []byte, plaintext string) ([]byte, error) {
	if len(key) != KeySize {
		return nil, errors.New("encryption key not configured (set BACKUP_ENCRYPTION_KEY)")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, fmt.Errorf("init cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, fmt.Errorf("init GCM: %w", err)
	}
	nonce := make([]byte, gcm.NonceSize())
	if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
		return nil, fmt.Errorf("generate nonce: %w", err)
	}
	return gcm.Seal(nonce, nonce, []byte(plaintext), nil), nil
}

// Decrypt reverses Encrypt.
func Decrypt(key []byte, sealed []byte) (string, error) {
	if len(key) != KeySize {
		return "", errors.New("encryption key not configured (set BACKUP_ENCRYPTION_KEY)")
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return "", fmt.Errorf("init cipher: %w", err)
	}
	gcm, err := cipher.NewGCM(block)
	if err != nil {
		return "", fmt.Errorf("init GCM: %w", err)
	}
	nonceSize := gcm.NonceSize()
	if len(sealed) < nonceSize {
		return "", errors.New("ciphertext too short")
	}
	nonce, ciphertext := sealed[:nonceSize], sealed[nonceSize:]
	plaintext, err := gcm.Open(nil, nonce, ciphertext, nil)
	if err != nil {
		return "", fmt.Errorf("decrypt (wrong key, or data tampered): %w", err)
	}
	return string(plaintext), nil
}
