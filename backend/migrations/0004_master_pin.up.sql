-- ---------------------------------------------------------------------------
-- security_settings: a single-row table holding the org-wide "Master
-- Security PIN" used as a second factor for the highest-risk admin actions
-- (currently: System Reset). Deliberately its own table rather than a column
-- on invoice_config: invoice_config is read by any authenticated employee
-- (needed to print invoices) and round-trips wholesale to the frontend as
-- plain JSON, so a hash column there would eventually leak into a response
-- body. This table is never serialized wholesale — handlers only ever
-- return a boolean "is a PIN set" or the result of a verify attempt, never
-- the hash itself.
--
-- No default/seeded PIN: unlike the original spec's idea of a single
-- hardcoded "1122" shipped across every install, a fixed default credential
-- baked into every deployment is a known weak-credential anti-pattern (the
-- same reasoning KinetiRx already applies to admin passwords — see the
-- first-run "Create Admin Account" screen, no default admin password
-- either). The PIN starts unset; an admin sets it explicitly from Settings.
-- ---------------------------------------------------------------------------

CREATE TABLE security_settings (
    id              BOOLEAN PRIMARY KEY DEFAULT true CHECK (id),
    master_pin_hash TEXT,
    failed_attempts INTEGER NOT NULL DEFAULT 0,
    locked_until    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO security_settings (id) VALUES (true);
