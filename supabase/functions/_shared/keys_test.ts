// deno test --allow-env supabase/functions/_shared/keys_test.ts
import { assertEquals, assertThrows } from 'jsr:@std/assert@1';
import { publishableKey, secretKey } from './keys.ts';

const NAMES = [
  'SUPABASE_SECRET_KEYS',
  'SUPABASE_PUBLISHABLE_KEYS',
  'SUPABASE_SERVICE_ROLE_KEY',
  'SUPABASE_ANON_KEY',
  'LEGACY_KEYS_ACTIVE',
];

function withEnv(values: Record<string, string>, fn: () => void) {
  const before = NAMES.map((n) => Deno.env.get(n));
  NAMES.forEach((n) => (n in values ? Deno.env.set(n, values[n]) : Deno.env.delete(n)));
  try {
    fn();
  } finally {
    before.forEach((v, i) => (v === undefined ? Deno.env.delete(NAMES[i]) : Deno.env.set(NAMES[i], v)));
  }
}

const LEGACY = { SUPABASE_SERVICE_ROLE_KEY: 'legacy-service', SUPABASE_ANON_KEY: 'legacy-anon' };

Deno.test('the new default keys, even with the legacy ones present and allowed', () =>
  withEnv(
    {
      ...LEGACY,
      LEGACY_KEYS_ACTIVE: '1',
      SUPABASE_SECRET_KEYS: '{"other":"sb_secret_o","default":"sb_secret_d"}',
      SUPABASE_PUBLISHABLE_KEYS: '{"default":"sb_publishable_d"}',
    },
    () => {
      assertEquals(secretKey(), 'sb_secret_d');
      assertEquals(publishableKey(), 'sb_publishable_d');
    },
  ));

Deno.test('a key under another name when there is no default', () =>
  withEnv({ SUPABASE_SECRET_KEYS: '{"cron":"sb_secret_c"}' }, () => assertEquals(secretKey(), 'sb_secret_c')));

Deno.test('the legacy keys only with LEGACY_KEYS_ACTIVE=1', () => {
  withEnv({ ...LEGACY, LEGACY_KEYS_ACTIVE: '1' }, () => {
    assertEquals(secretKey(), 'legacy-service');
    assertEquals(publishableKey(), 'legacy-anon');
  });
  for (const flag of [undefined, '0', 'true'])
    withEnv({ ...LEGACY, ...(flag === undefined ? {} : { LEGACY_KEYS_ACTIVE: flag }) }, () => {
      assertThrows(secretKey);
      assertThrows(publishableKey);
    });
});

Deno.test('unreadable new keys count as none', () =>
  withEnv({ SUPABASE_SECRET_KEYS: 'nonsense', SUPABASE_PUBLISHABLE_KEYS: '{"default":""}' }, () => {
    assertThrows(secretKey);
    assertThrows(publishableKey);
  }));
