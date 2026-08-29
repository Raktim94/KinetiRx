package handlers

import (
	"time"

	"github.com/gin-gonic/gin"

	"kinetirx/backend/internal/middleware"
	"kinetirx/backend/internal/models"
)

// RegisterRoutes wires every route on the given Gin engine. GET /api/health
// is the only route reachable without a JWT; every other route requires
// Authenticate, and most additionally require a specific tab permission via
// RequirePermission (admins always pass). This is real server-side
// authorization — the frontend's permission-gated UI is only a convenience
// on top of this, never a substitute for it.
func RegisterRoutes(r *gin.Engine, d *Deps) {
	r.GET("/api/health", d.Health)

	// Login and first-run setup are unauthenticated by nature, which makes
	// them the routes most exposed to brute-force/credential-stuffing —
	// rate-limit them per IP on top of the generic-error-message defense
	// already in Login.
	loginLimit := middleware.RateLimit(10, time.Minute)
	setupLimit := middleware.RateLimit(5, time.Minute)

	api := r.Group("/api")
	api.POST("/auth/login", loginLimit, d.Login)
	api.GET("/auth/setup-status", d.SetupStatus)
	api.POST("/auth/setup", setupLimit, d.Setup)

	// Live-sync SSE feed — verifies its own token (query param, since
	// EventSource can't set headers) rather than using the Authenticate
	// middleware; see EventsStream's doc comment.
	api.GET("/events/stream", d.EventsStream)

	authed := api.Group("")
	authed.Use(middleware.Authenticate(d.Tokens))
	{
		authed.GET("/auth/me", d.Me)
		authed.PUT("/auth/password", middleware.RateLimit(10, time.Minute), d.ChangePassword)

		// Medicines / inventory
		inv := authed.Group("/medicines")
		inv.Use(middleware.RequirePermission(models.TabType("inventory")))
		{
			inv.GET("", d.ListMedicines)
			inv.GET("/:id", d.GetMedicine)
			inv.POST("", d.CreateMedicine)
			inv.PUT("/:id", d.UpdateMedicine)
			inv.DELETE("/:id", d.DeleteMedicine)
		}

		// Medicine groups (managed picklist for medicines.group)
		medGroups := authed.Group("/medicine-groups")
		medGroups.Use(middleware.RequirePermission(models.TabType("inventory")))
		{
			medGroups.GET("", d.ListMedicineGroups)
			medGroups.GET("/:id", d.GetMedicineGroup)
			medGroups.POST("", d.CreateMedicineGroup)
			medGroups.PUT("/:id", d.UpdateMedicineGroup)
			medGroups.DELETE("/:id", d.DeleteMedicineGroup)
		}

		// Patients
		pat := authed.Group("/patients")
		pat.Use(middleware.RequirePermission(models.TabType("patients")))
		{
			pat.GET("", d.ListPatients)
			pat.GET("/:id", d.GetPatient)
			pat.POST("", d.CreatePatient)
			pat.PUT("/:id", d.UpdatePatient)
			pat.DELETE("/:id", d.DeletePatient)
		}

		// Due-khata (patient credit ledger)
		due := authed.Group("/due-khata")
		due.Use(middleware.RequirePermission(models.TabType("due-khata")))
		{
			due.GET("", d.ListPatientsDue)
			due.GET("/:id", d.GetPatientDue)
			due.POST("", d.CreatePatientDue)
			due.PUT("/:id", d.UpdatePatientDue)
			due.DELETE("/:id", d.DeletePatientDue)
		}

		// Sales (POS invoices) — append-mostly: list/get/create only
		sales := authed.Group("/sales")
		{
			sales.GET("", middleware.RequirePermission(models.TabType("daily-sales")), d.ListSales)
			sales.GET("/:id", middleware.RequirePermission(models.TabType("daily-sales")), d.GetSale)
			sales.POST("", middleware.RequirePermission(models.TabType("pos")), d.CreateSale)
		}

		// Expenses
		exp := authed.Group("/expenses")
		exp.Use(middleware.RequirePermission(models.TabType("expenses")))
		{
			exp.GET("", d.ListExpenses)
			exp.GET("/:id", d.GetExpense)
			exp.POST("", d.CreateExpense)
			exp.PUT("/:id", d.UpdateExpense)
			exp.DELETE("/:id", d.DeleteExpense)
		}

		// Needed medicine orders
		nm := authed.Group("/needed-meds")
		nm.Use(middleware.RequirePermission(models.TabType("medicine-orders")))
		{
			nm.GET("", d.ListNeededMeds)
			nm.GET("/:id", d.GetNeededMed)
			nm.POST("", d.CreateNeededMed)
			nm.PUT("/:id", d.UpdateNeededMed)
			nm.DELETE("/:id", d.DeleteNeededMed)
		}

		// OPD visits
		opd := authed.Group("/opd-visits")
		opd.Use(middleware.RequirePermission(models.TabType("opd")))
		{
			opd.GET("", d.ListOPDVisits)
			opd.GET("/:id", d.GetOPDVisit)
			opd.POST("", d.CreateOPDVisit)
			opd.PUT("/:id", d.UpdateOPDVisit)
			opd.DELETE("/:id", d.DeleteOPDVisit)
		}

		// Distributors directory
		dist := authed.Group("/distributors")
		dist.Use(middleware.RequirePermission(models.TabType("inventory")))
		{
			dist.GET("", d.ListDistributors)
			dist.GET("/:id", d.GetDistributor)
			dist.POST("", d.CreateDistributor)
			dist.PUT("/:id", d.UpdateDistributor)
			dist.DELETE("/:id", d.DeleteDistributor)
		}

		// Marketing campaigns (business development)
		camp := authed.Group("/marketing-campaigns")
		camp.Use(middleware.RequirePermission(models.TabType("business-dev")))
		{
			camp.GET("", d.ListCampaigns)
			camp.GET("/:id", d.GetCampaign)
			camp.POST("", d.CreateCampaign)
			camp.PUT("/:id", d.UpdateCampaign)
			camp.DELETE("/:id", d.DeleteCampaign)
		}

		// Worksheet tasks (business development)
		tasks := authed.Group("/worksheet-tasks")
		tasks.Use(middleware.RequirePermission(models.TabType("business-dev")))
		{
			tasks.GET("", d.ListTasks)
			tasks.GET("/:id", d.GetTask)
			tasks.POST("", d.CreateTask)
			tasks.PUT("/:id", d.UpdateTask)
			tasks.DELETE("/:id", d.DeleteTask)
		}

		// Employees — admin only for all mutations, employee-mgmt permission to view
		emp := authed.Group("/employees")
		{
			emp.GET("", middleware.RequirePermission(models.TabType("employee-mgmt")), d.ListEmployees)
			emp.GET("/:id", middleware.RequirePermission(models.TabType("employee-mgmt")), d.GetEmployee)
			emp.POST("", middleware.RequireAdmin(), d.CreateEmployee)
			emp.PUT("/:id", middleware.RequireAdmin(), d.UpdateEmployee)
			emp.DELETE("/:id", middleware.RequireAdmin(), d.DeleteEmployee)
		}

		// Daily register (cash closing) — singleton GET/PUT
		reg := authed.Group("/daily-register")
		reg.Use(middleware.RequirePermission(models.TabType("daily-calc")))
		{
			reg.GET("", d.GetDailyRegister)
			reg.PUT("", d.PutDailyRegister)
		}

		// Invoice config — singleton GET/PUT
		inv2 := authed.Group("/invoice-config")
		{
			inv2.GET("", d.GetInvoiceConfig) // any authenticated employee may read (needed to print invoices)
			inv2.PUT("", middleware.RequirePermission(models.TabType("invoice-settings")), d.PutInvoiceConfig)
		}

		// AI-powered OCR invoice ingestion + clinical assistant
		authed.POST("/ocr/parse-bill", middleware.RequirePermission(models.TabType("inward-ocr")), d.ParseBill)
		authed.POST("/ai/ask", d.AskAI) // any authenticated employee may consult the assistant

		// Master Security PIN — a second factor for the highest-risk admin
		// actions (System Reset). Verify is rate-limited on top of its own
		// per-account lockout since a 4-digit PIN is inherently brute-forceable.
		sec := authed.Group("/security/master-pin")
		{
			sec.GET("", d.GetMasterPinStatus)
			sec.PUT("", middleware.RequireAdmin(), d.SetMasterPin)
			sec.POST("/verify", middleware.RateLimit(10, time.Minute), d.VerifyMasterPin)
		}
	}
}
