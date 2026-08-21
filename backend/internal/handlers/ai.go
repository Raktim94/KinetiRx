package handlers

import (
	"github.com/gin-gonic/gin"

	"kinetirx/backend/internal/httpx"
)

type askRequest struct {
	Prompt          string `json:"prompt" binding:"required"`
	MedicineContext string `json:"medicineContext"`
}

// AskAI handles POST /api/ai/ask — the clinical AI pharmacist assistant.
// When GEMINI_API_KEY is not configured it returns a canned offline-mode
// response, matching the old prototype's fallback behavior.
func (d *Deps) AskAI(c *gin.Context) {
	var req askRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		httpx.BadRequest(c, "Invalid AI request payload: "+err.Error())
		return
	}

	if d.GeminiAPIKey == "" {
		httpx.OK(c, gin.H{
			"success":  false,
			"fallback": true,
			"message":  "AI assistant is operating in offline mode.",
			"response": "Clinical Pharmacist Advisory: For " + req.Prompt + ", recommend checking inventory for standard broad-spectrum or symptomatic medications.",
		})
		return
	}

	medicineContext := req.MedicineContext
	if medicineContext == "" {
		medicineContext = "Standard Indian Pharmacy Formulary"
	}
	systemInstruction := "You are Pharma Care Pro's clinical AI pharmacist assistant.\n" +
		"Provide concise, accurate clinical guidance on medicine indications, dosage precautions, salt substitutions, interactions, and inventory recommendations.\n" +
		"Current inventory context: " + medicineContext + "."

	responseText, err := d.callGemini(c.Request.Context(), geminiRequest{
		Contents: []geminiContent{{
			Role:  "user",
			Parts: []geminiPart{{Text: systemInstruction + "\n\nUser Question: " + req.Prompt}},
		}},
		GenerationConfig: geminiGenerationConfig{Temperature: 0.2},
	})
	if err != nil {
		httpx.Error(c, 500, "ai_request_failed", "AI request failed: "+err.Error())
		return
	}

	httpx.OK(c, gin.H{
		"success":  true,
		"response": responseText,
	})
}
