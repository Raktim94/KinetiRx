// Best-effort field extraction for a standalone distributor registration
// document (letterhead, visiting card, DL certificate) — distinct from
// InwardOCRTab's parser, which extracts a distributor alongside a table of
// purchased medicine line items. This one has no items to anchor on, so it
// leans on the same unambiguous-format fields (GSTIN, phone) plus explicit
// labels for the rest, and never fabricates a placeholder value it can't
// support from the text (unlike the invoice parser, there's no line-item
// table forcing a "fill with sane defaults" contract here).
export interface ExtractedDistributorFields {
  name?: string;
  gstin?: string;
  phone?: string;
  addr?: string;
  dlNo?: string;
  email?: string;
  contactPerson?: string;
}

const LABELED_LINE = /^(?:m\/s\.?|name|distributor|supplier|agency|firm)\s*[:.-]\s*(.+)$/i;

export function extractDistributorFields(text: string): ExtractedDistributorFields {
  const fields: ExtractedDistributorFields = {};
  const lines = text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return fields;

  // GSTIN and a 10-digit Indian mobile have a fixed, unambiguous shape, so
  // these are found by scanning the whole text rather than relying on a label.
  const gstinMatch = text.match(/\b\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]\b/);
  if (gstinMatch) fields.gstin = gstinMatch[0];

  const phoneMatch = text.match(/(?:\+?91[\s-]?|0)?\b([6-9]\d{9})\b/);
  if (phoneMatch) fields.phone = phoneMatch[1];

  const emailMatch = text.match(/\b[\w.+-]+@[\w-]+\.[a-z]{2,}\b/i);
  if (emailMatch) fields.email = emailMatch[0];

  // Drug license numbers on Indian pharma paperwork are near-freeform, so
  // this only trusts an explicit "DL No" / "License No" label rather than
  // guessing from a bare alphanumeric string.
  const dlMatch = text.match(/(?:drug\s*licen[cs]e|d\.?l\.?)\s*(?:no\.?)?\s*[:.-]?\s*([A-Za-z0-9/-]{5,20})/i);
  if (dlMatch) fields.dlNo = dlMatch[1];

  const contactMatch = text.match(/(?:contact\s*person|contact|area\s*manager|prop(?:rietor)?)\s*[:.-]\s*([A-Za-z .]{3,40})/i);
  if (contactMatch) fields.contactPerson = contactMatch[1].trim();

  const addrMatch = text.match(/(?:add(?:ress)?)\s*[:.-]\s*(.+)/i);
  if (addrMatch) fields.addr = addrMatch[1].trim();

  for (const line of lines) {
    const labeled = line.match(LABELED_LINE);
    if (labeled) {
      fields.name = labeled[1].trim();
      break;
    }
  }

  // No explicit "Name:"/"M/s:" label found — a registration document's
  // company name is almost always its letterhead, i.e. the first
  // non-empty line, same heuristic InwardOCRTab uses for purchase bills.
  if (!fields.name) {
    const firstLine = lines[0];
    if (firstLine && /^[A-Za-z][A-Za-z .&'-]{4,60}$/.test(firstLine) && !fields.gstin?.includes(firstLine)) {
      fields.name = firstLine.replace(/\s+/g, ' ').trim();
    }
  }

  // Fall back to any line long enough to plausibly be a postal address
  // (has a digit, e.g. a PIN code or house number, and enough letters) when
  // no explicit "Address:" label was present.
  if (!fields.addr) {
    const candidate = lines.find(
      l => l !== fields.name && /\d/.test(l) && /[A-Za-z]{3,}/.test(l) && l.length >= 12 && l.length <= 100
    );
    if (candidate) fields.addr = candidate;
  }

  return fields;
}
