-- Sequential patient IDs (the "P/107" / bare "108" numbers shown throughout
-- the app) were computed independently client-side in three separate places
-- (AddPatientModal, POSTab, AddOPDModal/AddNeedMedModal via
-- getNextSequentialPatientId) by scanning whatever patient list happened to
-- be loaded in that browser tab. Two staff on two terminals (or even one
-- tab with a stale list) can compute the same "next" number; the second
-- INSERT then hits the patients.id primary key and is rejected with 409,
-- but the frontend's optimistic update already added it to local state, so
-- the record looked saved and silently vanished on next reload — the
-- record never actually persisted. A DB sequence makes "next ID" atomic and
-- collision-free regardless of how many clients ask for one concurrently.
--
-- Seeded above the highest numeric ID already in use (from either format)
-- so newly issued numbers never collide with pre-existing patient records.
DO $$
DECLARE
  max_num INTEGER;
BEGIN
  SELECT COALESCE(MAX((regexp_match(id, '(\d+)$'))[1]::INTEGER), 100) INTO max_num FROM patients;
  EXECUTE format('CREATE SEQUENCE IF NOT EXISTS patient_id_seq START WITH %s', max_num + 1);
END $$;
