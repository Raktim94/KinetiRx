-- opd_visits was missing patient_id even though the frontend's OPD modal
-- links a visit to a registered patient (auto-fetching/creating a patient
-- record by phone/sequential ID) — the link was silently dropped on save
-- since there was nowhere in the schema to store it.
ALTER TABLE opd_visits ADD COLUMN patient_id TEXT;
