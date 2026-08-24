-- ---------------------------------------------------------------------------
-- medicine_groups: a managed picklist backing medicines.group_name (labeled
-- "Doctor Specific Group" in the UI — e.g. "Dr. Sayan Majumdar", used to flag
-- stock tied to a particular prescribing doctor's preference). group_name
-- stays free-text with no FK, so existing values are never invalidated; this
-- table just replaces the two hardcoded <option>s in AddStockModal with an
-- admin-managed list. Seeded with the exact values already hardcoded there
-- so existing stock rows keep matching after the picker switches over.
-- ---------------------------------------------------------------------------

CREATE TABLE medicine_groups (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO medicine_groups (id, name) VALUES
    ('general',             'General'),
    ('dr-sayan-majumdar',   'Dr. Sayan Majumdar'),
    ('dr-tk-khan',          'Dr. T.K. Khan');
