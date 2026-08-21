package handlers

import (
	"encoding/json"
	"regexp"

	"github.com/gin-gonic/gin"

	"kinetirx/backend/internal/httpx"
)

// ocrBillPrompt is reused verbatim from the old prototype's server.ts
// (lines 329-388) so OCR extraction behavior is unchanged, just now executed
// server-side against the Gemini REST API instead of the @google/genai SDK.
const ocrBillPrompt = `You are an expert Indian Pharmaceutical Purchase Invoice OCR Parser and ERP Ingestion Specialist.
Analyze the provided medicine distributor purchase invoice / bill image or text.
Extract all structured data strictly conforming to JSON.

Key Requirements:
1. Distributor Details:
   - "distributor": Name of the wholesale medicine distributor / supplier / pharma agency (e.g. "BLAIR REMEDIES PVT. LTD.", "SUN PHARMA DISTRIBUTORS", "NEW UMA MEDICINE DISTRIBUTOR", "ABBOTT HEALTHCARE", "CIPLA PHARMA", "MAA SARADA PHARMACEUTICALS", etc.)
   - "gstin": Distributor's 15-character GSTIN number (e.g. "06AAGCB6632E1ZX", "19BUOPM8157K1ZP") or "N/A"
   - "phone": Contact phone / mobile / landline number of the distributor
   - "address": Complete physical address / depot / warehouse location of distributor
   - "invNo": Invoice / Cash Memo / Bill No.
   - "invDate": Invoice date (in YYYY-MM-DD format)
   - "totalCost": Net payable / Gross total invoice value in INR

2. Medicine Line Items:
   Extract EVERY medicine row found on the purchase bill.
   For each item, extract:
   - "name": Full commercial brand medicine name (e.g. "DOLO 650MG", "PAN-D CAPSULE", "ASHTER LOTION", "TELTRIL-40", "AUGMENTIN 625 DUO", "CLAVAM 625", "AZITHRAL 500")
   - "company": Manufacturing/Marketing pharma company (e.g. "Micro Labs", "Alkem", "Blair", "Sun Pharma", "Cipla", "GlaxoSmithKline", "Mankind")
   - "salt": Active generic molecule / salt composition (e.g. "Paracetamol 650mg", "Pantoprazole + Domperidone", "Amoxicillin + Clavulanic Acid")
   - "pack": Packaging unit (e.g. "10*10", "15*T", "60ML", "10*15", "10*1", "100ML")
   - "hsn": HSN code (typically "300490", "3004", "34011110")
   - "batch": Batch number from the bill
   - "exp": Expiry date in YYYY-MM format (e.g. "2027-10", "2028-03")
   - "qty": Purchased quantity (total units/strips received)
   - "rate": Purchase rate per strip/unit in INR (net purchase price)
   - "dmrp" or "omrp": D.M.R.P / Old MRP if listed, else 0
   - "mrp": Maximum Retail Price (MRP) in INR
   - "scheme": Scheme bonus % or free units (e.g. "0.00", "10.00")
   - "disc": Trade discount % (e.g. 0.0, 4.0, 5.0)
   - "gst": GST rate % (typically 5, 12, or 18)

Return ONLY a valid JSON object with the following structure:
{
  "distributor": "string",
  "gstin": "string",
  "phone": "string",
  "address": "string",
  "invNo": "string",
  "invDate": "YYYY-MM-DD",
  "totalCost": 0.0,
  "items": [
    {
      "name": "string",
      "company": "string",
      "salt": "string",
      "pack": "string",
      "hsn": "string",
      "batch": "string",
      "exp": "YYYY-MM",
      "qty": 10,
      "rate": 25.0,
      "dmrp": 0.0,
      "mrp": 35.0,
      "scheme": "0.00",
      "disc": 0.0,
      "gst": 12.0
    }
  ]
}`

var dataURLPrefix = regexp.MustCompile(`^data:[a-zA-Z0-9/+-]+;base64,`)

type parseBillRequest struct {
	ImageBase64     string `json:"imageBase64"`
	MimeType        string `json:"mimeType"`
	TextContent     string `json:"textContent"`
	DistributorHint string `json:"distributorHint"`
}

// ParseBill handles POST /api/ocr/parse-bill. When GEMINI_API_KEY is not
// configured it returns a fallback response so the frontend can fall back to
// its own built-in parsing engine, matching the old prototype's behavior.
func (d *Deps) ParseBill(c *gin.Context) {
	var req parseBillRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "Invalid OCR request payload: "+err.Error())
		return
	}

	if d.GeminiAPIKey == "" {
		httpx.OK(c, gin.H{
			"success":  false,
			"fallback": true,
			"message":  "GEMINI_API_KEY not configured on server. Using built-in pharmaceutical OCR engine.",
		})
		return
	}

	var contents []geminiContent
	switch {
	case req.ImageBase64 != "":
		mimeType := req.MimeType
		if mimeType == "" {
			mimeType = "image/jpeg"
		}
		base64Data := dataURLPrefix.ReplaceAllString(req.ImageBase64, "")
		contents = []geminiContent{{
			Role: "user",
			Parts: []geminiPart{
				{Text: ocrBillPrompt},
				{InlineData: &geminiInlineData{MimeType: mimeType, Data: base64Data}},
			},
		}}
	case req.TextContent != "":
		contents = []geminiContent{{
			Role:  "user",
			Parts: []geminiPart{{Text: ocrBillPrompt + "\n\nInvoice Text Content:\n" + req.TextContent}},
		}}
	default:
		httpx.BadRequest(c, "No imageBase64 or textContent provided")
		return
	}

	responseText, err := d.callGemini(c.Request.Context(), geminiRequest{
		Contents: contents,
		GenerationConfig: geminiGenerationConfig{
			Temperature:      0.1,
			ResponseMimeType: "application/json",
		},
	})
	if err != nil {
		httpx.Error(c, 500, "ocr_extraction_failed", "Failed to process purchase bill OCR: "+err.Error())
		return
	}

	var parsedJSON interface{}
	if err := json.Unmarshal([]byte(responseText), &parsedJSON); err != nil {
		httpx.OK(c, gin.H{
			"success": true,
			"rawText": responseText,
			"data":    nil,
		})
		return
	}

	httpx.OK(c, gin.H{
		"success": true,
		"data":    parsedJSON,
	})
}
