-- ---------------------------------------------------------------------------
-- ai_provider_config: a single-row table holding the operator's own
-- OpenAI-compatible AI vision endpoint (base URL, model, API key), entered
-- from Settings. This powers accurate AI-vision purchase-bill OCR and the
-- clinical AI assistant as an alternative to the GEMINI_API_KEY environment
-- variable — any endpoint that speaks the OpenAI chat-completions API works
-- (Gemini's own OpenAI-compat endpoint, OpenAI itself, OpenRouter, Groq, a
-- local Ollama vision model, etc.), not just Google's native Gemini API.
--
-- api_key is stored AES-256-GCM encrypted (see internal/crypto), keyed off
-- the same BACKUP_ENCRYPTION_KEY environment variable already used to seal
-- the S3 backup secret — one operator-supplied key protects every
-- at-rest secret this app stores, rather than requiring a second one. Never
-- included in any GET response — handlers only ever return whether a key is
-- configured, never its value.
--
-- When this table has a row, it takes priority over GEMINI_API_KEY for both
-- OCR bill scanning and the AI assistant; GEMINI_API_KEY remains supported
-- as the zero-configuration legacy path when this is unset.
-- ---------------------------------------------------------------------------

CREATE TABLE ai_provider_config (
    id             BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
    base_url       TEXT NOT NULL,
    model          TEXT NOT NULL,
    api_key_cipher BYTEA NOT NULL,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
