package main

// These types mirror the JSON shapes documented in backend/API.md (and
// backed by backend/internal/models/models.go) for KinetiRx entities. They
// exist purely to give MCP tool outputs a structured schema; the MCP server
// performs no business logic of its own — it only shapes requests/responses
// around the real REST API.

// Medicine is a pharmacy inventory item (medicine or lab test).
type Medicine struct {
	ID           string  `json:"id,omitempty"`
	Name         string  `json:"name"`
	Company      string  `json:"company,omitempty"`
	Dist         string  `json:"dist,omitempty"`
	Distributor  *string `json:"distributor,omitempty"`
	HSN          string  `json:"hsn,omitempty"`
	Batch        string  `json:"batch,omitempty"`
	Pack         string  `json:"pack,omitempty"`
	Salt         string  `json:"salt,omitempty"`
	Generic      *string `json:"generic,omitempty"`
	Group        string  `json:"group,omitempty"`
	Rack         string  `json:"rack,omitempty"`
	Stock        float64 `json:"stock"`
	Rate         float64 `json:"rate,omitempty"`
	OMRP         float64 `json:"omrp,omitempty"`
	MRP          float64 `json:"mrp,omitempty"`
	Scheme       string  `json:"scheme,omitempty"`
	GST          float64 `json:"gst,omitempty"`
	Disc         float64 `json:"disc,omitempty"`
	TabsPerStrip float64 `json:"tabsPerStrip,omitempty"`
	Expiry       string  `json:"expiry,omitempty"`
	IsLabTest    bool    `json:"isLabTest,omitempty"`
	TrackStock   bool    `json:"trackStock"`
	ItemType     string  `json:"itemType,omitempty"`
	CreatedAt    string  `json:"createdAt,omitempty"`
	UpdatedAt    string  `json:"updatedAt,omitempty"`
}

// PurchaseHistoryEntry is one embedded line in Patient.PurchaseHistory.
type PurchaseHistoryEntry struct {
	Date   string  `json:"date,omitempty"`
	Items  string  `json:"items,omitempty"`
	Amount float64 `json:"amount,omitempty"`
}

// Patient is a full patient profile.
type Patient struct {
	ID              string                 `json:"id,omitempty"`
	Name            string                 `json:"name"`
	Phone           string                 `json:"phone,omitempty"`
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
	PurchaseHistory []PurchaseHistoryEntry `json:"purchaseHistory,omitempty"`
	BloodTests      []string               `json:"bloodTests,omitempty"`
	CreatedAt       string                 `json:"createdAt,omitempty"`
	UpdatedAt       string                 `json:"updatedAt,omitempty"`
}

// PatientDue is one due-khata (patient credit ledger) entry.
type PatientDue struct {
	ID        string  `json:"id,omitempty"`
	PatientID *string `json:"patientId,omitempty"`
	Name      string  `json:"name"`
	Phone     string  `json:"phone,omitempty"`
	Addr      string  `json:"addr,omitempty"`
	Doc       string  `json:"doc,omitempty"`
	Reason    string  `json:"reason,omitempty"`
	Due       float64 `json:"due"`
	LastDate  string  `json:"lastDate,omitempty"`
	CreatedAt string  `json:"createdAt,omitempty"`
	UpdatedAt string  `json:"updatedAt,omitempty"`
}

// SalesItemDetail is one line item within a Sale.
type SalesItemDetail struct {
	Name  string  `json:"name"`
	Qty   float64 `json:"qty"`
	Price float64 `json:"price"`
	Total float64 `json:"total"`
}

// Sale is a POS invoice / sales-history record, as returned by the API.
type Sale struct {
	ID              string            `json:"id,omitempty"`
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
	ItemsDetail     []SalesItemDetail `json:"itemsDetail,omitempty"`
	Subtotal        *float64          `json:"subtotal,omitempty"`
	DiscountPercent *float64          `json:"discountPercent,omitempty"`
	Doctor          *string           `json:"doctor,omitempty"`
	Address         *string           `json:"address,omitempty"`
	AgeGender       *string           `json:"ageGender,omitempty"`
	PaidAmount      *float64          `json:"paidAmount,omitempty"`
	DueAmount       *float64          `json:"dueAmount,omitempty"`
	CreatedAt       string            `json:"createdAt,omitempty"`
	UpdatedAt       string            `json:"updatedAt,omitempty"`
}

// Expense is a single pharmacy expense line.
type Expense struct {
	ID        string  `json:"id,omitempty"`
	Date      string  `json:"date"`
	Cat       string  `json:"cat,omitempty"`
	Desc      string  `json:"desc,omitempty"`
	Amt       float64 `json:"amt"`
	CreatedAt string  `json:"createdAt,omitempty"`
	UpdatedAt string  `json:"updatedAt,omitempty"`
}

// Distributor is a pharmaceutical wholesale distributor / supplier.
type Distributor struct {
	ID             string  `json:"id,omitempty"`
	Name           string  `json:"name"`
	Gstin          string  `json:"gstin,omitempty"`
	Phone          string  `json:"phone,omitempty"`
	Addr           string  `json:"addr,omitempty"`
	DlNo           *string `json:"dlNo,omitempty"`
	Email          *string `json:"email,omitempty"`
	ContactPerson  *string `json:"contactPerson,omitempty"`
	RegisteredDate *string `json:"registeredDate,omitempty"`
	Source         *string `json:"source,omitempty"`
	CreatedAt      string  `json:"createdAt,omitempty"`
	UpdatedAt      string  `json:"updatedAt,omitempty"`
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
	Denominations       map[string]int `json:"denominations,omitempty"`
	ClosingPhysicalCash float64        `json:"closingPhysicalCash"`
	CashDifference      float64        `json:"cashDifference"`
	IsDrawerClosed      bool           `json:"isDrawerClosed"`
	UpdatedAt           string         `json:"updatedAt,omitempty"`
}
