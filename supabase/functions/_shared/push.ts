// Web Push to the admin dashboard (dev.html installed as an app), with our
// own VAPID keys. No dependencies: Web Crypto only, so the same file runs in
// any Edge Function (and in Node 20+). Implements RFC 8291 (message
// encryption, aes128gcm) and RFC 8292 (VAPID).
//
// Payload, as the dashboard's service worker (public/dev-sw.js) reads it:
//   { title, body, url, urgent?, tag? }
//
// Secrets: VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY (base64url: the raw
// 65-byte public point and the 32-byte private scalar), VAPID_SUBJECT (a
// mailto: or https: contact for the push services).

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  urgent?: boolean;
  tag?: string;
};

export type PushSubscription = { endpoint: string; p256dh: string; auth: string };

export type Vapid = { publicKey: string; privateKey: string; subject: string };

export type PushResult = { ok: boolean; status: number; gone: boolean };

const enc = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromB64url(text: string): Uint8Array {
  const s = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let at = 0;
  for (const p of parts) {
    out.set(p, at);
    at += p.length;
  }
  return out;
}

async function hkdf(salt: Uint8Array, ikm: Uint8Array, info: Uint8Array, length: number) {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8,
  );
  return new Uint8Array(bits);
}

// The VAPID Authorization header for an endpoint's push service.
export async function vapidHeader(endpoint: string, vapid: Vapid): Promise<string> {
  const pub = fromB64url(vapid.publicKey);
  const key = await crypto.subtle.importKey(
    'jwk',
    {
      kty: 'EC',
      crv: 'P-256',
      d: vapid.privateKey,
      x: b64url(pub.slice(1, 33)),
      y: b64url(pub.slice(33, 65)),
      ext: true,
    },
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign'],
  );
  const header = b64url(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64url(
    enc.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(Date.now() / 1000) + 12 * 3600,
        sub: vapid.subject,
      }),
    ),
  );
  const unsigned = `${header}.${claims}`;
  // Web Crypto's ECDSA signature is r || s, as JWT wants.
  const signature = new Uint8Array(
    await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned)),
  );
  return `vapid t=${unsigned}.${b64url(signature)}, k=${vapid.publicKey}`;
}

// The payload encrypted for one subscription (RFC 8291, one aes128gcm record).
export async function encrypt(sub: PushSubscription, plaintext: Uint8Array): Promise<Uint8Array> {
  const uaPublic = fromB64url(sub.p256dh);
  const authSecret = fromB64url(sub.auth);
  const local = (await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
    'deriveBits',
  ])) as CryptoKeyPair;
  const asPublic = new Uint8Array(await crypto.subtle.exportKey('raw', local.publicKey));
  const uaKey = await crypto.subtle.importKey(
    'raw',
    uaPublic,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    [],
  );
  const shared = new Uint8Array(
    await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, local.privateKey, 256),
  );
  const ikm = await hkdf(
    authSecret,
    shared,
    concat(enc.encode('WebPush: info\0'), uaPublic, asPublic),
    32,
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const aes = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  // The last (only) record ends with the delimiter 0x02, no padding.
  const record = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: nonce },
      aes,
      concat(plaintext, new Uint8Array([2])),
    ),
  );
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096);
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, record);
}

// Sends one push. `gone` means the subscription no longer exists (404/410):
// delete it.
export async function sendPush(
  sub: PushSubscription,
  payload: PushPayload,
  vapid: Vapid,
): Promise<PushResult> {
  const body = await encrypt(sub, enc.encode(JSON.stringify(payload)));
  const res = await fetch(sub.endpoint, {
    method: 'POST',
    headers: {
      Authorization: await vapidHeader(sub.endpoint, vapid),
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      TTL: String(24 * 3600),
      Urgency: payload.urgent ? 'high' : 'normal',
    },
    body,
  });
  await res.body?.cancel();
  return { ok: res.ok, status: res.status, gone: res.status === 404 || res.status === 410 };
}

export function vapidFromEnv(get: (name: string) => string | undefined): Vapid | null {
  const publicKey = get('VAPID_PUBLIC_KEY');
  const privateKey = get('VAPID_PRIVATE_KEY');
  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject: get('VAPID_SUBJECT') ?? 'https://docvex.ro' };
}

// Sends to every row of admin_push_subscriptions (or one admin's, with
// `userId`), with a Supabase client that may read and write them (the
// service role, or the admin's own token for their own devices). Deletes
// the subscriptions that are gone and counts failures on the others.
// deno-lint-ignore no-explicit-any
export async function pushToAdmins(db: any, payload: PushPayload, vapid: Vapid, userId?: string) {
  let query = db.from('admin_push_subscriptions').select('id, endpoint, p256dh, auth, failures');
  if (userId) query = query.eq('user_id', userId);
  const { data, error } = await query;
  if (error) throw error;
  const rows = (data ?? []) as (PushSubscription & { id: number; failures: number })[];
  const results = await Promise.all(
    rows.map(async (row) => {
      let result: PushResult;
      try {
        result = await sendPush(row, payload, vapid);
      } catch {
        result = { ok: false, status: 0, gone: false };
      }
      if (result.gone) await db.from('admin_push_subscriptions').delete().eq('id', row.id);
      else
        await db
          .from('admin_push_subscriptions')
          .update(
            result.ok
              ? { last_used_at: new Date().toISOString(), failures: 0 }
              : { failures: row.failures + 1 },
          )
          .eq('id', row.id);
      return { id: row.id, ...result };
    }),
  );
  return {
    devices: rows.length,
    sent: results.filter((r) => r.ok).length,
    removed: results.filter((r) => r.gone).length,
    results,
  };
}
