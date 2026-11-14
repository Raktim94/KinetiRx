# AGENTS.md — KinetiRx

## Integrating with KinetiRx
Read [`prompts/AI_INTEGRATION_PROMPT.md`](prompts/AI_INTEGRATION_PROMPT.md) first. KinetiRx holds patient and pharmacy data and has **no scoped API keys and no webhooks**: auth is employee JWT login. Do not expose it to a public website; do not send patient data to AI tools without explicit authorisation; run the local stdio MCP server (`mcp-server/`) under a least-privilege employee account, not admin; `create_sale` and `add_expense` are real, irreversible writes and need explicit user confirmation. API contract: [`backend/API.md`](backend/API.md).

## Working on this repo
See `CLAUDE.md` and `README.md`. No Co-Authored-By trailers.
