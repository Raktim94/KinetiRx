package handlers

import (
	"github.com/gin-gonic/gin"

	"kinetirx/backend/internal/httpx"
	"kinetirx/backend/internal/models"
)

type dailyRegisterInput struct {
	Date                *string        `json:"date"`
	PrevBD              float64        `json:"prevBD"`
	TodaySell           float64        `json:"todaySell"`
	PhonePe             float64        `json:"phonePe"`
	Expenses            float64        `json:"expenses"`
	BankShift           float64        `json:"bankShift"`
	IsLocked            bool           `json:"isLocked"`
	OpeningCash         float64        `json:"openingCash"`
	TotalSales          float64        `json:"totalSales"`
	CashSales           float64        `json:"cashSales"`
	UpiSales            float64        `json:"upiSales"`
	CardSales           float64        `json:"cardSales"`
	TotalExpenses       float64        `json:"totalExpenses"`
	Denominations       map[string]int `json:"denominations"`
	ClosingPhysicalCash float64        `json:"closingPhysicalCash"`
	CashDifference      float64        `json:"cashDifference"`
	IsDrawerClosed      bool           `json:"isDrawerClosed"`
}

const dailyRegisterColumns = `date, prev_bd, today_sell, phone_pe, expenses, bank_shift, is_locked, opening_cash,
	total_sales, cash_sales, upi_sales, card_sales, total_expenses, denominations, closing_physical_cash,
	cash_difference, is_drawer_closed, updated_at`

// GetDailyRegister handles GET /api/daily-register. This is a singleton-per-org
// record; if no row exists yet (very first request on a fresh database) a
// zeroed default is returned rather than a 404, matching the old prototype's
// behavior of always having a register object available.
func (d *Deps) GetDailyRegister(c *gin.Context) {
	row := d.DB.QueryRow(c.Request.Context(), `SELECT `+dailyRegisterColumns+` FROM daily_register WHERE id = true`)
	var r models.DailyRegister
	err := row.Scan(&r.Date, &r.PrevBD, &r.TodaySell, &r.PhonePe, &r.Expenses, &r.BankShift, &r.IsLocked,
		&r.OpeningCash, &r.TotalSales, &r.CashSales, &r.UpiSales, &r.CardSales, &r.TotalExpenses, &r.Denominations,
		&r.ClosingPhysicalCash, &r.CashDifference, &r.IsDrawerClosed, &r.UpdatedAt)
	if err != nil {
		// No row yet: return the zero-value register rather than erroring.
		httpx.OK(c, models.DailyRegister{Denominations: map[string]int{}})
		return
	}
	httpx.OK(c, r)
}

// PutDailyRegister handles PUT /api/daily-register — upserts the singleton register row.
func (d *Deps) PutDailyRegister(c *gin.Context) {
	var in dailyRegisterInput
	if err := c.ShouldBindJSON(&in); err != nil {
		httpx.BadRequest(c, "Invalid daily register payload: "+err.Error())
		return
	}
	if in.Denominations == nil {
		in.Denominations = map[string]int{}
	}

	const q = `
		INSERT INTO daily_register (id, date, prev_bd, today_sell, phone_pe, expenses, bank_shift, is_locked,
			opening_cash, total_sales, cash_sales, upi_sales, card_sales, total_expenses, denominations,
			closing_physical_cash, cash_difference, is_drawer_closed, updated_at)
		VALUES (true, $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17, now())
		ON CONFLICT (id) DO UPDATE SET
			date = EXCLUDED.date, prev_bd = EXCLUDED.prev_bd, today_sell = EXCLUDED.today_sell,
			phone_pe = EXCLUDED.phone_pe, expenses = EXCLUDED.expenses, bank_shift = EXCLUDED.bank_shift,
			is_locked = EXCLUDED.is_locked, opening_cash = EXCLUDED.opening_cash, total_sales = EXCLUDED.total_sales,
			cash_sales = EXCLUDED.cash_sales, upi_sales = EXCLUDED.upi_sales, card_sales = EXCLUDED.card_sales,
			total_expenses = EXCLUDED.total_expenses, denominations = EXCLUDED.denominations,
			closing_physical_cash = EXCLUDED.closing_physical_cash, cash_difference = EXCLUDED.cash_difference,
			is_drawer_closed = EXCLUDED.is_drawer_closed, updated_at = now()
		RETURNING ` + dailyRegisterColumns

	row := d.DB.QueryRow(c.Request.Context(), q, in.Date, in.PrevBD, in.TodaySell, in.PhonePe, in.Expenses,
		in.BankShift, in.IsLocked, in.OpeningCash, in.TotalSales, in.CashSales, in.UpiSales, in.CardSales,
		in.TotalExpenses, in.Denominations, in.ClosingPhysicalCash, in.CashDifference, in.IsDrawerClosed)
	var r models.DailyRegister
	err := row.Scan(&r.Date, &r.PrevBD, &r.TodaySell, &r.PhonePe, &r.Expenses, &r.BankShift, &r.IsLocked,
		&r.OpeningCash, &r.TotalSales, &r.CashSales, &r.UpiSales, &r.CardSales, &r.TotalExpenses, &r.Denominations,
		&r.ClosingPhysicalCash, &r.CashDifference, &r.IsDrawerClosed, &r.UpdatedAt)
	if err != nil {
		httpx.Internal(c, "Failed to save daily register")
		return
	}
	d.Events.Publish("dailyRegister")
	httpx.OK(c, r)
}
