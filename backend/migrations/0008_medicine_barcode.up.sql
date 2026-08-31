-- The frontend's BarcodeModal ("Generate Barcode" / scan-to-bill) has always
-- read and written a `barcode` field on Medicine, but the medicines table
-- never had a column for it — every generated barcode was silently dropped
-- on save and reappeared as "No barcode assigned yet." on the next refresh.
-- Nullable + a partial unique index (most rows have no barcode yet, but two
-- rows must never share one once assigned, since POS scan-to-bill looks
-- items up by this value).
ALTER TABLE medicines ADD COLUMN barcode TEXT;
CREATE UNIQUE INDEX medicines_barcode_key ON medicines (barcode) WHERE barcode IS NOT NULL;
