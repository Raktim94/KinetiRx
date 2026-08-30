// Deliberately empty — a fresh install shouldn't show made-up staff names.
// Doctors are added from the OPD modal's "+ Custom" / "Manage / Remove" flow.
export const defaultDoctors: string[] = [];

const LOCAL_STORAGE_KEY = 'kinetirx_doctor_list_v1';

export function loadDoctors(): string[] {
  try {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load doctor list from localStorage:', err);
  }
  return [...defaultDoctors];
}

export function saveDoctors(doctors: string[]): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(doctors));
  } catch (err) {
    console.error('Failed to save doctor list to localStorage:', err);
  }
}
