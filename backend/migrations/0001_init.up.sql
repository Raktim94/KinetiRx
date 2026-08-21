-- KinetiRx / Pharma Care Pro initial schema
-- One table per entity from frontend/src/types.ts, with real PKs, FKs and timestamps.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- employees (auth + permission model)
-- ---------------------------------------------------------------------------
CREATE TABLE employees (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    desig           TEXT NOT NULL DEFAULT '',
    password_hash   TEXT NOT NULL,
    phone           TEXT,
    role            TEXT NOT NULL DEFAULT 'staff',
    pin_hash        TEXT,
    permissions     TEXT[] NOT NULL DEFAULT '{}',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- distributors
-- ---------------------------------------------------------------------------
CREATE TABLE distributors (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    gstin             TEXT NOT NULL DEFAULT '',
    phone             TEXT NOT NULL DEFAULT '',
    addr              TEXT NOT NULL DEFAULT '',
    dl_no             TEXT,
    email             TEXT,
    contact_person    TEXT,
    registered_date   TEXT,
    source            TEXT,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- medicines (inventory)
-- ---------------------------------------------------------------------------
CREATE TABLE medicines (
    id              TEXT PRIMARY KEY,
    name            TEXT NOT NULL,
    company         TEXT NOT NULL DEFAULT '',
    dist            TEXT NOT NULL DEFAULT '',
    distributor_id  TEXT REFERENCES distributors(id) ON DELETE SET NULL,
    hsn             TEXT NOT NULL DEFAULT '',
    batch           TEXT NOT NULL DEFAULT '',
    pack            TEXT NOT NULL DEFAULT '',
    salt            TEXT NOT NULL DEFAULT '',
    generic         TEXT,
    group_name      TEXT NOT NULL DEFAULT '',
    rack            TEXT NOT NULL DEFAULT '',
    stock           NUMERIC(14,3) NOT NULL DEFAULT 0,
    rate            NUMERIC(14,2) NOT NULL DEFAULT 0,
    omrp            NUMERIC(14,2) NOT NULL DEFAULT 0,
    mrp             NUMERIC(14,2) NOT NULL DEFAULT 0,
    scheme          TEXT NOT NULL DEFAULT '',
    gst             NUMERIC(5,2) NOT NULL DEFAULT 0,
    disc            NUMERIC(5,2) NOT NULL DEFAULT 0,
    tabs_per_strip  NUMERIC(10,2) NOT NULL DEFAULT 1,
    expiry          TEXT NOT NULL DEFAULT '',
    is_lab_test     BOOLEAN NOT NULL DEFAULT false,
    track_stock     BOOLEAN NOT NULL DEFAULT true,
    item_type       TEXT NOT NULL DEFAULT 'medicine',
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_medicines_name ON medicines (lower(name));
CREATE INDEX idx_medicines_batch ON medicines (batch);
CREATE INDEX idx_medicines_distributor_id ON medicines (distributor_id);

-- ---------------------------------------------------------------------------
-- patients (full patient records incl. purchase history / blood tests)
-- ---------------------------------------------------------------------------
CREATE TABLE patients (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    phone             TEXT NOT NULL DEFAULT '',
    age               TEXT,
    gender            TEXT,
    age_gender        TEXT,
    addr              TEXT,
    address           TEXT,
    doc               TEXT,
    doctor            TEXT,
    reason            TEXT,
    total_due         NUMERIC(14,2) NOT NULL DEFAULT 0,
    due_amount        NUMERIC(14,2),
    last_date         TEXT,
    last_visit_date   TEXT,
    total_visits      INTEGER,
    purchase_history  JSONB NOT NULL DEFAULT '[]'::jsonb,
    blood_tests       TEXT[] NOT NULL DEFAULT '{}',
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_phone ON patients (phone);
CREATE INDEX idx_patients_name ON patients (lower(name));

-- ---------------------------------------------------------------------------
-- patients_due (due-khata credit ledger)
-- ---------------------------------------------------------------------------
CREATE TABLE patients_due (
    id            TEXT PRIMARY KEY,
    patient_id    TEXT REFERENCES patients(id) ON DELETE SET NULL,
    name          TEXT NOT NULL,
    phone         TEXT NOT NULL DEFAULT '',
    addr          TEXT NOT NULL DEFAULT '',
    doc           TEXT NOT NULL DEFAULT '',
    reason        TEXT NOT NULL DEFAULT '',
    due           NUMERIC(14,2) NOT NULL DEFAULT 0,
    last_date     TEXT NOT NULL DEFAULT '',
    created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_patients_due_patient_id ON patients_due (patient_id);
CREATE INDEX idx_patients_due_phone ON patients_due (phone);

-- ---------------------------------------------------------------------------
-- sales_history (POS invoices, append-mostly)
-- ---------------------------------------------------------------------------
CREATE TABLE sales_history (
    id                TEXT PRIMARY KEY,
    inv               TEXT,
    invoice_no        TEXT,
    date              TEXT NOT NULL,
    cust              TEXT,
    name              TEXT,
    patient           TEXT,
    patient_id        TEXT REFERENCES patients(id) ON DELETE SET NULL,
    phone             TEXT,
    items             TEXT,
    qty               TEXT,
    amt               NUMERIC(14,2),
    total             NUMERIC(14,2),
    mode              TEXT NOT NULL DEFAULT '',
    items_detail      JSONB NOT NULL DEFAULT '[]'::jsonb,
    subtotal          NUMERIC(14,2),
    discount_percent  NUMERIC(5,2),
    doctor            TEXT,
    address           TEXT,
    age_gender        TEXT,
    paid_amount       NUMERIC(14,2),
    due_amount        NUMERIC(14,2),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_sales_history_date ON sales_history (date);
CREATE INDEX idx_sales_history_patient_id ON sales_history (patient_id);

-- ---------------------------------------------------------------------------
-- expenses
-- ---------------------------------------------------------------------------
CREATE TABLE expenses (
    id          TEXT PRIMARY KEY,
    date        TEXT NOT NULL,
    cat         TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    amt         NUMERIC(14,2) NOT NULL DEFAULT 0,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_expenses_date ON expenses (date);

-- ---------------------------------------------------------------------------
-- needed_meds (medicine order requests)
-- ---------------------------------------------------------------------------
CREATE TABLE needed_meds (
    id          TEXT PRIMARY KEY,
    patient_id  TEXT REFERENCES patients(id) ON DELETE SET NULL,
    med         TEXT NOT NULL DEFAULT '',
    name        TEXT NOT NULL DEFAULT '',
    phone       TEXT NOT NULL DEFAULT '',
    dist        TEXT NOT NULL DEFAULT '',
    time        TEXT NOT NULL DEFAULT '',
    qty         NUMERIC(14,3) NOT NULL DEFAULT 0,
    status      TEXT NOT NULL DEFAULT 'Pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_needed_meds_status CHECK (status IN ('Distributor Ordered','Processing','Pending','Delivered','Cancelled'))
);

CREATE INDEX idx_needed_meds_patient_id ON needed_meds (patient_id);
CREATE INDEX idx_needed_meds_status ON needed_meds (status);

-- ---------------------------------------------------------------------------
-- opd_visits
-- ---------------------------------------------------------------------------
CREATE TABLE opd_visits (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    phone       TEXT NOT NULL DEFAULT '',
    age_sex     TEXT NOT NULL DEFAULT '',
    doc         TEXT NOT NULL DEFAULT '',
    vdate       TEXT NOT NULL DEFAULT '',
    rvdate      TEXT NOT NULL DEFAULT '',
    btest       TEXT NOT NULL DEFAULT '',
    reminder    TEXT NOT NULL DEFAULT '',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_opd_visits_phone ON opd_visits (phone);

-- ---------------------------------------------------------------------------
-- marketing_campaigns
-- ---------------------------------------------------------------------------
CREATE TABLE marketing_campaigns (
    id          TEXT PRIMARY KEY,
    doc         TEXT NOT NULL DEFAULT '',
    date        TEXT NOT NULL DEFAULT '',
    action      TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'Planned',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_marketing_campaigns_status CHECK (status IN ('7-Day Alert Active','Upcoming','Planned','Completed'))
);

-- ---------------------------------------------------------------------------
-- worksheet_tasks
-- ---------------------------------------------------------------------------
CREATE TABLE worksheet_tasks (
    id          TEXT PRIMARY KEY,
    cat         TEXT NOT NULL DEFAULT '',
    description TEXT NOT NULL DEFAULT '',
    date        TEXT NOT NULL DEFAULT '',
    status      TEXT NOT NULL DEFAULT 'Pending',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_worksheet_tasks_status CHECK (status IN ('Pending','In Progress','Planned','Completed'))
);

-- ---------------------------------------------------------------------------
-- daily_register (singleton-per-org record, one row per calendar date)
-- ---------------------------------------------------------------------------
CREATE TABLE daily_register (
    id                      BOOLEAN PRIMARY KEY DEFAULT true,
    date                    TEXT,
    prev_bd                 NUMERIC(14,2) NOT NULL DEFAULT 0,
    today_sell              NUMERIC(14,2) NOT NULL DEFAULT 0,
    phone_pe                NUMERIC(14,2) NOT NULL DEFAULT 0,
    expenses                NUMERIC(14,2) NOT NULL DEFAULT 0,
    bank_shift              NUMERIC(14,2) NOT NULL DEFAULT 0,
    is_locked               BOOLEAN NOT NULL DEFAULT false,
    opening_cash            NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_sales             NUMERIC(14,2) NOT NULL DEFAULT 0,
    cash_sales              NUMERIC(14,2) NOT NULL DEFAULT 0,
    upi_sales               NUMERIC(14,2) NOT NULL DEFAULT 0,
    card_sales              NUMERIC(14,2) NOT NULL DEFAULT 0,
    total_expenses          NUMERIC(14,2) NOT NULL DEFAULT 0,
    denominations           JSONB NOT NULL DEFAULT '{}'::jsonb,
    closing_physical_cash   NUMERIC(14,2) NOT NULL DEFAULT 0,
    cash_difference         NUMERIC(14,2) NOT NULL DEFAULT 0,
    is_drawer_closed        BOOLEAN NOT NULL DEFAULT false,
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_daily_register_singleton CHECK (id = true)
);

-- ---------------------------------------------------------------------------
-- invoice_config (singleton-per-org record)
-- ---------------------------------------------------------------------------
CREATE TABLE invoice_config (
    id                        BOOLEAN PRIMARY KEY DEFAULT true,
    name                      TEXT NOT NULL DEFAULT '',
    store_name                TEXT,
    subtitle                  TEXT,
    dl                        TEXT NOT NULL DEFAULT '',
    gst                       TEXT NOT NULL DEFAULT '',
    phone                     TEXT NOT NULL DEFAULT '',
    wa_group                  TEXT NOT NULL DEFAULT '',
    addr                      TEXT NOT NULL DEFAULT '',
    terms                     TEXT NOT NULL DEFAULT '',
    logo_url                  TEXT,
    retention_months          INTEGER,
    retention_policy_notice   TEXT,
    auto_purge_old_invoices   BOOLEAN NOT NULL DEFAULT true,
    last_purge_date           TEXT,
    director                  TEXT,
    pharmacist                TEXT,
    currency                  TEXT,
    printer_type              TEXT,
    header_theme              TEXT,
    updated_at                TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT chk_invoice_config_singleton CHECK (id = true)
);
