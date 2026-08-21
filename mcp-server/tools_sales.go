package main

import (
	"context"
	"fmt"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// --- create_sale (MUTATING) -------------------------------------------

type createSaleItemInput struct {
	Name  string  `json:"name" jsonschema:"medicine or item name sold (required)"`
	Qty   float64 `json:"qty" jsonschema:"quantity sold (required, must be > 0)"`
	Price float64 `json:"price" jsonschema:"unit price (required, must be >= 0)"`
	Total float64 `json:"total,omitempty" jsonschema:"line total for this item; if omitted it is computed as qty * price"`
}

type createSaleInput struct {
	ID              string                `json:"id,omitempty" jsonschema:"optional client-supplied id; a UUID is generated if omitted"`
	Date            string                `json:"date" jsonschema:"sale date, YYYY-MM-DD (required)"`
	Mode            string                `json:"mode" jsonschema:"payment mode, e.g. cash, upi, card (required)"`
	PatientID       string                `json:"patientId,omitempty" jsonschema:"id of an existing patient to link this sale to (optional); if supplied it must reference a real patient or the API rejects the sale with a 409 conflict"`
	PatientName     string                `json:"patientName,omitempty" jsonschema:"customer/patient display name for this sale, freeform (optional; used even for walk-in customers with no patientId)"`
	Phone           string                `json:"phone,omitempty" jsonschema:"customer phone number for this sale (optional)"`
	Items           []createSaleItemInput `json:"items,omitempty" jsonschema:"itemized line items sold in this transaction (recommended; if omitted, total must be supplied explicitly)"`
	Subtotal        float64               `json:"subtotal,omitempty" jsonschema:"pre-discount subtotal; computed from items if omitted"`
	DiscountPercent float64               `json:"discountPercent,omitempty" jsonschema:"discount percentage applied to the subtotal (optional, 0-100)"`
	Total           float64               `json:"total,omitempty" jsonschema:"final invoice total; computed from items/subtotal/discountPercent if omitted"`
	Doctor          string                `json:"doctor,omitempty" jsonschema:"prescribing doctor's name (optional)"`
	Address         string                `json:"address,omitempty" jsonschema:"customer address (optional)"`
	AgeGender       string                `json:"ageGender,omitempty" jsonschema:"customer age/gender, freeform e.g. '34/M' (optional)"`
	PaidAmount      float64               `json:"paidAmount,omitempty" jsonschema:"amount actually paid by the customer at time of sale (optional; if omitted, assumed equal to total)"`
	DueAmount       float64               `json:"dueAmount,omitempty" jsonschema:"unpaid balance left on this sale, e.g. to add to due-khata credit (optional)"`
	InvoiceNo       string                `json:"invoiceNo,omitempty" jsonschema:"invoice number to record on the sale (optional)"`
}

// backend request body shape for POST /api/sales — see backend/API.md and
// backend/internal/handlers/sales.go's saleInput struct. Kept distinct from
// createSaleInput (the MCP tool's argument shape) because the tool accepts a
// friendlier surface (e.g. a single itemized `items` list, computed totals)
// and translates it into exactly what the backend expects.
type salePayload struct {
	ID              string            `json:"id,omitempty"`
	Date            string            `json:"date"`
	Mode            string            `json:"mode"`
	PatientID       *string           `json:"patientId,omitempty"`
	Patient         *string           `json:"patient,omitempty"`
	Name            *string           `json:"name,omitempty"`
	Cust            *string           `json:"cust,omitempty"`
	Phone           *string           `json:"phone,omitempty"`
	ItemsDetail     []SalesItemDetail `json:"itemsDetail"`
	Subtotal        float64           `json:"subtotal,omitempty"`
	DiscountPercent float64           `json:"discountPercent,omitempty"`
	Total           float64           `json:"total,omitempty"`
	Amt             float64           `json:"amt,omitempty"`
	Doctor          *string           `json:"doctor,omitempty"`
	Address         *string           `json:"address,omitempty"`
	AgeGender       *string           `json:"ageGender,omitempty"`
	PaidAmount      float64           `json:"paidAmount,omitempty"`
	DueAmount       float64           `json:"dueAmount,omitempty"`
	InvoiceNo       *string           `json:"invoiceNo,omitempty"`
}

func strPtrIfSet(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

// createSale records a REAL sales transaction against the live KinetiRx
// database via POST /api/sales. This is intentionally the only mutating
// tool in the POS/sales surface — sales are append-only in the backend
// (no update/delete), so a mistaken call cannot be silently undone; the
// documented remedy is recording a correcting entry (e.g. a return), same
// as the real business process.
func (a *app) createSale(ctx context.Context, _ *mcp.CallToolRequest, in createSaleInput) (*mcp.CallToolResult, Sale, error) {
	if in.Date == "" {
		return nil, Sale{}, fmt.Errorf("date is required (YYYY-MM-DD)")
	}
	if in.Mode == "" {
		return nil, Sale{}, fmt.Errorf("mode is required (e.g. cash, upi, card)")
	}
	if len(in.Items) == 0 && in.Total <= 0 && in.Subtotal <= 0 {
		return nil, Sale{}, fmt.Errorf("either items (itemized line items) or an explicit total/subtotal must be supplied — refusing to record an empty sale")
	}
	for i, it := range in.Items {
		if it.Name == "" {
			return nil, Sale{}, fmt.Errorf("items[%d].name is required", i)
		}
		if it.Qty <= 0 {
			return nil, Sale{}, fmt.Errorf("items[%d].qty must be > 0", i)
		}
		if it.Price < 0 {
			return nil, Sale{}, fmt.Errorf("items[%d].price must be >= 0", i)
		}
	}

	itemsDetail := make([]SalesItemDetail, 0, len(in.Items))
	computedSubtotal := 0.0
	for _, it := range in.Items {
		total := it.Total
		if total == 0 {
			total = it.Qty * it.Price
		}
		itemsDetail = append(itemsDetail, SalesItemDetail{Name: it.Name, Qty: it.Qty, Price: it.Price, Total: total})
		computedSubtotal += total
	}

	subtotal := in.Subtotal
	if subtotal == 0 {
		subtotal = computedSubtotal
	}

	total := in.Total
	if total == 0 {
		if in.DiscountPercent > 0 {
			total = subtotal * (1 - in.DiscountPercent/100)
		} else {
			total = subtotal
		}
	}

	paidAmount := in.PaidAmount
	if paidAmount == 0 && in.DueAmount == 0 {
		// Default assumption: fully paid, unless the caller explicitly
		// recorded a due amount (partial/khata sale).
		paidAmount = total
	}

	payload := salePayload{
		ID:              in.ID,
		Date:            in.Date,
		Mode:            in.Mode,
		PatientID:       strPtrIfSet(in.PatientID),
		Patient:         strPtrIfSet(in.PatientName),
		Name:            strPtrIfSet(in.PatientName),
		Cust:            strPtrIfSet(in.PatientName),
		Phone:           strPtrIfSet(in.Phone),
		ItemsDetail:     itemsDetail,
		Subtotal:        subtotal,
		DiscountPercent: in.DiscountPercent,
		Total:           total,
		Amt:             total,
		Doctor:          strPtrIfSet(in.Doctor),
		Address:         strPtrIfSet(in.Address),
		AgeGender:       strPtrIfSet(in.AgeGender),
		PaidAmount:      paidAmount,
		DueAmount:       in.DueAmount,
		InvoiceNo:       strPtrIfSet(in.InvoiceNo),
	}

	var sale Sale
	if err := a.client.post(ctx, "/api/sales", payload, &sale); err != nil {
		return nil, Sale{}, err
	}
	return nil, sale, nil
}

// --- get_daily_register -------------------------------------------------

// getDailyRegister returns today's/current cash-and-sales register — the
// singleton record staff maintain at cash-closing time (opening cash,
// cash/UPI/card sales, expenses, closing physical cash, denominations,
// etc.). It reflects whatever has been entered into the register, which is
// not necessarily a live, automatic total of every raw POS sale — see
// backend/API.md's Daily Register section.
func (a *app) getDailyRegister(ctx context.Context, _ *mcp.CallToolRequest, _ NoArgs) (*mcp.CallToolResult, DailyRegister, error) {
	var reg DailyRegister
	if err := a.client.get(ctx, "/api/daily-register", nil, &reg); err != nil {
		return nil, DailyRegister{}, err
	}
	return nil, reg, nil
}
