-- ---------------------------------------------------------------------------
-- must_change_password: set true whenever an admin creates or resets an
-- employee's password, so the app can force them to pick their own password
-- on first login instead of continuing to use the admin-assigned one.
-- ---------------------------------------------------------------------------

ALTER TABLE employees
    ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT false;
