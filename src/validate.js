// Checks for the account forms, run as the visitor types. Each returns error
// codes (the forms word them in the page's language); Supabase checks again
// on its side, these only give quicker and clearer feedback.

// A name: letters (any alphabet, with diacritics), spaces, hyphens,
// apostrophes and dots; 2 to 80 characters.
export function checkName(value) {
  const name = value.trim();
  if (!name) return 'required';
  if (name.length < 2) return 'tooShort';
  if (name.length > 80) return 'tooLong';
  if (!/^[\p{L}][\p{L}\p{M}\s.'’-]*$/u.test(name)) return 'invalidChars';
  return null;
}

// Common mail domains, for "did you mean …?" on a likely typo.
const DOMAINS = [
  'gmail.com',
  'yahoo.com',
  'yahoo.ro',
  'outlook.com',
  'hotmail.com',
  'live.com',
  'icloud.com',
  'proton.me',
  'protonmail.com',
];

function distance(a, b) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      d[i][j] = Math.min(
        d[i - 1][j] + 1,
        d[i][j - 1] + 1,
        d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
  }
  return d[a.length][b.length];
}

// { error, suggestion }: error is a code or null; suggestion a corrected
// address when the domain looks like a typo of a common one.
export function checkEmail(value) {
  const email = value.trim();
  if (!email) return { error: 'required' };
  if (/\s/.test(email)) return { error: 'spaces' };
  const at = email.lastIndexOf('@');
  if (at < 1) return { error: 'noAt' };
  const local = email.slice(0, at);
  const domain = email.slice(at + 1).toLowerCase();
  if (!domain) return { error: 'noDomain' };
  if (local.length > 64 || email.length > 254) return { error: 'tooLong' };
  if (/^\.|\.$|\.\./.test(local)) return { error: 'dots' };
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,}$/.test(domain)) return { error: 'domain' };
  if (!DOMAINS.includes(domain)) {
    const near = DOMAINS.find((d) => distance(domain, d) <= 2);
    if (near) return { error: null, suggestion: `${local}@${near}` };
  }
  return { error: null };
}

// Passwords too common to allow, whatever else they pass.
const COMMON = new Set([
  'password',
  'password1',
  'parola',
  'parola123',
  'qwerty',
  'qwerty123',
  'azerty',
  '12345678',
  '123456789',
  '1234567890',
  'iloveyou',
  'admin123',
  'welcome1',
  'docvex',
  'docvex123',
  'abc12345',
  'letmein1',
]);

// The password rules, each { id, ok, required }, and a strength from 0 to 4.
export function checkPassword(password, { email = '', name = '' } = {}) {
  const lower = password.toLowerCase();
  const personal = [email.split('@')[0], ...name.split(/\s+/)]
    .map((p) => p.trim().toLowerCase())
    .filter((p) => p.length >= 3);
  const rules = [
    { id: 'length', ok: password.length >= 8, required: true },
    { id: 'letters', ok: /\p{L}/u.test(password), required: true },
    { id: 'digit', ok: /\d/.test(password), required: true },
    { id: 'cases', ok: /\p{Ll}/u.test(password) && /\p{Lu}/u.test(password), required: false },
    { id: 'symbol', ok: /[^\p{L}\d\s]/u.test(password), required: false },
    {
      id: 'personal',
      ok: password.length > 0 && !personal.some((p) => lower.includes(p)),
      required: true,
    },
    {
      id: 'common',
      ok: password.length > 0 && !COMMON.has(lower) && !/^(.)\1+$/.test(password),
      required: true,
    },
    { id: 'edges', ok: password.length > 0 && password === password.trim(), required: true },
  ];
  const valid = rules.every((r) => !r.required || r.ok);
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (rules.find((r) => r.id === 'cases').ok) score++;
  if (rules.find((r) => r.id === 'symbol').ok) score++;
  if (!valid) score = Math.min(score, 1);
  return { rules, valid, score: password ? score : 0 };
}
