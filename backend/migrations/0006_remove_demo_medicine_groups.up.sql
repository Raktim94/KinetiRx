-- ---------------------------------------------------------------------------
-- 0003_medicine_groups seeded two demo doctor names ("Dr. Sayan Majumdar",
-- "Dr. T.K. Khan") alongside the genuinely useful "General" default, matching
-- what used to be hardcoded in AddStockModal's picker. They read as real
-- data on every fresh install (and every already-deployed one, since
-- migrations only ever run forward) even though nobody ever entered them.
-- Removed here rather than in a fresh 0003 rewrite so this cleanly applies
-- to already-deployed databases too. Only removed by id (not by name), so a
-- pharmacy that happens to have genuinely renamed/reused these exact ids is
-- unaffected; if they separately typed a doctor with the same name under a
-- new id, that row is untouched.
-- ---------------------------------------------------------------------------

DELETE FROM medicine_groups WHERE id IN ('dr-sayan-majumdar', 'dr-tk-khan');
