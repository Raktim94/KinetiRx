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
 * Calculates the next sequential numeric Patient ID (1, 2, 3...).
 * Scans existing records for the highest numeric ID in use so a fresh ID
 * never collides with one already registered, regardless of which modal
 * (OPD or Special Need Order) created the patient.
 */
export function getNextSequentialPatientId(patients: PatientRecord[] = []): string {
  let maxNum = 0;
  if (Array.isArray(patients)) {
    patients.forEach(p => {
      if (p && p.id) {
        // Extract all numeric sequences from the ID
        const match = String(p.id).match(/\d+/g);
        if (match && match.length > 0) {
          const num = parseInt(match[match.length - 1], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
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
  const target = id.trim().toLowerCase();
  return patients.find(p => p.id && p.id.trim().toLowerCase() === target);
}
