-- Renumbers every existing patient to a clean 1, 2, 3... sequence (ordered
-- by created_at, i.e. registration order) and propagates the new ID to
-- every table that stores it, then resets patient_id_seq (see 0009) so the
-- next reserved ID continues cleanly right after the last renumbered one.
--
-- Needed because 0009 seeded patient_id_seq at (highest numeric ID already
-- in use, or 100 if none) regardless of how many real patients actually
-- existed, and abandoned reservations (a modal opened, an ID reserved, the
-- visit never saved) leave permanent gaps — so a handful of real patients
-- ended up numbered 146/147 instead of 1/2. This is a one-time cleanup;
-- going forward, gaps from abandoned reservations are expected and fine —
-- only the *starting point* and *initial* numbering needed fixing.
--
-- sales_history, patients_due and needed_meds hold patients.id via a
-- (default NOT DEFERRABLE) foreign key, so renaming a patient's id fails
-- immediately the moment a child row still points at the old value. Defer
-- those three constraints for this transaction only, restoring their
-- original timing before commit.
ALTER TABLE patients_due  ALTER CONSTRAINT patients_due_patient_id_fkey  DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE sales_history ALTER CONSTRAINT sales_history_patient_id_fkey DEFERRABLE INITIALLY DEFERRED;
ALTER TABLE needed_meds   ALTER CONSTRAINT needed_meds_patient_id_fkey   DEFERRABLE INITIALLY DEFERRED;
SET CONSTRAINTS ALL DEFERRED;

CREATE TEMP TABLE patient_renumber ON COMMIT DROP AS
  SELECT id AS old_id, row_number() OVER (ORDER BY created_at, id) AS new_id
  FROM patients;

-- Two-pass rename on patients.id itself: old and new numbering can overlap
-- (e.g. old id '2' renumbers to new id '5' while old id '5' renumbers to
-- '2'), and the primary key is checked per row, not deferred — stage
-- through a value shape no real patient id can already have.
UPDATE patients p SET id = 'TMP-' || r.new_id::text
  FROM patient_renumber r WHERE p.id = r.old_id;
UPDATE patients p SET id = r.new_id::text
  FROM patient_renumber r WHERE p.id = 'TMP-' || r.new_id::text;

UPDATE patients_due t SET patient_id = r.new_id::text
  FROM patient_renumber r WHERE t.patient_id = r.old_id;
UPDATE sales_history t SET patient_id = r.new_id::text
  FROM patient_renumber r WHERE t.patient_id = r.old_id;
UPDATE needed_meds t SET patient_id = r.new_id::text
  FROM patient_renumber r WHERE t.patient_id = r.old_id;
-- opd_visits.patient_id has no FK (see 0007) but still needs to stay in
-- sync so an OPD visit still resolves to the right renumbered patient.
UPDATE opd_visits t SET patient_id = r.new_id::text
  FROM patient_renumber r WHERE t.patient_id = r.old_id;

-- Force the deferred FK checks to run now, inside this transaction, while
-- we can still see and report a real violation — Postgres refuses to
-- ALTER a constraint's deferrability while any check on it is still
-- pending, so leaving these deferred until COMMIT would make the ALTERs
-- below fail with "pending trigger events".
SET CONSTRAINTS ALL IMMEDIATE;

ALTER TABLE patients_due  ALTER CONSTRAINT patients_due_patient_id_fkey  NOT DEFERRABLE;
ALTER TABLE sales_history ALTER CONSTRAINT sales_history_patient_id_fkey NOT DEFERRABLE;
ALTER TABLE needed_meds   ALTER CONSTRAINT needed_meds_patient_id_fkey   NOT DEFERRABLE;

SELECT setval('patient_id_seq', COALESCE((SELECT MAX(id::int) FROM patients), 0), true);
