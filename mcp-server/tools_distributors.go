package main

import (
	"context"

	"github.com/modelcontextprotocol/go-sdk/mcp"
)

type listDistributorsInput struct {
	Query string `json:"query,omitempty" jsonschema:"optional substring filter, matched case-insensitively against distributor name; omit to list every distributor"`
}

type listDistributorsOutput struct {
	Count        int           `json:"count"`
	Distributors []Distributor `json:"distributors"`
}

func (a *app) listDistributors(ctx context.Context, _ *mcp.CallToolRequest, in listDistributorsInput) (*mcp.CallToolResult, listDistributorsOutput, error) {
	var dists []Distributor
	if err := a.client.get(ctx, "/api/distributors", nil, &dists); err != nil {
		return nil, listDistributorsOutput{}, err
	}
	if in.Query != "" {
		var filtered []Distributor
		for _, d := range dists {
			if containsFold(d.Name, in.Query) {
				filtered = append(filtered, d)
			}
		}
		dists = filtered
	}
	return nil, listDistributorsOutput{Count: len(dists), Distributors: dists}, nil
}
