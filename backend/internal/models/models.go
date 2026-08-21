// Package models defines the Go structs mirroring every entity in
// frontend/src/types.ts. JSON tags match the frontend field names exactly so
// the REST API is a drop-in replacement for the old flat-JSON-blob backend.
package models

import "time"

// TabType mirrors the frontend's permission/tab identifiers used to gate
// access to each area of the app. Kept as a plain string type (rather than a
// closed enum) because the frontend list may grow; authorization middleware
// treats unknown values as simply "not granted".
type TabType string

// AllTabTypes is the full set of permissions granted to the seeded admin
// account and used to validate permission arrays supplied by clients.
var AllTabTypes = []TabType{
	"dashboard", "daily-calc", "daily-sales", "pos", "due-khata",
	"medicine-orders", "inventory", "inward", "inward-ocr", "opd",
	"patients", "expenses", "business-dev", "employee-mgmt",
	"invoice-settings", "system-reset",
}

// Medicine is a pharmacy inventory item (medicine or lab test).
type Medicine struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Company      string    `json:"company"`
	Dist         string    `json:"dist"`
	Distributor  *string   `json:"distributor,omitempty"`
	HSN          string    `json:"hsn"`
	Batch        string    `json:"batch"`
	Pack         string    `json:"pack"`
	Salt         string    `json:"salt"`
	Generic      *string   `json:"generic,omitempty"`
	Group        string    `json:"group"`
	Rack         string    `json:"rack"`
	Stock        float64   `json:"stock"`
	Rate         float64   `json:"rate"`
	OMRP         float64   `json:"omrp"`
	MRP          float64   `json:"mrp"`
	Scheme       string    `json:"scheme"`
	GST          float64   `json:"gst"`
	Disc         float64   `json:"disc"`
	TabsPerStrip float64   `json:"tabsPerStrip"`
	Expiry       string    `json:"expiry"`
	IsLabTest    bool      `json:"isLabTest"`
	TrackStock   bool      `json:"trackStock"`
	ItemType     string    `json:"itemType"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// PurchaseHistoryEntry is an embedded line in PatientRecord.PurchaseHistory.
type PurchaseHistoryEntry struct {
	Date   string  `json:"date"`
	Items  string  `json:"items"`
	Amount float64 `json:"amount"`
}

// PatientRecord is a full patient profile.
type PatientRecord struct {
	ID              string                 `json:"id"`
	Name            string                 `json:"name"`
	Phone           string                 `json:"phone"`
	Age             *string                `json:"age,omitempty"`
	Gender          *string                `json:"gender,omitempty"`
	AgeGender       *string                `json:"ageGender,omitempty"`
	Addr            *string                `json:"addr,omitempty"`
	Address         *string                `json:"address,omitempty"`
	Doc             *string                `json:"doc,omitempty"`
	Doctor          *string                `json:"doctor,omitempty"`
	Reason          *string                `json:"reason,omitempty"`
	TotalDue        float64                `json:"totalDue"`
	DueAmount       *float64               `json:"dueAmount,omitempty"`
	LastDate        *string                `json:"lastDate,omitempty"`
	LastVisitDate   *string                `json:"lastVisitDate,omitempty"`
	TotalVisits     *int                   `json:"totalVisits,omitempty"`
	PurchaseHistory []PurchaseHistoryEntry `json:"purchaseHistory"`
	BloodTests      []string               `json:"bloodTests"`
	CreatedAt       time.Time              `json:"createdAt"`
	UpdatedAt       time.Time              `json:"updatedAt"`
}

// PatientDue is a due-khata credit ledger entry.
type PatientDue struct {
	ID        string    `json:"id"`
	PatientID *string   `json:"patientId,omitempty"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	Addr      string    `json:"addr"`
	Doc       string    `json:"doc"`
	Reason    string    `json:"reason"`
	Due       float64   `json:"due"`
	LastDate  string    `json:"lastDate"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// SalesItemDetail is one line item within a SalesRecord.
type SalesItemDetail struct {
	Name  string  `json:"name"`
	Qty   float64 `json:"qty"`
	Price float64 `json:"price"`
	Total float64 `json:"total"`
}

// SalesRecord is a POS invoice / sale.
type SalesRecord struct {
	ID              string            `json:"id"`
	Inv             *string           `json:"inv,omitempty"`
	InvoiceNo       *string           `json:"invoiceNo,omitempty"`
	Date            string            `json:"date"`
	Cust            *string           `json:"cust,omitempty"`
	Name            *string           `json:"name,omitempty"`
	Patient         *string           `json:"patient,omitempty"`
	PatientID       *string           `json:"patientId,omitempty"`
	Phone           *string           `json:"phone,omitempty"`
	Items           *string           `json:"items,omitempty"`
	Qty             *string           `json:"qty,omitempty"`
	Amt             *float64          `json:"amt,omitempty"`
	Total           *float64          `json:"total,omitempty"`
	Mode            string            `json:"mode"`
	ItemsDetail     []SalesItemDetail `json:"itemsDetail"`
	Subtotal        *float64          `json:"subtotal,omitempty"`
	DiscountPercent *float64          `json:"discountPercent,omitempty"`
	Doctor          *string           `json:"doctor,omitempty"`
	Address         *string           `json:"address,omitempty"`
	AgeGender       *string           `json:"ageGender,omitempty"`
	PaidAmount      *float64          `json:"paidAmount,omitempty"`
	DueAmount       *float64          `json:"dueAmount,omitempty"`
	CreatedAt       time.Time         `json:"createdAt"`
	UpdatedAt       time.Time         `json:"updatedAt"`
}

// ExpenseRecord is a single pharmacy expense line.
type ExpenseRecord struct {
	ID        string    `json:"id"`
	Date      string    `json:"date"`
	Cat       string    `json:"cat"`
	Desc      string    `json:"desc"`
	Amt       float64   `json:"amt"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// DailyRegister is the singleton-per-org daily cash register / closing state.
type DailyRegister struct {
	Date                *string        `json:"date,omitempty"`
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
	UpdatedAt           time.Time      `json:"updatedAt"`
}

// NeededMedOrder is a request to order a medicine from a distributor.
type NeededMedOrder struct {
	ID        string    `json:"id"`
	PatientID *string   `json:"patientId,omitempty"`
	Med       string    `json:"med"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	Dist      string    `json:"dist"`
	Time      string    `json:"time"`
	Qty       float64   `json:"qty"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// OPDVisit is an out-patient department visit record.
type OPDVisit struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Phone     string    `json:"phone"`
	AgeSex    string    `json:"ageSex"`
	Doc       string    `json:"doc"`
	Vdate     string    `json:"vdate"`
	Rvdate    string    `json:"rvdate"`
	Btest     string    `json:"btest"`
	Reminder  string    `json:"reminder"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// MarketingCampaign is a business-development / marketing action item.
type MarketingCampaign struct {
	ID        string    `json:"id"`
	Doc       string    `json:"doc"`
	Date      string    `json:"date"`
	Action    string    `json:"action"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// WorksheetTask is a general business-development task.
type WorksheetTask struct {
	ID        string    `json:"id"`
	Cat       string    `json:"cat"`
	Desc      string    `json:"desc"`
	Date      string    `json:"date"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

// Distributor is a pharmaceutical wholesale distributor / supplier.
type Distributor struct {
	ID             string    `json:"id"`
	Name           string    `json:"name"`
	Gstin          string    `json:"gstin"`
	Phone          string    `json:"phone"`
	Addr           string    `json:"addr"`
	DlNo           *string   `json:"dlNo,omitempty"`
	Email          *string   `json:"email,omitempty"`
	ContactPerson  *string   `json:"contactPerson,omitempty"`
	RegisteredDate *string   `json:"registeredDate,omitempty"`
	Source         *string   `json:"source,omitempty"`
	CreatedAt      time.Time `json:"createdAt"`
	UpdatedAt      time.Time `json:"updatedAt"`
}

// Employee is a staff account. PasswordHash/PinHash are never serialized to JSON.
type Employee struct {
	ID           string    `json:"id"`
	Name         string    `json:"name"`
	Desig        string    `json:"desig"`
	PasswordHash string    `json:"-"`
	Phone        *string   `json:"phone,omitempty"`
	Role         string    `json:"role"`
	PinHash      *string   `json:"-"`
	Permissions  []string  `json:"permissions"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

// InvoiceConfig is the singleton-per-org invoice/branding configuration.
type InvoiceConfig struct {
	Name                  string    `json:"name"`
	StoreName             *string   `json:"storeName,omitempty"`
	Subtitle              *string   `json:"subtitle,omitempty"`
	Dl                    string    `json:"dl"`
	Gst                   string    `json:"gst"`
	Phone                 string    `json:"phone"`
	WaGroup               string    `json:"waGroup"`
	Addr                  string    `json:"addr"`
	Terms                 string    `json:"terms"`
	LogoUrl               *string   `json:"logoUrl,omitempty"`
	RetentionMonths       *int      `json:"retentionMonths,omitempty"`
	RetentionPolicyNotice *string   `json:"retentionPolicyNotice,omitempty"`
	AutoPurgeOldInvoices  bool      `json:"autoPurgeOldInvoices"`
	LastPurgeDate         *string   `json:"lastPurgeDate,omitempty"`
	Director              *string   `json:"director,omitempty"`
	Pharmacist            *string   `json:"pharmacist,omitempty"`
	Currency              *string   `json:"currency,omitempty"`
	PrinterType           *string   `json:"printerType,omitempty"`
	HeaderTheme           *string   `json:"headerTheme,omitempty"`
	UpdatedAt             time.Time `json:"updatedAt"`
}
