package main

import (
	"context"
	"fmt"
	"sort"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

// --- list_medicines ---------------------------------------------------

type listMedicinesInput struct {
	ItemType string `json:"itemType,omitempty" jsonschema:"optional filter: 'medicine' or 'lab_test'; omit to list every inventory item"`
}

type listMedicinesOutput struct {
	Count     int        `json:"count"`
	Medicines []Medicine `json:"medicines"`
}

func (a *app) listMedicines(ctx context.Context, _ *mcp.CallToolRequest, in listMedicinesInput) (*mcp.CallToolResult, listMedicinesOutput, error) {
	var meds []Medicine
	if err := a.client.get(ctx, "/api/medicines", nil, &meds); err != nil {
		return nil, listMedicinesOutput{}, err
	}
	if in.ItemType != "" {
		filtered := meds[:0]
		for _, m := range meds {
			if m.ItemType == in.ItemType {
				filtered = append(filtered, m)
			}
		}
		meds = filtered
	}
	return nil, listMedicinesOutput{Count: len(meds), Medicines: meds}, nil
}

// --- get_medicine -------------------------------------------------------

type getMedicineInput struct {
	ID string `json:"id" jsonschema:"the medicine's id (from list_medicines or search_medicine_stock)"`
}

func (a *app) getMedicine(ctx context.Context, _ *mcp.CallToolRequest, in getMedicineInput) (*mcp.CallToolResult, Medicine, error) {
	if in.ID == "" {
		return nil, Medicine{}, fmt.Errorf("id is required")
	}
	var med Medicine
	if err := a.client.get(ctx, "/api/medicines/"+in.ID, nil, &med); err != nil {
		return nil, Medicine{}, err
	}
	return nil, med, nil
}

// --- search_medicine_stock ----------------------------------------------

type searchMedicineStockInput struct {
	Query string `json:"query" jsonschema:"substring to search for, matched case-insensitively against the medicine's name, salt/composition, generic name, and company (required)"`
}

type searchMedicineStockOutput struct {
	Query        string     `json:"query"`
	MatchCount   int        `json:"matchCount"`
	InStockCount int        `json:"inStockCount"`
	Matches      []Medicine `json:"matches"`
}

// searchMedicineStock answers "do we have X in stock" style questions. The
// backend has no server-side search endpoint for medicines (see API.md), so
// this fetches the full inventory list and filters/sorts it client-side —
// fine at the pharmacy-scale row counts this API documents itself as
// targeting (thousands, not millions, of rows).
func (a *app) searchMedicineStock(ctx context.Context, _ *mcp.CallToolRequest, in searchMedicineStockInput) (*mcp.CallToolResult, searchMedicineStockOutput, error) {
	if in.Query == "" {
		return nil, searchMedicineStockOutput{}, fmt.Errorf("query is required")
	}
	var meds []Medicine
	if err := a.client.get(ctx, "/api/medicines", nil, &meds); err != nil {
		return nil, searchMedicineStockOutput{}, err
	}

	var matches []Medicine
	inStock := 0
	for _, m := range meds {
		if containsFold(m.Name, in.Query) || containsFold(m.Salt, in.Query) ||
			containsFold(derefStr(m.Generic), in.Query) || containsFold(m.Company, in.Query) {
			matches = append(matches, m)
			if m.Stock > 0 {
				inStock++
			}
		}
	}
	// In-stock matches first, then by descending stock, then by name.
	sort.SliceStable(matches, func(i, j int) bool {
		if (matches[i].Stock > 0) != (matches[j].Stock > 0) {
			return matches[i].Stock > 0
		}
		if matches[i].Stock != matches[j].Stock {
			return matches[i].Stock > matches[j].Stock
		}
		return matches[i].Name < matches[j].Name
	})

	return nil, searchMedicineStockOutput{
		Query:        in.Query,
		MatchCount:   len(matches),
		InStockCount: inStock,
		Matches:      matches,
	}, nil
}

// --- get_low_stock_medicines ---------------------------------------------

const defaultLowStockThreshold = 10.0

type getLowStockMedicinesInput struct {
	Threshold float64 `json:"threshold,omitempty" jsonschema:"stock level at/below which a medicine is considered low; defaults to 10 if omitted or <= 0"`
}

type getLowStockMedicinesOutput struct {
	ThresholdUsed float64    `json:"thresholdUsed"`
	Count         int        `json:"count"`
	Medicines     []Medicine `json:"medicines"`
}

// getLowStockMedicines is a derived query: the KinetiRx backend has no
// reorder-threshold field on the medicine record and no dedicated low-stock
// endpoint (confirmed against backend/internal/models/models.go and
// backend/API.md — Medicine only has a raw `stock` count, no min/reorder
// level). This tool therefore lists all medicines and filters client-side
// against a caller-supplied threshold. It is a heuristic, not a per-medicine
// configured reorder point.
func (a *app) getLowStockMedicines(ctx context.Context, _ *mcp.CallToolRequest, in getLowStockMedicinesInput) (*mcp.CallToolResult, getLowStockMedicinesOutput, error) {
	threshold := in.Threshold
	if threshold <= 0 {
		threshold = defaultLowStockThreshold
	}

	var meds []Medicine
	if err := a.client.get(ctx, "/api/medicines", nil, &meds); err != nil {
		return nil, getLowStockMedicinesOutput{}, err
	}

	var low []Medicine
	for _, m := range meds {
		if m.TrackStock && m.Stock <= threshold {
			low = append(low, m)
		}
	}
	sort.SliceStable(low, func(i, j int) bool { return low[i].Stock < low[j].Stock })

	return nil, getLowStockMedicinesOutput{ThresholdUsed: threshold, Count: len(low), Medicines: low}, nil
}
