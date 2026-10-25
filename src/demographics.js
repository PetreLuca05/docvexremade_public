// Gender and birth year: optional, given by the account holder for aggregate
// statistics only (the admin dashboard's Accounts section). Kept in the
// Supabase user's user_metadata, like the newsletter consent:
//   gender           'female' | 'male' | 'other', or absent (not given)
//   birth_year       a year, or absent
//   demographics_at  when they were last given or changed
// See the privacy policy's #demografie section and docs/analytics.md.

export const GENDERS = ['female', 'male', 'other'];

// Accounts are for adults at work: from 16 (GDPR consent age in Romania) to 100.
export const MIN_AGE = 16;
export const MAX_AGE = 100;

export function birthYears(now = new Date()) {
  const top = now.getFullYear() - MIN_AGE;
  return Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => top - i);
}

export const validGender = (g) => (GENDERS.includes(g) ? g : null);

export function validBirthYear(y, now = new Date()) {
  const n = Number(y);
  const year = now.getFullYear();
  return Number.isInteger(n) && n <= year - MIN_AGE && n >= year - MAX_AGE ? n : null;
}

// What a form holds ('' = not given), from the account's metadata.
export const demographicsOf = (meta = {}) => ({
  gender: validGender(meta.gender) ?? '',
  birth_year: validBirthYear(meta.birth_year) ? String(meta.birth_year) : '',
});

// The metadata to save from a form's values; null removes a value.
export function demographicsData({ gender, birth_year }, now = new Date()) {
  const g = validGender(gender);
  const y = validBirthYear(birth_year, now);
  return {
    gender: g,
    birth_year: y,
    demographics_at: g || y ? now.toISOString() : null,
  };
}
