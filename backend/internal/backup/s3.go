package backup

import (
	"context"
	"fmt"
	"io"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
)

// newS3Client builds an S3 client pointed at the operator's own
// S3-compatible endpoint (AWS S3 itself, Cloudflare R2, MinIO, RustFS,
// Backblaze B2, etc — anything speaking the S3 API). UsePathStyle is
// required for most non-AWS S3-compatible servers, which don't support
// virtual-hosted-style bucket addressing.
func newS3Client(cfg Config) *s3.Client {
	return s3.New(s3.Options{
		Region:       cfg.Region,
		Credentials:  credentials.NewStaticCredentialsProvider(cfg.AccessKeyID, cfg.SecretAccessKey, ""),
		BaseEndpoint: aws.String(cfg.Endpoint),
		UsePathStyle: true,
	})
}

func uploadToS3(ctx context.Context, cfg Config, key string, body io.Reader, size int64) error {
	client := newS3Client(cfg)
	_, err := client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:        aws.String(cfg.Bucket),
		Key:           aws.String(key),
		Body:          body,
		ContentLength: aws.Int64(size),
	})
	if err != nil {
		return fmt.Errorf("upload to s3: %w", err)
	}
	return nil
}

func downloadFromS3(ctx context.Context, cfg Config, key string) (io.ReadCloser, error) {
	client := newS3Client(cfg)
	out, err := client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: aws.String(cfg.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return nil, fmt.Errorf("download from s3: %w", err)
	}
	return out.Body, nil
}

func deleteFromS3(ctx context.Context, cfg Config, key string) error {
	client := newS3Client(cfg)
	_, err := client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(cfg.Bucket),
		Key:    aws.String(key),
	})
	if err != nil {
		return fmt.Errorf("delete from s3: %w", err)
	}
	return nil
}

// TestConnection verifies the given config can actually reach the bucket —
// used when an operator saves new backup config, so a typo in the
// endpoint/bucket/credentials is caught immediately rather than silently
// failing at the next scheduled backup.
func TestConnection(ctx context.Context, cfg Config) error {
	client := newS3Client(cfg)
	_, err := client.HeadBucket(ctx, &s3.HeadBucketInput{Bucket: aws.String(cfg.Bucket)})
	if err != nil {
		return fmt.Errorf("could not reach bucket %q at %q: %w", cfg.Bucket, cfg.Endpoint, err)
	}
	return nil
}
