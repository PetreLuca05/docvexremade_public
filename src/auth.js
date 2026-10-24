// DocVex accounts (the same Supabase project as the app). The client is
// loaded only by the pages that need it, so the other pages still make no
// request to a third party. Without the two variables (see .env.example) the
// sign-in form says accounts are not available yet.
const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const authConfigured = Boolean(url && key);

// Where supabase-js keeps the session (its default key), and the event fired
// on this page whenever the session changes.
const storageKey = authConfigured
  ? `sb-${new URL(url).hostname.split('.')[0]}-auth-token`
  : null;
export const AUTH_EVENT = 'docvex-auth';

// The signed-in user as saved by supabase-js, read without loading it, so the
// header can show the account on every page without contacting Supabase.
export function storedUser() {
  if (!storageKey) return null;
  try {
    const user = JSON.parse(localStorage.getItem(storageKey))?.user;
    if (!user?.email) return null;
    const meta = user.user_metadata ?? {};
    return {
      email: user.email,
      name: meta.full_name || meta.name || '',
      photo: meta.avatar_url || meta.picture || '',
      downloaded: meta.downloaded_version || '',
    };
  } catch {
    return null;
  }
}

let client;

export async function getSupabase() {
  if (!authConfigured) throw new Error('Supabase is not configured');
  if (!client) {
    const { createClient } = await import('@supabase/supabase-js');
    client = createClient(url, key, {
      // PKCE: Google and the e-mail links come back with ?code=, which the
      // client exchanges for a session on load.
      auth: {
        flowType: 'pkce',
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    client.auth.onAuthStateChange(() => {
      // After supabase-js has saved the change.
      setTimeout(() => window.dispatchEvent(new Event(AUTH_EVENT)));
    });
  }
  return client;
}

// Where Google sign-in and the e-mail links return to (allowed in Supabase →
// Authentication → URL Configuration).
export function authRedirect() {
  return `${window.location.origin}/autentificare.html`;
}

// Remembers on the account the version it last downloaded from the site, so
// the header can say when a newer one is out. Only for a signed-in visitor.
export async function recordDownload(version) {
  if (!storedUser()) return;
  try {
    const supabase = await getSupabase();
    await supabase.auth.updateUser({ data: { downloaded_version: version } });
  } catch {
    // Not recorded; the header then just offers the latest version.
  }
}

// Whether version a is newer than b ("1.10.0" > "1.9.2").
export function isNewer(a, b) {
  const pa = a.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  const pb = b.split(/[.-]/).map((x) => parseInt(x, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] ?? 0) !== (pb[i] ?? 0)) return (pa[i] ?? 0) > (pb[i] ?? 0);
  }
  return false;
}

// Stripe Payment Links, one per paid plan (Stripe hosts the checkout, so the
// static site needs no server). The visitor's account id travels as
// `client_reference_id`, which the Stripe webhook uses to find the account.
const PAYMENT_LINKS = {
  pro: import.meta.env.VITE_STRIPE_LINK_PRO,
  cabinet: import.meta.env.VITE_STRIPE_LINK_CABINET,
};

// Stripe's customer portal (subscription, card, invoices), signed in to with
// the account's e-mail; without it, the account page.
const PORTAL = import.meta.env.VITE_STRIPE_PORTAL;

export function billingUrl(user) {
  if (!PORTAL) return '/cont.html';
  const u = new URL(PORTAL);
  u.searchParams.set('prefilled_email', user.email);
  return u.toString();
}

export function paymentLink(plan) {
  return PAYMENT_LINKS[plan] || null;
}

export function checkoutUrl(plan, user, lang) {
  const link = paymentLink(plan);
  if (!link) return null;
  const u = new URL(link);
  u.searchParams.set('client_reference_id', user.id);
  if (user.email) u.searchParams.set('prefilled_email', user.email);
  u.searchParams.set('locale', lang);
  return u.toString();
}
