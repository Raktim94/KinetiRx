# Changelog

Full version history for KinetiRx. The CasaOS manifests (`casaos/docker-compose.yml`
and the CasaOS-AppStore submission copy) only carry the current version's notes
in `x-casaos.release_notes` — pasting the full history there made the compose
file large enough to trip CasaOS's "Install a customized app" paste-content
validation (it works fine as a URL fetch, but a ~9KB block of release notes on
top of the rest of the manifest can overflow the browser paste-box path and
show a generic "Please confirm the input content" error instead of installing).
This file is the source of truth for history; the manifest keeps only the
latest entry plus a link back here.

## 1.6.3

Fixed on-device OCR purchase-bill scanning (Inward Stock — the fallback
used whenever `GEMINI_API_KEY` isn't configured) silently corrupting live
inventory on real scanned distributor invoices. Verified against two real
GST purchase bills: a misread decimal point on a photographed table
(Tesseract reading "205.31" as "20531") produced a row that would have
added 20,531 units of one medicine to stock, and the whole invoice's
computed total came out to ~₹3.2 crore for what was actually a ₹5,879
bill — because the parser took the two largest numbers on a garbled line
as MRP/rate with no plausibility check, and the result auto-commits
straight to stock. A second bug let the invoice's own "LESS RET/CR NOTE"
footer line get scraped in as a fake extra medicine when OCR garbled text
in front of it.

Both are fixed: implausible quantities/prices (qty > 2000, MRP or rate
over ₹5,000 — already 5x the highest genuine value in the real sample
invoices) are now rejected instead of committed, with the count of
skipped lines surfaced in the existing "double-check before trusting
this" notice so nothing silently disappears without a trace. This does
not make on-device OCR perfectly accurate on a photographed dense
table — item names and some batch numbers can still come out garbled,
which is why that notice exists — it stops a bad read from silently
wrecking real stock/pricing data.

## 1.6.2

Fixed every fresh install crash-looping forever at startup with `startup:
failed to apply migrations: apply migration 0010_renumber_patients: ERROR:
setval: value 0 is out of bounds for sequence "patient_id_seq"`.
`0010_renumber_patients` (added in 1.6.0) unconditionally called
`setval('patient_id_seq', COALESCE(MAX(id::int), 0), true)` — on a brand
new install with zero patients, `MAX(id::int)` is `NULL`, `COALESCE`s down
to `0`, and Postgres sequences reject `0` as below their default `MINVALUE`
of `1`. Every 1.6.0/1.6.1 install with no pre-existing patients hit this
unconditionally; an install already carrying real patient data (an
in-place upgrade) never did, since `MAX(id::int)` was never `NULL` for it —
which is why this went unnoticed until now. Fixed by special-casing the
zero-patients case to `setval('patient_id_seq', 1, false)` instead.

## 1.6.1

Fixed two UI bugs that made the app look visibly different from its intended
design. The heading/body/mono fonts (Fraunces, IBM Plex Sans, IBM Plex Mono)
were loaded from a Google Fonts CDN link — on a LAN-only CasaOS/NAS box with
restricted or no outbound internet, that request silently fails and the whole
UI falls back to generic system fonts. The fonts are now vendored and
self-hosted with the app, with no external dependency. Also fixed every
modal's open animation (fade + scale-in) silently doing nothing across the
entire app — the animation utility classes were used everywhere but the
styles that implement them were never actually wired in.

## 1.6.0

Patient IDs across OPD, POS, Add Patient and Special Need Order were
sometimes stored as a bare number ("147") and sometimes as "P/146" depending
on which screen created them, and the suggested next ID could be lower than
one already issued. Every patient ID is now stored as a plain number and
shown everywhere as "P-<n>"; existing patients are renumbered to a clean
1, 2, 3... (by registration date) on upgrade, and you can search/type an ID
with or without the "P-" and it still matches. Fixed a bug in the Inward OCR
review table where correcting a misread item's name failed to update the
stock record it was supposed to fix, silently leaving the original (wrong)
entry in stock. Added an Edit action to every Medicine Stock row (name,
price, quantity, batch, expiry, everything). Adding stock for an item that
already exists now adds to its quantity instead of creating a duplicate row,
matching how the OCR auto-scan already worked. The barcode dialog can now
assign an item's real manufacturer barcode (USB scan or type it in) instead
of only generating a new one, and scanning a barcode while Medicine Stock is
open jumps straight to that item's Edit form for a fast restock. Renamed
"Smart Pharmacy POS" to plain "POS" in the sidebar and page header.

## 1.5.1

Fixed purchase-bill OCR scanning (Inward Stock) failing outright with
"Could not detect medicine items" on any photo/camera scan whenever
GEMINI_API_KEY isn't configured — image scans now fall back to a fully
offline on-device OCR engine (the same one used for patient-ID card
scanning), with images auto-downscaled first so it stays fast on modest
hardware. Real server AI errors are now shown instead of a generic message.
Fixed POS not clearing the cart and patient form after generating a bill, so
the counter no longer stays loaded with the previous customer's details
until "+ New Bill" is clicked by hand. Fixed the suggested Patient ID (in
POS billing, OPD registration, and Add Patient) consuming a real sequence
number on every page reload, modal open, or — in OPD — nearly every
keystroke of an unmatched phone number, instead of only when a patient is
actually saved; it no longer jumps around for no reason.

## 1.5.0

Added bulk stock import from a CSV or Excel file (Medicine Stock -> Import
CSV / Excel), with a downloadable template and a preview of what will be
added before you confirm. Add Stock now lets you pick a Pack Type
(Strip/Bottle/Tube/Vial/Ampoule/Sachet/Box/Jar) instead of assuming
everything is a tablet strip, with a live loose-dispensing price preview —
so syrups, ointments and injectables can have a correct per-ml/per-gm loose
price, calculated the same GST-inclusive way as strips. Fixed a real bug
where "Generate Barcode" (Inventory or POS) silently failed to save — the
barcode column never existed in the database, so it reappeared as
unassigned after every refresh; barcodes generated from now on persist
properly and the barcode dialog updates immediately instead of needing to
be reopened. Added a barcode/print action directly to POS item rows.

## 1.4.2

Fixed Add Stock's "Type New Custom Distributor" option doing nothing on a
fresh install with no distributors yet. Removed pre-filled placeholder-
looking data across the app so new entries start genuinely blank instead of
needing to be noticed and overwritten: Add Stock and Add Lab Stock fields,
four separate hardcoded demo doctor lists (now one real, empty-by-default
list shared across OPD/POS/Patients), 6 fake lab tests that used to appear
in every install's POS, and two demo doctor names a prior version had
seeded into the database. Every new employee account now gets a random
temporary password instead of the same static default. Fixed a bug where
OPD patient registration could silently record a fabricated age/gender when
left blank, or fail outright with a save error. Fixed the OPD-to-patient
link not actually being saved. Fixed a deeper bug that could occasionally
create duplicate records (or fail with a "already exists" error) when
adding stock, distributors, or other list-backed data.

## 1.4.1

Removed the Bengali subtitles from the OPD and Special Need Medicine Order
forms and the POS stock badge — labels are English-only now. No functional
changes.

## 1.4.0

OPD and Special Need Medicine Order registration now match the full
clinical workflow — sequential patient IDs starting at 1 (shared and
collision-free across both forms), doctor add/remove management, a
multi-medicine order list with unit (Strips/Vials/Boxes/etc) and a
tablets-per-strip field that calculates the loose-tablet count, and inline
supplier registration. POS gained real barcode/QR scanning — a USB hardware
scanner is picked up automatically, or scan with the camera — plus barcode
generation and printable labels from Inventory. Added a self-service S3
offsite backup (Settings -> S3 Offsite Backup): point it at your own
S3-compatible bucket (AWS S3, R2, Backblaze, MinIO...), scheduled + manual
backups that are verified by downloading them back and checksum-comparing
before being trusted, restore from a verified backup or a locally
re-uploaded file, and a one-click local backup download — all gated behind
admin auth and a typed confirmation for anything destructive. Settings also
gained a Currency picker (now reflected across POS, invoices, receipts, and
every report/export), a GST rate field when adding stock, and a GST filing
export (HSN-wise taxable value / tax summary for return filing).
Consolidated Invoice Settings and Backup & Reset into a single Settings
entry. Cleaned up decorative emoji from receipts, WhatsApp messages, and UI
text throughout.

## 1.3.0

Fixed thermal receipt printing (80mm/58mm and A4 now render correctly
instead of losing all layout in the print window) with a per-bill format
picker. Added live sync so a second cashier/pharmacist/director counter
sees new sales, stock, due-khata, and register changes without a manual
refresh; an admin-configurable Master Security PIN as a second factor for
System Reset; and Purchase Order generation (print/download/WhatsApp) from
the Medicine Orders shortage book, grouped by distributor.

## 1.2.1

Fixed text/badge contrast across the app that made stock levels, expiry
warnings, and the Daily Sales Register hard to read, and fixed a bug where
completing a POS sale with the patient's age filled in could fail to
generate the bill.

## 1.2.0

Updated the UI with a calmer color palette, refreshed typography, and a
consistent button/card style throughout the app. Also adds doctor/stock
groups management, a low-stock reorder workflow, editable patient records
and needed-medicine orders, and a forced password-change flow for employee
accounts (self-service password change, not the old admin-driven reset
hack).

## 1.1.0

On first launch, create the admin account from a proper sign-up screen in
the app instead of pre-setting a password via environment variable —
KINETIRX_ADMIN_PASSWORD is now optional and left blank in this manifest.

## 1.0.0

Initial CasaOS/ZimaOS release: POS billing, medicine inventory, patient
records, OPD scheduling, due-khata credit ledger, daily sales/cash-drawer
reconciliation, expenses, and role-based employee accounts.
