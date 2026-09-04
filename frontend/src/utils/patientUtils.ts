import { PatientRecord } from '../types';
import { nextPatientIdApi } from '../lib/api';

/**
 * Clean phone numbers to pure numeric digits
 */
export function cleanPhoneNumber(phone?: string | null): string {
  if (!phone) return '';
  const digits = String(phone).replace(/\D/g, '');
  // If 12 digits starting with 91, extract the 10 digits
  if (digits.length === 12 && digits.startsWith('91')) {
    return digits.slice(2);
  }
  return digits;
}

/**
 * Strips any "P-"/"P/" display prefix (in any case, with or without the
 * separator) and surrounding whitespace, leaving the raw ID exactly as it
 * is stored in the database. Every patient ID is stored raw (just digits,
 * e.g. "148") — the "P-" is display-only, added by formatPatientId(). This
 * is the inverse of formatPatientId(), used so a staff member can type
 * "148", "P-148" or "P/148" into any ID/search field and get the same
 * match.
 */
export function stripPatientIdPrefix(id?: string | null): string {
  if (!id) return '';
  return String(id).trim().replace(/^P[\s/-]*/i, '').trim();
}

/**
 * Formats a raw patient ID for display: "148" -> "P-148". Used everywhere
 * a Patient ID is shown to staff (tables, receipts, PDFs, search results)
 * so the prefix is always consistent, regardless of how the ID was
 * originally stored (older records may still carry a "P/" prefix baked
 * into the stored id from before this was fixed — see
 * backend/migrations/0010_renumber_patients — this normalizes those too).
 * A non-numeric legacy/manual ID is returned unchanged rather than
 * mangled.
 */
export function formatPatientId(id?: string | null): string {
  const raw = stripPatientIdPrefix(id);
  if (!raw) return '';
  return /^\d+$/.test(raw) ? `P-${raw}` : raw;
}

/**
 * Calculates the next sequential numeric Patient ID (1, 2, 3...).
 * Scans existing records for the highest numeric ID in use so a fresh ID
 * never collides with one already registered, regardless of which modal
 * (OPD, POS or Special Need Order) created the patient. Always returns a
 * raw number (never "P-" prefixed) — every caller stores this directly as
 * patients.id; format it for display with formatPatientId().
 */
export function getNextSequentialPatientId(patients: PatientRecord[] = []): string {
  let maxNum = 0;
  if (Array.isArray(patients)) {
    patients.forEach(p => {
      if (p && p.id) {
        const num = parseInt(stripPatientIdPrefix(p.id), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    });
  }
  return String(maxNum + 1);
}

/**
 * Atomically reserves the next sequential patient ID from the backend
 * (patient_id_seq — see backend/migrations/0009_patient_id_sequence),
 * falling back to the local highest-number-in-list guess only if the
 * request fails (e.g. offline). Prefer this over
 * getNextSequentialPatientId() anywhere the ID is about to be assigned to a
 * *new* patient record — scanning a locally loaded list for "highest number
 * seen + 1" let two devices compute the same ID and collide on the
 * patients.id primary key, with the loser's record silently failing to
 * persist (see useSyncedList: a failed create only surfaces an error toast,
 * it doesn't roll back the optimistic local state).
 */
export async function reserveNextPatientId(patients: PatientRecord[] = []): Promise<string> {
  try {
    const { id } = await nextPatientIdApi.reserve();
    return id;
  } catch (err) {
    console.warn('Could not reserve a server-assigned patient ID, using local fallback:', err);
    return getNextSequentialPatientId(patients);
  }
}

/**
 * Look up a patient by mobile number
 */
export function findPatientByPhone(phone: string, patients: PatientRecord[] = []): PatientRecord | undefined {
  const cleaned = cleanPhoneNumber(phone);
  if (!cleaned || cleaned.length < 4) return undefined;

  return patients.find(p => {
    if (!p.phone) return false;
    const pClean = cleanPhoneNumber(p.phone);
    if (!pClean) return false;
    if (pClean === cleaned) return true;
    if (cleaned.length === 10 && pClean.endsWith(cleaned)) return true;
    if (pClean.length === 10 && cleaned.endsWith(pClean)) return true;
    return false;
  });
}

/**
 * Look up a patient by ID
 */
export function findPatientById(id: string, patients: PatientRecord[] = []): PatientRecord | undefined {
  if (!id || !id.trim()) return undefined;
  const target = stripPatientIdPrefix(id).toLowerCase();
  if (!target) return undefined;
  return patients.find(p => p.id && stripPatientIdPrefix(p.id).toLowerCase() === target);
}
