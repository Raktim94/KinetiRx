package handlers

import (
	"github.com/gin-gonic/gin"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type invoiceConfigInput struct {
	Name                  string  `json:"name" binding:"required"`
	StoreName             *string `json:"storeName"`
	Subtitle              *string `json:"subtitle"`
	Dl                    string  `json:"dl"`
	Gst                   string  `json:"gst"`
	Phone                 string  `json:"phone"`
	WaGroup               string  `json:"waGroup"`
	Addr                  string  `json:"addr"`
	Terms                 string  `json:"terms"`
	LogoUrl               *string `json:"logoUrl"`
	RetentionMonths       *int    `json:"retentionMonths"`
	RetentionPolicyNotice *string `json:"retentionPolicyNotice"`
	AutoPurgeOldInvoices  bool    `json:"autoPurgeOldInvoices"`
	LastPurgeDate         *string `json:"lastPurgeDate"`
	Director              *string `json:"director"`
	Pharmacist            *string `json:"pharmacist"`
	Currency              *string `json:"currency"`
	PrinterType           *string `json:"printerType"`
	HeaderTheme           *string `json:"headerTheme"`
}

const invoiceConfigColumns = `name, store_name, subtitle, dl, gst, phone, wa_group, addr, terms, logo_url,
	retention_months, retention_policy_notice, auto_purge_old_invoices, last_purge_date, director, pharmacist,
	currency, printer_type, header_theme, updated_at`

// GetInvoiceConfig handles GET /api/invoice-config. Singleton-per-org record;
// returns sensible defaults if not yet configured rather than 404.
func (d *Deps) GetInvoiceConfig(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+invoiceConfigColumns+` FROM invoice_config WHERE id = true`)
	var cfg models.InvoiceConfig
	err := row.Scan(&cfg.Name, &cfg.StoreName, &cfg.Subtitle, &cfg.Dl, &cfg.Gst, &cfg.Phone, &cfg.WaGroup, &cfg.Addr,
		&cfg.Terms, &cfg.LogoUrl, &cfg.RetentionMonths, &cfg.RetentionPolicyNotice, &cfg.AutoPurgeOldInvoices,
		&cfg.LastPurgeDate, &cfg.Director, &cfg.Pharmacist, &cfg.Currency, &cfg.PrinterType, &cfg.HeaderTheme, &cfg.UpdatedAt)
	if err != nil {
		httpx.OK(c, models.InvoiceConfig{AutoPurgeOldInvoices: true})
		return
	}
	httpx.OK(c, cfg)
}

// PutInvoiceConfig handles PUT /api/invoice-config — upserts the singleton config row.
func (d *Deps) PutInvoiceConfig(c *gin.Context) {
	var in invoiceConfigInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid invoice config payload: "+err.Error())
		return
	}

	const q = `
		INSERT INTO invoice_config (id, name, store_name, subtitle, dl, gst, phone, wa_group, addr, terms, logo_url,
			retention_months, retention_policy_notice, auto_purge_old_invoices, last_purge_date, director, pharmacist,
			currency, printer_type, header_theme, updated_at)
		VALUES (true, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19, now())
		ON CONFLICT (id) DO UPDATE SET
			name = EXCLUDED.name, store_name = EXCLUDED.store_name, subtitle = EXCLUDED.subtitle, dl = EXCLUDED.dl,
			gst = EXCLUDED.gst, phone = EXCLUDED.phone, wa_group = EXCLUDED.wa_group, addr = EXCLUDED.addr,
			terms = EXCLUDED.terms, logo_url = EXCLUDED.logo_url, retention_months = EXCLUDED.retention_months,
			retention_policy_notice = EXCLUDED.retention_policy_notice,
			auto_purge_old_invoices = EXCLUDED.auto_purge_old_invoices, last_purge_date = EXCLUDED.last_purge_date,
			director = EXCLUDED.director, pharmacist = EXCLUDED.pharmacist, currency = EXCLUDED.currency,
			printer_type = EXCLUDED.printer_type, header_theme = EXCLUDED.header_theme, updated_at = now()
		RETURNING ` + invoiceConfigColumns

	row := d.DB.QueryRow(c.Request.Context(), q, in.Name, in.StoreName, in.Subtitle, in.Dl, in.Gst, in.Phone,
		in.WaGroup, in.Addr, in.Terms, in.LogoUrl, in.RetentionMonths, in.RetentionPolicyNotice,
		in.AutoPurgeOldInvoices, in.LastPurgeDate, in.Director, in.Pharmacist, in.Currency, in.PrinterType, in.HeaderTheme)
	var cfg models.InvoiceConfig
	err := row.Scan(&cfg.Name, &cfg.StoreName, &cfg.Subtitle, &cfg.Dl, &cfg.Gst, &cfg.Phone, &cfg.WaGroup, &cfg.Addr,
		&cfg.Terms, &cfg.LogoUrl, &cfg.RetentionMonths, &cfg.RetentionPolicyNotice, &cfg.AutoPurgeOldInvoices,
		&cfg.LastPurgeDate, &cfg.Director, &cfg.Pharmacist, &cfg.Currency, &cfg.PrinterType, &cfg.HeaderTheme, &cfg.UpdatedAt)
	if err != nil {
		httpx.Internal(c, "Failed to save invoice config")
		return
	}
	httpx.OK(c, cfg)
}
