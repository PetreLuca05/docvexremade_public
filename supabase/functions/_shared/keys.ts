// The keys the website's functions call Supabase with: the project's new
// API keys, which Supabase gives every function as JSON keyed by name
// (SUPABASE_SECRET_KEYS, SUPABASE_PUBLISHABLE_KEYS; the `default` one first).
//
// The legacy JWT keys (SUPABASE_SERVICE_ROLE_KEY, SUPABASE_ANON_KEY) are used
// only when no new key is given AND the function secret LEGACY_KEYS_ACTIVE is
// "1": the service_role key leaked on 2026-11-08, the legacy keys are being
// deactivated, and the flag goes once they are. Without a usable key a
// function fails at start, saying which, instead of calling with a dead key.

const named = (variable: string): Record<string, string> => {
  try {
    const parsed = JSON.parse(Deno.env.get(variable) ?? '{}') as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed).filter((e): e is [string, string] => typeof e[1] === 'string' && !!e[1]),
    );
  } catch {
    return {};
  }
};

export const legacyKeysActive = (): boolean => Deno.env.get('LEGACY_KEYS_ACTIVE') === '1';

const pick = (variable: string, legacy: string): string => {
  const keys = named(variable);
  const key = keys.default ?? Object.values(keys)[0];
  if (key) return key;
  const old = legacyKeysActive() ? Deno.env.get(legacy) : undefined;
  if (old) return old;
  throw new Error(`${variable} has no key (and ${legacy} is not allowed without LEGACY_KEYS_ACTIVE=1)`);
};

/** The secret key (sb_secret_…): full access, server-side only. */
export const secretKey = (): string => pick('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');

/** The publishable key (sb_publishable_…): what a browser would send, with a user's token for RLS. */
export const publishableKey = (): string => pick('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
