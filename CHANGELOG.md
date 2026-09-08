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

## 1.6.9

Added a Settings section ("AI OCR / Vision Model") to configure accurate
AI-vision purchase-bill scanning and the clinical assistant without
touching server environment variables: any OpenAI-compatible endpoint —
Gemini's own OpenAI-compat endpoint, OpenAI itself, OpenRouter, Groq, a
local Ollama vision model, etc. — not just Google's native Gemini API.

- New `ai_provider_config` table stores the operator-entered base URL,
  model, and API key; the key is AES-256-GCM encrypted at rest using the
  same `BACKUP_ENCRYPTION_KEY` that already protects the S3 backup secret
  (one operator-supplied key now protects every secret this app stores,
  rather than a second one being required).
- New admin-only `GET/POST/DELETE /api/ai-config` endpoints; saving tests
  the endpoint with a live request first, so a typo in the URL/model/key
  is caught immediately rather than at the next bill scan.
- Bill scanning and the assistant now resolve the AI backend in priority
  order: the Settings-configured provider, then the legacy `GEMINI_API_KEY`
  environment variable (unchanged, still zero-config), then offline
  fallback — an existing deployment that only ever set the env var keeps
  working exactly as before.
- Verified end-to-end against a real Docker Compose stack: fresh migration
  applies cleanly, save-and-test / status / delete all round-trip
  correctly through encryption, and both OCR bill scanning and the AI
  assistant correctly route through the configured provider.

## 1.6.8

Follow-up to 1.6.7 after re-testing the offline OCR fallback against the
same two real invoices repeatedly: Tesseract's raw text output turned out
to vary from run to run on the *identical* preprocessed image (confirmed
by re-running it several times), so single-run testing wasn't catching
every failure shape. Three more real bugs found and fixed from that wider
testing:

1. When a line's HSN/Batch/ExpDt column anchors were *all* unreadable, the
   parser had no boundary to stop the "name" at and took every remaining
   token on the line — reproduced against a real bill where this created a
   medicine literally named "SVOCITA LS TAR HOOTON 20831 77828701 04727
   20831 15643 400 0.00 $% 40 52" (the whole raw line, price columns
   included). Now rejects the row instead of guessing without any anchor
   at all.
2. The same missing-anchor case was also silently turning the GST-summary
   footer lines (SGST/CGST calculation rows) into fake medicine entries
   whenever OCR happened to garble "SGST"/"CGST" past keyword recognition
   but leave a plausible-looking decimal number nearby. Fixed by the same
   anchor requirement above.
3. MRP/Rate values over ₹5,000 (never genuine on any real sample invoice)
   are now treated as a dropped decimal point and recovered by dividing by
   100 — e.g. a misread "20831" becomes 208.31 — instead of always being
   rejected outright, which is what was making the on-device fallback
   produce zero usable items on some real OCR passes even after the 1.6.7
   image-quality fix.
4. The distributor-name letterhead match now accepts "DISTRIBUT" as a
   prefix instead of requiring the exact full word "DISTRIBUTOR" — OCR
   commonly drops the trailing 1-2 characters of a word on a real
   photographed letterhead, which a full-word match was missing outright.

**Known remaining limitation, not fixable by more parsing logic:** on a
dense, small-print invoice table, Tesseract's underlying character
recognition itself is sometimes simply wrong — no downstream heuristic can
recover a value that was never read correctly in the first place, and
which specific rows/fields come out wrong varies from scan to scan of the
same bill. The on-device/free-OCR path (and the free Puter.js option added
in 1.6.6) should still always be spot-checked against the physical bill
before billing against the resulting stock, exactly as the in-app warning
banner already says. For invoices photographed at this density, setting
`GEMINI_API_KEY` (Settings) routes bill scanning through the AI vision
model instead, which reads the table structure directly rather than
recovering it from character-level OCR text — this is the only way to get
consistently accurate extraction on bills like these.

## 1.6.7

Fixed two real accuracy bugs in the on-device (fully offline, no API key)
OCR fallback used by both Inward Stock bill scanning and patient-ID/phone
scanning, found from two real distributor invoice photos that came back
almost entirely garbled (distributor read as "C UMA MEDICINE DISTRIBUTOR"
instead of "NEW UMA...", item names like "TEE", scrambled batch/rate
columns):

1. The image sent to Tesseract was only ever downscaled, never upscaled —
   a bill photographed at a normal distance (long edge well under the
   1600px cap) went to OCR at its native low resolution with color-channel
   JPEG noise still in place. Now normalizes to grayscale and upscales up
   to 2x (capped at 3200px long edge) before OCR. Verified against both
   real invoices: the same two bills that previously produced "N/A"
   distributor/GSTIN/phone and unreadable item names now correctly read
   the distributor name and every item name legibly.
2. The line-item parser's "does this line look like a table row" check
   only required one digit plus 3+ letters anywhere in the line — a short
   burst of OCR noise off the letterhead/logo could satisfy that as easily
   as a real row, and one real bill's garbled header noise ("4 a TEE") was
   silently accepted as a genuine line and created a fake "TEE" medicine
   (qty 4, ₹3 rate) in live stock. Now requires at least 6 tokens, well
   below what any real row in this column layout actually has (12-13),
   before attempting to parse a line as an item.

## 1.6.6

Added an opt-in free/unlimited cloud OCR option for Inward Stock bill
scanning, backed by [Puter.js](https://developer.puter.com/tutorials/free-unlimited-ocr-api/)
(`js.puter.com`, no API key or backend wiring — the end user's own free
Puter account covers usage). Off by default; toggle it from the Supplier
Purchase Bill Auto-Scan (OCR) tab or from Settings. When enabled, a scan
tries the paid server AI first, then Puter.js, then falls back to fully
offline on-device OCR — each result is flagged with which path produced
it so it's clear when to double-check the numbers before billing against
that stock.

## 1.6.5

Fixed the Inward Stock offline OCR fallback silently registering purchases
under a generic "SUPPLIER DISTRIBUTOR" placeholder instead of the real
distributor name. The distributor-letterhead detection only accepted an
exact-shape match on the very first recognized line; real on-device OCR of
a photographed bill routinely prepends/appends stray punctuation to that
line (commas, em-dashes, misread border rules) or garbles it outright and
pushes the real letterhead text down a line or two, and both silently fell
through to the placeholder. Rewritten to search the first 8 lines, strip
OCR noise characters from each candidate instead of requiring it to
already be clean, and prefer a line containing a distributor-shaped
keyword (DISTRIBUTOR, PHARMA, REMEDIES, etc.) over whichever
plausible-looking line comes first — since a bill's buyer name is just as
likely to survive OCR cleanly and would otherwise win by appearing first.
Verified against the real tesseract.js output for two real distributor
invoices: one now resolves to the exact correct name, the other to a
close, easily-corrected match — both a large improvement over the
placeholder they produced before.

## 1.6.4

Added offline OCR "Scan Document" registration for distributors: point the
camera at (or upload a photo of) a distributor's own letterhead, visiting
card, or DL certificate and it registers automatically — no purchase
invoice or line items needed, unlike the existing Inward Stock bill-scan
flow. Runs fully offline on-device, same pipeline as patient-ID scanning.
Merges into an existing distributor (matched by GSTIN or name) instead of
creating a duplicate.

Also fixes a real accuracy bug in the Inward Stock on-device OCR fallback
(used when no `GEMINI_API_KEY` is set), found while testing against two
real distributor invoices: the whitespace-tabular parser picked "the two
largest numbers on the line" as MRP/Rate, which actually grabbed
Amount+OMRP instead whenever a row had more than two price-shaped numbers
— true on every line of the exact column layout (Qty/Pack/Description/
HSN/OMRP/Batch/ExpDt/MRP/Rate/Disc%/Scheme%/GST%/Amount) the parser's own
code comment targets. This inflated computed stock cost by 40-60% while
each individual number still looked plausible, so the 1.6.3 implausible-
value guard never caught it. HSN and GST% were also hardcoded regardless
of the invoice's real per-row values, and a dosage number embedded in a
drug name (e.g. "PENTIDS 400MG TAB") could be mistaken for the batch
number and truncate the name. Rewritten to anchor on the expiry-date token
(the one column with an unambiguous shape) and derive HSN/Batch/MRP/Rate
positionally relative to it. Re-verified against the same two real
invoices — computed totals now match each invoice's printed Gross Amount
exactly.

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
