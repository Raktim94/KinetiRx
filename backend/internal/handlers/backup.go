package handlers

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"

	appbackup "kinetirx/backend/internal/backup"
	"kinetirx/backend/internal/httpx"
)

// backupConfigInput is what an operator submits from Settings to point the
// app at their own S3-compatible bucket. Every field is typed in by them —
// nothing here is ever pre-filled by the application.
type backupConfigInput struct {
	Endpoint        string `json:"endpoint" binding:"required"`
	Bucket          string `json:"bucket" binding:"required"`
	Region          string `json:"region"`
	AccessKeyID     string `json:"accessKeyId" binding:"required"`
	SecretAccessKey string `json:"secretAccessKey" binding:"required"`
	IntervalDays    int    `json:"intervalDays"`
	RetainCount     int    `json:"retainCount"`
}

func (d *Deps) requireBackupEncryptionKey(c *gin.Context) bool {
	if len(d.BackupEncryptionKey) == 0 {
		httpx.Error(c, http.StatusPreconditionFailed, "not_configured",
			"S3 backup isn't available on this deployment yet — set BACKUP_ENCRYPTION_KEY (32 random bytes, e.g. `openssl rand -hex 32`) as a server environment variable and restart the backend, then try again.")
		return false
	}
	return true
}

// GetBackupConfig handles GET /api/backup/config — returns everything about
// the configured destination except the secret itself.
func (d *Deps) GetBackupConfig(c *gin.Context) {
	status, err := appbackup.GetConfigStatus(c.Request.Context(), d.DB)
	if err != nil {
		httpx.Internal(c, "Failed to load backup configuration")
		return
	}
	httpx.OK(c, status)
}

// PutBackupConfig handles POST /api/backup/config. Tests the connection
// before saving so a typo in the endpoint/bucket/credentials is caught
// immediately rather than at the next scheduled backup, days later.
func (d *Deps) PutBackupConfig(c *gin.Context) {
	if !d.requireBackupEncryptionKey(c) {
		return
	}
	var in backupConfigInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid backup config payload: "+err.Error())
		return
	}
	if in.Region == "" {
		in.Region = "auto"
	}
	if in.IntervalDays <= 0 {
		in.IntervalDays = 3
	}
	if in.IntervalDays > 30 {
		in.IntervalDays = 30
	}
	if in.RetainCount <= 0 {
		in.RetainCount = 5
	}
	if in.RetainCount > 30 {
		in.RetainCount = 30
	}

	cfg := appbackup.Config{
		Endpoint:        in.Endpoint,
		Bucket:          in.Bucket,
		Region:          in.Region,
		AccessKeyID:     in.AccessKeyID,
		SecretAccessKey: in.SecretAccessKey,
		IntervalDays:    in.IntervalDays,
		RetainCount:     in.RetainCount,
	}

	testCtx, cancel := context.WithTimeout(c.Request.Context(), 15*time.Second)
	defer cancel()
	if err := appbackup.TestConnection(testCtx, cfg); err != nil {
		httpx.BadRequest(c, "Could not connect with these details: "+err.Error())
		return
	}

	if err := appbackup.SaveConfig(c.Request.Context(), d.DB, d.BackupEncryptionKey, cfg); err != nil {
		httpx.Internal(c, "Failed to save backup configuration")
		return
	}

	status, err := appbackup.GetConfigStatus(c.Request.Context(), d.DB)
	if err != nil {
		httpx.Internal(c, "Saved, but failed to reload backup configuration")
		return
	}
	httpx.OK(c, status)
}

// DeleteBackupConfig handles DELETE /api/backup/config.
func (d *Deps) DeleteBackupConfig(c *gin.Context) {
	if err := appbackup.DeleteConfig(c.Request.Context(), d.DB); err != nil {
		httpx.Internal(c, "Failed to remove backup configuration")
		return
	}
	httpx.NoContent(c)
}

// ListBackups handles GET /api/backup — backup attempt history, most recent first.
func (d *Deps) ListBackups(c *gin.Context) {
	records, err := appbackup.ListHistory(c.Request.Context(), d.DB, 50)
	if err != nil {
		httpx.Internal(c, "Failed to load backup history")
		return
	}
	httpx.OK(c, gin.H{"backups": records})
}

// GetBackupStatus handles GET /api/backup/status.
func (d *Deps) GetBackupStatus(c *gin.Context) {
	status, err := appbackup.GetConfigStatus(c.Request.Context(), d.DB)
	if err != nil {
		httpx.Internal(c, "Failed to load backup status")
		return
	}
	lastVerified, err := appbackup.LastVerifiedCompletedAt(c.Request.Context(), d.DB)
	if err != nil {
		httpx.Internal(c, "Failed to load last backup time")
		return
	}
	resp := gin.H{"config": status}
	if !lastVerified.IsZero() {
		resp["lastVerifiedAt"] = lastVerified
		if status.Configured {
			resp["nextDueAt"] = lastVerified.Add(time.Duration(status.IntervalDays) * 24 * time.Hour)
		}
	}
	httpx.OK(c, resp)
}

// TriggerBackup handles POST /api/backup — runs a backup right now, outside
// the schedule.
func (d *Deps) TriggerBackup(c *gin.Context) {
	if !d.requireBackupEncryptionKey(c) {
		return
	}
	cfg, err := appbackup.GetConfig(c.Request.Context(), d.DB, d.BackupEncryptionKey)
	if err != nil {
		if err == appbackup.ErrNotConfigured {
			httpx.BadRequest(c, "No S3 backup destination configured yet — save one first.")
			return
		}
		httpx.Internal(c, "Failed to load backup configuration")
		return
	}

	runCtx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()
	rec, err := appbackup.Run(runCtx, d.DB, *cfg, d.DatabaseURL, "manual")
	if err != nil {
		httpx.Error(c, http.StatusInternalServerError, "backup_failed", "Backup failed: "+err.Error())
		return
	}
	httpx.OK(c, rec)
}

type restoreInput struct {
	// Confirm must be exactly "RESTORE" — a deliberate typed confirmation
	// for an operation that overwrites the live database, not just a
	// yes/no flag a UI could send accidentally.
	Confirm string `json:"confirm" binding:"required"`
}

// RestoreBackup handles POST /api/backup/:id/restore — restores the live
// database from a specific verified S3 backup.
func (d *Deps) RestoreBackup(c *gin.Context) {
	var in restoreInput
	if err := c.ShouldBindJSON(&in); err != nil || in.Confirm != "RESTORE" {
		httpx.BadRequest(c, `To confirm this destructive action, send {"confirm":"RESTORE"}`)
		return
	}
	if !d.requireBackupEncryptionKey(c) {
		return
	}

	id := c.Param("id")
	rec, err := appbackup.GetHistoryRecord(c.Request.Context(), d.DB, id)
	if err != nil {
		httpx.Internal(c, "Failed to load backup record")
		return
	}
	if rec == nil {
		httpx.NotFound(c, "Backup not found")
		return
	}
	if rec.Status != "verified" {
		httpx.BadRequest(c, "Only a verified backup can be restored")
		return
	}

	cfg, err := appbackup.GetConfig(c.Request.Context(), d.DB, d.BackupEncryptionKey)
	if err != nil {
		httpx.Internal(c, "Failed to load backup configuration")
		return
	}

	restoreCtx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()
	if err := appbackup.RestoreFromS3(restoreCtx, *cfg, d.DatabaseURL, *rec); err != nil {
		httpx.Error(c, http.StatusInternalServerError, "restore_failed", "Restore failed: "+err.Error())
		return
	}
	httpx.OK(c, gin.H{"restored": true, "backupId": rec.ID})
}

// DownloadLocalBackup handles GET /api/backup/download — runs a fresh
// pg_dump and streams it straight to the browser. Works even when no S3
// destination is configured, since it never touches S3 at all.
func (d *Deps) DownloadLocalBackup(c *gin.Context) {
	filename := fmt.Sprintf("kinetirx-backup-%s.dump", time.Now().UTC().Format("20060102-150405"))
	c.Header("Content-Disposition", `attachment; filename="`+filename+`"`)
	c.Header("Content-Type", "application/octet-stream")

	dumpCtx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Minute)
	defer cancel()
	if err := appbackup.DumpForDownload(dumpCtx, d.DatabaseURL, c.Writer); err != nil {
		// Headers/body may already be partially flushed by the time pg_dump
		// fails; there's no clean way to turn that into a JSON error
		// response, so just abort the connection.
		c.Abort()
		return
	}
}

// RestoreFromUpload handles POST /api/backup/restore-upload (multipart) —
// restores the live database from a dump file the operator re-uploads
// (typically one they previously got from GET /api/backup/download).
func (d *Deps) RestoreFromUpload(c *gin.Context) {
	if c.PostForm("confirm") != "RESTORE" {
		httpx.BadRequest(c, `To confirm this destructive action, include a "confirm" form field set to RESTORE`)
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		httpx.BadRequest(c, "No backup file was uploaded")
		return
	}
	file, err := fileHeader.Open()
	if err != nil {
		httpx.BadRequest(c, "Could not read uploaded backup file")
		return
	}
	defer file.Close()

	restoreCtx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()
	if err := appbackup.RestoreFromUpload(restoreCtx, d.DatabaseURL, file); err != nil {
		httpx.Error(c, http.StatusInternalServerError, "restore_failed", "Restore failed: "+err.Error())
		return
	}
	httpx.OK(c, gin.H{"restored": true})
}
