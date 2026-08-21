package main

import (
	"context"
	"fmt"
	"sort"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// --- list_patients --------------------------------------------------------

type listPatientsInput struct {
	Query string `json:"query,omitempty" jsonschema:"optional substring filter, matched case-insensitively against patient name and phone number; omit to list every patient"`
}

type listPatientsOutput struct {
	Count    int       `json:"count"`
	Patients []Patient `json:"patients"`
}

func (a *app) listPatients(ctx context.Context, _ *mcp.CallToolRequest, in listPatientsInput) (*mcp.CallToolResult, listPatientsOutput, error) {
	var patients []Patient
	if err := a.client.get(ctx, "/api/patients", nil, &patients); err != nil {
		return nil, listPatientsOutput{}, err
	}
	if in.Query != "" {
		var filtered []Patient
		for _, p := range patients {
			if containsFold(p.Name, in.Query) || containsFold(p.Phone, in.Query) {
				filtered = append(filtered, p)
			}
		}
		patients = filtered
	}
	return nil, listPatientsOutput{Count: len(patients), Patients: patients}, nil
}

// --- get_patient -----------------------------------------------------------

type getPatientInput struct {
	ID string `json:"id" jsonschema:"the patient's id (from list_patients)"`
}

func (a *app) getPatient(ctx context.Context, _ *mcp.CallToolRequest, in getPatientInput) (*mcp.CallToolResult, Patient, error) {
	if in.ID == "" {
		return nil, Patient{}, fmt.Errorf("id is required")
	}
	var p Patient
	if err := a.client.get(ctx, "/api/patients/"+in.ID, nil, &p); err != nil {
		return nil, Patient{}, err
	}
	return nil, p, nil
}

// --- get_patient_due_khata_balance -----------------------------------------

type getPatientDueKhataBalanceInput struct {
	PatientID string `json:"patientId" jsonschema:"the patient's id (from list_patients or get_patient), required"`
}

type getPatientDueKhataBalanceOutput struct {
	PatientID    string `json:"patientId"`
	PatientName  string `json:"patientName"`
	PatientPhone string `json:"patientPhone"`
	// TotalDue/DueAmount come straight off the patient record (patients.totalDue /
	// patients.dueAmount in the API). DueKhataEntrySum is independently computed
	// by summing every due-khata ledger entry linked to this patientId. The
	// backend does not guarantee these stay in sync with each other (they are
	// separate tables/fields per API.md), so both are reported rather than
	// silently picking one.
	PatientRecordTotalDue  float64      `json:"patientRecordTotalDue"`
	PatientRecordDueAmount float64      `json:"patientRecordDueAmount"`
	DueKhataEntryCount     int          `json:"dueKhataEntryCount"`
	DueKhataEntrySum       float64      `json:"dueKhataEntrySum"`
	DueKhataEntries        []PatientDue `json:"dueKhataEntries"`
}

// getPatientDueKhataBalance is a derived query: there is no
// GET /api/due-khata?patientId= filter or per-patient balance endpoint on
// the backend (confirmed against backend/API.md and
// backend/internal/handlers/patients_due.go — ListPatientsDue takes no
// query params), so this fetches the patient record plus the full due-khata
// list and filters/sums client-side.
func (a *app) getPatientDueKhataBalance(ctx context.Context, _ *mcp.CallToolRequest, in getPatientDueKhataBalanceInput) (*mcp.CallToolResult, getPatientDueKhataBalanceOutput, error) {
	if in.PatientID == "" {
		return nil, getPatientDueKhataBalanceOutput{}, fmt.Errorf("patientId is required")
	}

	var patient Patient
	if err := a.client.get(ctx, "/api/patients/"+in.PatientID, nil, &patient); err != nil {
		return nil, getPatientDueKhataBalanceOutput{}, fmt.Errorf("failed to load patient %q: %w", in.PatientID, err)
	}

	var allDue []PatientDue
	if err := a.client.get(ctx, "/api/due-khata", nil, &allDue); err != nil {
		return nil, getPatientDueKhataBalanceOutput{}, fmt.Errorf("failed to load due-khata ledger: %w", err)
	}

	var entries []PatientDue
	sum := 0.0
	for _, d := range allDue {
		if d.PatientID != nil && *d.PatientID == in.PatientID {
			entries = append(entries, d)
			sum += d.Due
		}
	}
	sort.SliceStable(entries, func(i, j int) bool { return entries[i].LastDate > entries[j].LastDate })

	return nil, getPatientDueKhataBalanceOutput{
		PatientID:              in.PatientID,
		PatientName:            patient.Name,
		PatientPhone:           patient.Phone,
		PatientRecordTotalDue:  patient.TotalDue,
		PatientRecordDueAmount: derefFloat(patient.DueAmount),
		DueKhataEntryCount:     len(entries),
		DueKhataEntrySum:       sum,
		DueKhataEntries:        entries,
	}, nil
}
