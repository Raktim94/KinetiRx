package handlers

import (
	"errors"

	"github.com/gin-gonic/gin"

	"kinetirx/backend/internal/httpx"
)

type askRequest struct {
	Prompt          string `json:"prompt" binding:"required"`
	MedicineContext string `json:"medicineContext"`
}

// AskAI handles POST /api/ai/ask — the clinical AI pharmacist assistant.
// When no AI provider is configured (Settings -> AI OCR / Vision Model, or
// the legacy GEMINI_API_KEY environment variable) it returns a canned
// offline-mode response, matching the old prototype's fallback behavior.
func (d *Deps) AskAI(c *gin.Context) {
	var req askRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "Invalid AI request payload: "+err.Error())
		return
	}

	medicineContext := req.MedicineContext
	if medicineContext == "" {
		medicineContext = "Standard Indian Pharmacy Formulary"
	}
	systemInstruction := "You are Pharma Care Pro's clinical AI pharmacist assistant.\n" +
		"Provide concise, accurate clinical guidance on medicine indications, dosage precautions, salt substitutions, interactions, and inventory recommendations.\n" +
		"Current inventory context: " + medicineContext + "."

	responseText, err := d.runAIPrompt(c.Request.Context(), systemInstruction+"\n\nUser Question: "+req.Prompt, "", "", false)
	if errors.Is(err, ErrAINotConfigured) {
		httpx.OK(c, gin.H{
			"success":  false,
			"fallback": true,
			"message":  "AI assistant is operating in offline mode.",
			"response": "Clinical Pharmacist Advisory: For " + req.Prompt + ", recommend checking inventory for standard broad-spectrum or symptomatic medications.",
		})
		return
	}
	if err != nil {
		httpx.Error(c, 500, "ai_request_failed", "AI request failed: "+err.Error())
		return
	}

	httpx.OK(c, gin.H{
		"success":  true,
		"response": responseText,
	})
}
