INSERT INTO medicine_groups (id, name) VALUES
    ('dr-sayan-majumdar',   'Dr. Sayan Majumdar'),
    ('dr-tk-khan',          'Dr. T.K. Khan')
ON CONFLICT (id) DO NOTHING;
