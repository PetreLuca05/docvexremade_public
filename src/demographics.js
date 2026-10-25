// Gender and date of birth: optional, given by the account holder for
// aggregate statistics only (the admin dashboard's Accounts section). Kept in
// the Supabase user's user_metadata, like the newsletter consent:
//   gender           'female' | 'male' | 'other', or absent/null (not given)
//   birth_date       'YYYY-MM-DD', or absent/null
//   demographics_at  when they were last given or changed
// See the privacy policy's #demografie section and docs/analytics.md.

export const GENDERS = ['female', 'male', 'other'];

// Accounts are for adults at work: from 16 (GDPR consent age in Romania) to 100.
export const MIN_AGE = 16;
export const MAX_AGE = 100;

const pad = (n) => String(n).padStart(2, '0');

export function birthYears(now = new Date()) {
  const top = now.getFullYear() - MIN_AGE;
  return Array.from({ length: MAX_AGE - MIN_AGE + 1 }, (_, i) => top - i);
}

export const daysIn = (year, month) =>
  new Date(Number(year) || 2000, Number(month) || 1, 0).getDate();

export const validGender = (g) => (GENDERS.includes(g) ? g : null);

// Age in whole years on `now`.
export function ageOn(date, now = new Date()) {
  const [y, m, d] = date.split('-').map(Number);
  let age = now.getFullYear() - y;
  if (now.getMonth() + 1 < m || (now.getMonth() + 1 === m && now.getDate() < d)) age--;
  return age;
}

// 'YYYY-MM-DD' when it is a real date and the age is within limits, else null.
export function validBirthDate(value, now = new Date()) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(value ?? ''));
  if (!m) return null;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > daysIn(y, mo)) return null;
  const age = ageOn(m[0], now);
  return age >= MIN_AGE && age <= MAX_AGE ? m[0] : null;
}

// What a form holds ('' = not given), from the account's metadata.
export function demographicsOf(meta = {}) {
  const date = validBirthDate(meta.birth_date);
  const [y, m, d] = date ? date.split('-') : ['', '', ''];
  return {
    gender: validGender(meta.gender) ?? '',
    birth_day: d ? String(Number(d)) : '',
    birth_month: m ? String(Number(m)) : '',
    birth_year: y,
  };
}

const dateOf = ({ birth_day: d, birth_month: m, birth_year: y }) =>
  d && m && y ? `${y}-${pad(m)}-${pad(d)}` : '';

// Why a form's date can't be saved, or null: 'partial' (some of day, month
// and year chosen, not all), 'invalid' (no such day), 'age' (under 16).
export function demographicsError(value, now = new Date()) {
  const parts = [value.birth_day, value.birth_month, value.birth_year].filter(Boolean).length;
  if (parts === 0) return null;
  if (parts < 3) return 'partial';
  const date = dateOf(value);
  if (Number(value.birth_day) > daysIn(value.birth_year, value.birth_month)) return 'invalid';
  return validBirthDate(date, now) ? null : 'age';
}

// The metadata to save from a form's values; null removes a value. (The
// earlier `birth_year` key is cleared: the full date replaces it.)
export function demographicsData(value, now = new Date()) {
  const gender = validGender(value.gender);
  const birth_date = validBirthDate(dateOf(value), now);
  return {
    gender,
    birth_date,
    birth_year: null,
    demographics_at: gender || birth_date ? now.toISOString() : null,
  };
}

export const EMPTY_DEMOGRAPHICS = { gender: '', birth_day: '', birth_month: '', birth_year: '' };
