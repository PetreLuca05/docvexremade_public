import { useEffect, useRef, useState } from 'react';
import Layout, { Avatar } from '../components/Layout.jsx';
import ContinueButton from '../components/ContinueButton.jsx';
import Plans, { PLAN_IDS } from '../components/Plans.jsx';
import { authHref, billingUrl, getSupabase } from '../auth.js';
import Demographics from '../components/Demographics.jsx';
import { demographicsData, demographicsOf } from '../demographics.js';
import { useLang, useMeta } from '../i18n.jsx';
import { useSession } from '../useSession.js';

const META = {
  ro: {
    title: 'Contul meu — DocVex',
    description: 'Datele contului tău DocVex.',
  },
  en: {
    title: 'My account — DocVex',
    description: 'Your DocVex account data.',
  },
};

// The profile and plan live in the Supabase user's user_metadata. AI usage is
// counted by the app's `ai` function, and read from it here. The app's own settings (`ai_prefs`, `format_prefs`) are
// left to Settings in the app.
// Keys this page shows in their own fields; any other metadata is listed as is.
const KNOWN = new Set([
  'full_name',
  'name',
  'avatar_url',
  'picture',
  'plan',
  'ai_prefs',
  'format_prefs',
  'ai_usage',
  'downloaded_version',
  'has_password',
  'newsletter',
  'newsletter_at',
  'gender',
  'birth_year',
  'demographics_at',
  'email',
  'email_verified',
  'phone_verified',
  'sub',
  'iss',
  'provider_id',
]);

const T = {
  ro: {
    locale: 'ro-RO',
    title: 'Contul meu',
    lead: 'Toate datele contului tău DocVex, așa cum sunt păstrate în Supabase.',
    loading: 'Se încarcă…',
    signedOut: 'Nu ești autentificat.',
    signIn: 'Autentifică-te',
    profile: 'Detaliile contului',
    name: 'Nume',
    plan: 'Plan',
    billing: 'Facturare și abonament',
    billingHint: 'Abonamentul, cardul și facturile se gestionează în portalul Stripe.',
    usage: 'Activitate',
    usageLead: 'Utilizarea AI din aplicație, în tokeni.',
    usageHint: 'Numărată de aplicație; nu se poate modifica.',
    session: 'Sesiunea curentă (5 ore)',
    weekly: 'Săptămâna aceasta',
    fable: 'Fable, săptămâna aceasta',
    resets: (when) => `Se resetează ${when}`,
    requestsWeek: (n) => `${n} cereri săptămâna aceasta`,
    usageLoading: 'Se încarcă utilizarea…',
    usageFailed: 'Utilizarea nu a putut fi încărcată.',
    retry: 'Reîncearcă',
    blocked: (until) => (until ? `Limita a fost atinsă până ${until}.` : 'Limita a fost atinsă.'),
    save: 'Salvează modificările',
    revert: 'Anulează modificările',
    saving: 'Se salvează…',
    saved: 'Modificările au fost salvate.',
    unsaved: 'Ai modificări nesalvate.',
    email: 'E-mail',
    changeEmail: 'Schimbă e-mailul',
    emailSent: (e) =>
      `Ți-am trimis un link de confirmare la ${e}. E-mailul se schimbă după ce îl deschizi.`,
    password: 'Parolă nouă',
    passwordAgain: 'Repetă parola nouă',
    passwordHint: 'Cel puțin 8 caractere.',
    noPassword: 'Contul tău folosește Google. Poți seta și o parolă, ca să intri cu e-mailul.',
    changePassword: 'Schimbă parola',
    setPassword: 'Setează parola',
    passwordSaved: 'Parola a fost schimbată.',
    mismatch: 'Parolele nu coincid.',
    nonce: 'Cod de confirmare',
    nonceSent: (e) => `Pentru siguranță, ți-am trimis un cod la ${e}. Introdu-l mai jos.`,
    confirm: 'Confirmă',
    errors: {
      same_password: 'Parola nouă trebuie să fie diferită de cea actuală.',
      weak_password: 'Parola este prea slabă. Alege una mai lungă.',
      email_exists: 'Există deja un cont cu acest e-mail.',
      email_address_invalid: 'Adresa de e-mail nu este validă.',
      over_email_send_rate_limit: 'Prea multe încercări. Încearcă din nou peste câteva minute.',
      reauthentication_not_valid: 'Codul nu este corect sau a expirat.',
      manual_linking_disabled: 'Conectarea altor metode nu este activată încă.',
      identity_already_exists: 'Acest cont Google este deja folosit de alt cont DocVex.',
      single_identity_not_deletable: 'Nu poți elimina singura metodă de autentificare.',
      email_conflict_identity_not_deletable:
        'Metoda nu poate fi eliminată: e-mailul contului ar rămâne fără o metodă care să-l folosească.',
    },
    details: 'Autentificare',
    providerNames: { email: 'E-mail și parolă' },
    methods: 'Metode de autentificare',
    methodsLead:
      'Poți avea mai multe moduri de a intra în același cont DocVex, pe site și în aplicație: de exemplu cu Google și cu e-mail și parolă. Adaugă unul nou cu + sau elimină-l pe cel de care nu mai ai nevoie.',
    connected: (d) => `Conectată ${d}`,
    lastUsed: (d) => `folosită ultima dată ${d}`,
    change: 'Schimbă',
    changeGoogle: 'Schimbă contul Google',
    remove: 'Elimină',
    onlyMethod: 'Este singura metodă; adaugă întâi alta ca s-o poți elimina.',
    passwordOnly: 'Parola setată pe un cont Google nu poate fi eliminată de aici.',
    add: 'Adaugă o metodă',
    addGoogle: 'Conectează Google',
    addPassword: 'Adaugă e-mail și parolă',
    removeTitle: (name) => `Elimini ${name}?`,
    removeText: (name) => `Nu vei mai putea intra în cont cu ${name}. Celelalte metode rămân.`,
    removing: 'Se elimină…',
    linked: 'Contul Google a fost conectat.',
    replaced: 'Contul Google a fost schimbat.',
    removed: 'Metoda a fost eliminată.',
    resetNotice: 'Setează-ți mai jos parola nouă.',
    created: 'Creat',
    lastSignIn: 'Ultima autentificare',
    confirmed: 'E-mail confirmat',
    newsletter: 'Newsletter',
    newsletterLabel: 'Primesc newsletterul DocVex pe e-mail',
    newsletterSince: (d) => `Abonat din ${d}.`,
    newsletterSaved: (on) =>
      on ? 'Te-ai abonat la newsletter.' : 'Te-ai dezabonat de la newsletter.',
    providers: 'Metode de autentificare',
    yes: 'Da',
    no: 'Nu',
    other: 'Alte date',
    signOut: 'Ieși din cont',
    signOutTitle: 'Ieși din cont?',
    signOutText: 'Te vei deconecta de pe acest site. Aplicația DocVex rămâne autentificată.',
    signingOut: 'Se deconectează…',
    cancel: 'Anulează',
    deleteNote: (
      <>
        Pentru a șterge contul și toate datele lui, scrie-ne la{' '}
        <a href="/informatii-legale.html#identificare">adresa de contact</a>.
      </>
    ),
    error: 'Ceva nu a mers. Încearcă din nou.',
  },
  en: {
    locale: 'en-GB',
    title: 'My account',
    lead: 'All the data of your DocVex account, as kept in Supabase.',
    loading: 'Loading…',
    signedOut: 'You are not signed in.',
    signIn: 'Sign in',
    profile: 'Account details',
    name: 'Name',
    plan: 'Plan',
    billing: 'Billing and subscription',
    billingHint: 'Your subscription, card and invoices are managed in the Stripe portal.',
    usage: 'Activity',
    usageLead: 'AI usage in the app, in tokens.',
    usageHint: 'Counted by the app; it cannot be changed.',
    session: 'Current session (5 hours)',
    weekly: 'This week',
    fable: 'Fable, this week',
    resets: (when) => `Resets ${when}`,
    requestsWeek: (n) => `${n} requests this week`,
    usageLoading: 'Loading usage…',
    usageFailed: 'Usage could not be loaded.',
    retry: 'Try again',
    blocked: (until) => (until ? `Limit reached until ${until}.` : 'Limit reached.'),
    save: 'Save changes',
    revert: 'Revert',
    saving: 'Saving…',
    saved: 'Your changes have been saved.',
    unsaved: 'You have unsaved changes.',
    email: 'Email',
    changeEmail: 'Change email',
    emailSent: (e) => `We sent a confirmation link to ${e}. Your email changes once you open it.`,
    password: 'New password',
    passwordAgain: 'Repeat the new password',
    passwordHint: 'At least 8 characters.',
    noPassword: 'Your account uses Google. You can also set a password to sign in with your email.',
    changePassword: 'Change password',
    setPassword: 'Set password',
    passwordSaved: 'Your password has been changed.',
    mismatch: 'The passwords do not match.',
    nonce: 'Confirmation code',
    nonceSent: (e) => `For your security, we sent a code to ${e}. Enter it below.`,
    confirm: 'Confirm',
    errors: {
      same_password: 'The new password must differ from the current one.',
      weak_password: 'The password is too weak. Choose a longer one.',
      email_exists: 'An account with this email already exists.',
      email_address_invalid: 'The email address is not valid.',
      over_email_send_rate_limit: 'Too many attempts. Try again in a few minutes.',
      reauthentication_not_valid: 'The code is incorrect or has expired.',
      manual_linking_disabled: 'Connecting other methods is not enabled yet.',
      identity_already_exists: 'This Google account is already used by another DocVex account.',
      single_identity_not_deletable: 'You cannot remove your only sign-in method.',
      email_conflict_identity_not_deletable:
        'This method cannot be removed: the account’s email would be left without a method using it.',
    },
    details: 'Sign-in',
    providerNames: { email: 'Email and password' },
    methods: 'Sign-in methods',
    methodsLead:
      'You can have several ways to sign in to the same DocVex account, on the site and in the app: for example with Google and with an email and password. Add one with + or remove one you no longer need.',
    connected: (d) => `Connected ${d}`,
    lastUsed: (d) => `last used ${d}`,
    change: 'Change',
    changeGoogle: 'Change Google account',
    remove: 'Remove',
    onlyMethod: 'This is your only method; add another before removing it.',
    passwordOnly: 'A password set on a Google account cannot be removed here.',
    add: 'Add a method',
    addGoogle: 'Connect Google',
    addPassword: 'Add email and password',
    removeTitle: (name) => `Remove ${name}?`,
    removeText: (name) =>
      `You will no longer be able to sign in with ${name}. Your other methods stay.`,
    removing: 'Removing…',
    linked: 'Your Google account has been connected.',
    replaced: 'Your Google account has been changed.',
    removed: 'The method has been removed.',
    resetNotice: 'Set your new password below.',
    created: 'Created',
    lastSignIn: 'Last sign-in',
    confirmed: 'Email confirmed',
    newsletter: 'Newsletter',
    newsletterLabel: 'I receive the DocVex newsletter by email',
    newsletterSince: (d) => `Subscribed since ${d}.`,
    newsletterSaved: (on) =>
      on ? 'You are subscribed to the newsletter.' : 'You are unsubscribed from the newsletter.',
    providers: 'Sign-in methods',
    yes: 'Yes',
    no: 'No',
    other: 'Other data',
    signOut: 'Sign out',
    signOutTitle: 'Sign out?',
    signOutText: 'You will be signed out of this site. The DocVex app stays signed in.',
    signingOut: 'Signing out…',
    cancel: 'Cancel',
    deleteNote: (
      <>
        To delete your account and all its data, write to us at the{' '}
        <a href="/informatii-legale.html#identificare">contact address</a>.
      </>
    ),
    error: 'Something went wrong. Please try again.',
  },
};

// The editable part of the account, as the form holds it.
function draftOf(user) {
  const meta = user.user_metadata ?? {};
  return {
    full_name: meta.full_name ?? meta.name ?? '',
    plan: PLAN_IDS.includes(meta.plan) ? meta.plan : 'start',
    // Optional, for statistics only (src/demographics.js).
    ...demographicsOf(meta),
  };
}

function formatDate(iso, locale) {
  if (!iso) return '—';
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(new Date(iso));
}

function Field({ label, hint, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

// The app's own usage summary: the `ai` function's `usage` action, with the
// user's token. Nothing is shown until it answers.
async function fetchUsage() {
  const supabase = await getSupabase();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('signed out');
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({ action: 'usage' }),
  });
  if (!res.ok) throw new Error(`usage ${res.status}`);
  return res.json();
}

function Usage({ t }) {
  const [usage, setUsage] = useState(null);
  const [failed, setFailed] = useState(false);
  const load = () => {
    setFailed(false);
    fetchUsage()
      .then(setUsage)
      .catch(() => setFailed(true));
  };
  useEffect(load, []);

  if (failed) {
    return (
      <p className="note">
        {t.usageFailed}{' '}
        <button type="button" className="link-button" onClick={load}>
          {t.retry}
        </button>
      </p>
    );
  }
  if (!usage) return <p className="note">{t.usageLoading}</p>;

  const n = new Intl.NumberFormat(t.locale);
  const when = (iso) => (iso ? formatDate(iso, t.locale) : null);
  return (
    <>
      {usage.blocked && (
        <p className="note usage-blocked">{t.blocked(when(usage.blocked.until))}</p>
      )}
      <dl className="usage">
        {['session', 'weekly', 'fable'].map((k) => {
          const { used = 0, limit = 0, resetsAt } = usage[k] ?? {};
          return (
            <div key={k}>
              <dt>{t[k]}</dt>
              <dd>
                {n.format(used)} <span>/ {n.format(limit)}</span>
              </dd>
              <meter min={0} max={limit || 1} value={Math.min(used, limit || 1)} />
              {resetsAt && <small>{t.resets(when(resetsAt))}</small>}
            </div>
          );
        })}
      </dl>
      <p className="note">{t.requestsWeek(n.format(usage.requests ?? 0))}</p>
    </>
  );
}

// Each sign-in method as its provider's own pill: Google's white pill with
// its "G", e-mail with an envelope, and the others with their mark.
const PROVIDERS = {
  google: {
    name: 'Google',
    icon: (
      <svg viewBox="0 0 18 18">
        <path
          fill="#4285F4"
          d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
        />
        <path
          fill="#34A853"
          d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.96v2.33A9 9 0 0 0 9 18Z"
        />
        <path
          fill="#FBBC05"
          d="M3.96 10.71A5.41 5.41 0 0 1 3.68 9c0-.6.1-1.17.28-1.71V4.96H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3-2.33Z"
        />
        <path
          fill="#EA4335"
          d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.59A9 9 0 0 0 .96 4.96l3 2.33C4.67 5.16 6.66 3.58 9 3.58Z"
        />
      </svg>
    ),
  },
  email: {
    icon: (
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m4 7 8 6 8-6" />
      </svg>
    ),
  },
  apple: {
    name: 'Apple',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8a4.5 4.5 0 0 0-3.8 2.3c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3a10 10 0 0 0 1.3-2.6s-2.5-1-2.5-3.7ZM14.1 5.6c.6-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4Z" />
      </svg>
    ),
  },
  azure: {
    name: 'Microsoft',
    icon: (
      <svg viewBox="0 0 24 24">
        <path fill="#F25022" d="M3 3h8.5v8.5H3z" />
        <path fill="#7FBA00" d="M12.5 3H21v8.5h-8.5z" />
        <path fill="#00A4EF" d="M3 12.5h8.5V21H3z" />
        <path fill="#FFB900" d="M12.5 12.5H21V21h-8.5z" />
      </svg>
    ),
  },
  github: {
    name: 'GitHub',
    icon: (
      <svg viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.91-.62.07-.6.07-.6 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.64 0 0 .84-.27 2.75 1.02a9.5 9.5 0 0 1 5 0c1.91-1.3 2.75-1.02 2.75-1.02.55 1.37.2 2.39.1 2.64.64.7 1.03 1.59 1.03 2.68 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z" />
      </svg>
    ),
  },
};

function ProviderPill({ provider, t }) {
  const known = PROVIDERS[provider];
  const name =
    t.providerNames[provider] ??
    known?.name ??
    provider.charAt(0).toUpperCase() + provider.slice(1);
  return (
    <span className={`provider-pill is-${provider}`}>
      <span className="provider-icon" aria-hidden="true">
        {known?.icon ?? name.charAt(0)}
      </span>
      {name}
    </span>
  );
}

// The newsletter consent given at sign-up (user_metadata.newsletter and
// newsletter_at): shown here and changed at once.
function Newsletter({ t, user }) {
  const meta = user.user_metadata ?? {};
  const on = meta.newsletter === true;
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function change(next) {
    setBusy(true);
    setStatus(null);
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.updateUser({
        data: { newsletter: next, newsletter_at: next ? new Date().toISOString() : null },
      });
      if (error) throw error;
      setStatus({ text: t.newsletterSaved(next) });
    } catch (err) {
      setStatus({ text: err.message || t.error, error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-newsletter">
      <h3>{t.newsletter}</h3>
      <label className="check">
        <input
          type="checkbox"
          checked={on}
          disabled={busy}
          onChange={(e) => change(e.target.checked)}
        />
        <span>{t.newsletterLabel}</span>
      </label>
      {on && meta.newsletter_at && (
        <p className="note">{t.newsletterSince(formatDate(meta.newsletter_at, t.locale))}</p>
      )}
      <Status value={status} />
    </div>
  );
}

function Status({ value }) {
  if (!value) return null;
  return (
    <p className={value.error ? 'auth-error' : 'note'} role="status">
      {value.text}
    </p>
  );
}

// A new e-mail takes effect once the link sent to it is opened.
function EmailForm({ t, user, onDone }) {
  const [email, setEmail] = useState(user.email ?? '');
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    const next = email.trim();
    setBusy(true);
    setStatus(null);
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.updateUser(
        { email: next },
        { emailRedirectTo: `${window.location.origin}/cont.html` },
      );
      if (error) throw error;
      setStatus({ text: t.emailSent(next) });
      onDone?.();
    } catch (err) {
      setStatus({
        text: t.errors[err.code] ?? err.message ?? t.error,
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <form className="inline-form" onSubmit={submit}>
        <Field label={t.email}>
          <input
            type="email"
            value={email}
            autoComplete="email"
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </Field>
        <button
          type="submit"
          className="btn is-outline"
          disabled={busy || email.trim() === user.email}
        >
          {t.changeEmail}
        </button>
      </form>
      <Status value={status} />
    </>
  );
}

// A new (or first) password. It may need a code first, when Supabase's secure
// password change asks to confirm a session that is not recent.
function PasswordForm({ t, user, hasPassword, showEmail, onDone, onCancel }) {
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [nonce, setNonce] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(event) {
    event.preventDefault();
    if (password !== again) {
      setStatus({ text: t.mismatch, error: true });
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const supabase = await getSupabase();
      const attributes = nonce === null ? { password } : { password, nonce: nonce.trim() };
      const { error } = await supabase.auth.updateUser(attributes);
      if (error?.code === 'reauthentication_needed') {
        const { error: sendError } = await supabase.auth.reauthenticate();
        if (sendError) throw sendError;
        setNonce('');
        setStatus({ text: t.nonceSent(user.email) });
        return;
      }
      if (error) throw error;
      // Setting a password on a Google account adds no "email" identity, so
      // the account remembers that it has one.
      if (!hasPassword) await supabase.auth.updateUser({ data: { has_password: true } });
      setPassword('');
      setAgain('');
      setNonce(null);
      setStatus({ text: t.passwordSaved });
      onDone?.();
    } catch (err) {
      setStatus({
        text: t.errors[err.code] ?? err.message ?? t.error,
        error: true,
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      {/* The address the password signs in with; also tells password
          managers which account the new password belongs to. */}
      {showEmail && (
        <Field label={t.email}>
          <input type="email" value={user.email ?? ''} autoComplete="username" readOnly />
        </Field>
      )}
      <div className="field-grid">
        <Field label={t.password} hint={t.passwordHint}>
          <input
            type="password"
            value={password}
            minLength={8}
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </Field>
        <Field label={t.passwordAgain}>
          <input
            type="password"
            value={again}
            minLength={8}
            autoComplete="new-password"
            onChange={(e) => setAgain(e.target.value)}
            required
          />
        </Field>
      </div>
      {nonce !== null && (
        <Field label={t.nonce}>
          <input
            value={nonce}
            inputMode="numeric"
            autoComplete="one-time-code"
            onChange={(e) => setNonce(e.target.value)}
            required
          />
        </Field>
      )}
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn is-ghost" onClick={onCancel} disabled={busy}>
            {t.cancel}
          </button>
        )}
        <ContinueButton disabled={busy}>
          {nonce !== null ? t.confirm : hasPassword ? t.changePassword : t.setPassword}
        </ContinueButton>
      </div>
      <Status value={status} />
    </form>
  );
}

// A full-screen confirmation. Escape or the backdrop cancels; focus starts on
// Cancel and goes back where it was.
function ConfirmDialog({ t, title, text, confirmLabel, busyLabel, icon, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  const cancel = useRef(null);

  useEffect(() => {
    const before = document.activeElement;
    cancel.current?.focus();
    document.body.classList.add('has-modal');
    return () => {
      document.body.classList.remove('has-modal');
      before?.focus?.();
    };
  }, []);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && !busy && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [busy, onClose]);

  async function confirm() {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && !busy && onClose()}>
      <div
        className="modal-box"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-text"
      >
        <span className="modal-icon" aria-hidden="true">
          {icon}
        </span>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-text">{text}</p>
        <div className="modal-actions">
          <button
            ref={cancel}
            type="button"
            className="btn is-outline"
            onClick={onClose}
            disabled={busy}
          >
            {t.cancel}
          </button>
          <button
            type="button"
            className="btn is-danger is-solid"
            onClick={confirm}
            disabled={busy}
          >
            {busy ? busyLabel : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

const TRASH = (
  <svg viewBox="0 0 24 24">
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </svg>
);

const linkBack = (params) => {
  const url = new URL('/cont.html', window.location.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.hash = 'metode';
  return url.toString();
};

// How the account signs in: each connected method with its own actions
// (change, remove), and the methods it can still add. Google is connected
// with Supabase's identity linking (Authentication → Allow manual linking);
// changing it links the new Google account first, then removes the old one.
function SignInMethods({ t, user }) {
  const [identities, setIdentities] = useState(user.identities ?? []);
  const [enabled, setEnabled] = useState(['email', 'google']);
  // Back from a password-reset link: the password form opens at once.
  const resetting = new URLSearchParams(window.location.search).get('parola') === 'noua';
  const [open, setOpen] = useState(resetting ? 'password' : null);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState(null);
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const meta = user.user_metadata ?? {};

  const refresh = async () => {
    const supabase = await getSupabase();
    const { data } = await supabase.auth.getUserIdentities();
    if (data?.identities) setIdentities(data.identities);
    return data?.identities ?? [];
  };

  // Which providers the project has turned on.
  useEffect(() => {
    fetch(`${import.meta.env.VITE_SUPABASE_URL}/auth/v1/settings`, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
    })
      .then((r) => r.json())
      .then((d) => setEnabled(Object.keys(d.external ?? {}).filter((k) => d.external[k])))
      .catch(() => {});
  }, []);

  // Back from Google: report the result and, when it replaced an account,
  // remove the old one.
  useEffect(() => {
    const url = new URL(window.location.href);
    const params = new URLSearchParams(url.search);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const errorCode = params.get('error_code') || hash.get('error_code');
    const linked = params.get('linked');
    const replace = params.get('replace');
    if (!linked && !errorCode) return;
    (async () => {
      if (errorCode) {
        setStatus({ text: t.errors[errorCode] ?? t.error, error: true });
      } else {
        const list = await refresh();
        const old = list.find((i) => i.identity_id === replace || i.id === replace);
        const fresh = list.filter((i) => i.provider === linked && i !== old);
        if (old && fresh.length) {
          const supabase = await getSupabase();
          const { error } = await supabase.auth.unlinkIdentity(old);
          if (error)
            setStatus({
              text: t.errors[error.code] ?? error.message,
              error: true,
            });
          else setStatus({ text: t.replaced });
          await refresh();
        } else {
          setStatus({ text: t.linked });
        }
      }
      for (const k of ['linked', 'replace', 'error', 'error_code', 'error_description']) {
        url.searchParams.delete(k);
      }
      url.hash = 'metode';
      window.history.replaceState(null, '', url);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const emailIdentity = identities.find((i) => i.provider === 'email');
  const oauth = identities.filter((i) => i.provider !== 'email');
  const hasPassword = Boolean(emailIdentity) || Boolean(meta.has_password);
  const count = oauth.length + (hasPassword ? 1 : 0);

  async function link(provider, replace) {
    setBusy(true);
    setStatus(null);
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.linkIdentity({
        provider,
        options: {
          redirectTo: linkBack(replace ? { linked: provider, replace } : { linked: provider }),
        },
      });
      if (error) throw error;
    } catch (err) {
      setStatus({
        text: t.errors[err.code] ?? err.message ?? t.error,
        error: true,
      });
      setBusy(false);
    }
  }

  async function remove(identity) {
    const supabase = await getSupabase();
    const { error } = await supabase.auth.unlinkIdentity(identity);
    if (error) {
      setStatus({ text: t.errors[error.code] ?? error.message, error: true });
    } else {
      setStatus({ text: t.removed });
      await refresh();
    }
    setRemoving(null);
  }

  const nameOf = (provider) => t.providerNames[provider] ?? PROVIDERS[provider]?.name ?? provider;
  const when = (iso) =>
    iso ? new Intl.DateTimeFormat(t.locale, { dateStyle: 'medium' }).format(new Date(iso)) : null;
  const dates = (i) =>
    [
      i?.created_at && t.connected(when(i.created_at)),
      i?.last_sign_in_at && t.lastUsed(when(i.last_sign_in_at)),
    ]
      .filter(Boolean)
      .join(' · ');

  const toggle = (panel) => setOpen((p) => (p === panel ? null : panel));
  const canAddGoogle = enabled.includes('google') && !oauth.some((i) => i.provider === 'google');
  const canAddPassword = enabled.includes('email') && !hasPassword;

  return (
    <section className="account-section" id="metode">
      <h2>{t.methods}</h2>
      {resetting && <div className="callout">{t.resetNotice}</div>}
      <p className="note usage-lead">{t.methodsLead}</p>

      <ul className="methods">
        {oauth.map((i) => (
          <li key={i.identity_id ?? i.id} className="method">
            <div className="method-head">
              <ProviderPill provider={i.provider} t={t} />
              <div className="method-info">
                <b>{i.identity_data?.email ?? user.email}</b>
                <span className="note">{dates(i)}</span>
              </div>
              <div className="method-actions">
                {i.provider === 'google' && (
                  <button
                    type="button"
                    className="btn is-ghost is-small"
                    onClick={() => link('google', i.identity_id ?? i.id)}
                    disabled={busy}
                  >
                    {t.changeGoogle}
                  </button>
                )}
                <button
                  type="button"
                  className="btn is-danger is-small"
                  onClick={() => setRemoving(i)}
                  disabled={count <= 1}
                  title={count <= 1 ? t.onlyMethod : undefined}
                >
                  {t.remove}
                </button>
              </div>
            </div>
          </li>
        ))}

        {hasPassword && (
          <li className="method">
            <div className="method-head">
              <ProviderPill provider="email" t={t} />
              <div className="method-info">
                <b>{user.email}</b>
                <span className="note">{dates(emailIdentity)}</span>
              </div>
              <div className="method-actions">
                <button
                  type="button"
                  className="btn is-ghost is-small"
                  aria-expanded={open === 'email'}
                  onClick={() => toggle('email')}
                >
                  {t.changeEmail}
                </button>
                <button
                  type="button"
                  className="btn is-ghost is-small"
                  aria-expanded={open === 'password'}
                  onClick={() => toggle('password')}
                >
                  {t.changePassword}
                </button>
                <button
                  type="button"
                  className="btn is-danger is-small"
                  onClick={() => setRemoving(emailIdentity)}
                  disabled={count <= 1 || !emailIdentity}
                  title={count <= 1 ? t.onlyMethod : !emailIdentity ? t.passwordOnly : undefined}
                >
                  {t.remove}
                </button>
              </div>
            </div>
            {open === 'email' && (
              <div className="method-panel">
                <EmailForm t={t} user={user} />
              </div>
            )}
            {open === 'password' && (
              <div className="method-panel">
                <PasswordForm
                  t={t}
                  user={user}
                  hasPassword
                  onCancel={() => setOpen(null)}
                  onDone={() => setOpen(null)}
                />
              </div>
            )}
          </li>
        )}

        {/* One more row: + opens the methods the account can still add. */}
        {(canAddGoogle || canAddPassword) && (
          <li className="method is-add">
            {/* + Add a method; pressed, the label fades out and the options
                fade in in the same box, with × to go back. While the
                password form is open, it takes the box's place. */}
            {open !== 'add-password' && (
              <div className={`method-add${adding ? ' is-open' : ''}`}>
                <button
                  type="button"
                  className="method-add-toggle"
                  aria-expanded={adding}
                  inert={adding}
                  onClick={() => setAdding(true)}
                >
                  <svg className="method-plus" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                  <span>{t.add}</span>
                </button>
                <div className="method-options" inert={!adding}>
                  {canAddPassword && (
                    <button
                      type="button"
                      className="provider-pill is-option"
                      aria-expanded={open === 'add-password'}
                      onClick={() => toggle('add-password')}
                    >
                      <span className="provider-icon" aria-hidden="true">
                        {PROVIDERS.email.icon}
                      </span>
                      {t.providerNames.email}
                    </button>
                  )}
                  {canAddGoogle && (
                    <button
                      type="button"
                      className="provider-pill is-option"
                      onClick={() => link('google')}
                      disabled={busy}
                    >
                      <span className="provider-icon" aria-hidden="true">
                        {PROVIDERS.google.icon}
                      </span>
                      Google
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="method-add-close"
                  aria-label={t.cancel}
                  inert={!adding}
                  onClick={() => {
                    setAdding(false);
                    setOpen(null);
                  }}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6 6l12 12M18 6 6 18" />
                  </svg>
                </button>
              </div>
            )}
            {adding && open === 'add-password' && (
              <div className="method-subpanel is-alone">
                <p className="note">{t.noPassword}</p>
                <PasswordForm
                  t={t}
                  user={user}
                  hasPassword={false}
                  showEmail
                  onCancel={() => {
                    setOpen(null);
                    setAdding(false);
                  }}
                  onDone={() => {
                    setOpen(null);
                    setAdding(false);
                    refresh();
                  }}
                />
              </div>
            )}
          </li>
        )}
      </ul>

      <Status value={status} />

      {removing && (
        <ConfirmDialog
          t={t}
          title={t.removeTitle(nameOf(removing.provider))}
          text={t.removeText(nameOf(removing.provider))}
          confirmLabel={t.remove}
          busyLabel={t.removing}
          icon={TRASH}
          onConfirm={() => remove(removing)}
          onClose={() => setRemoving(null)}
        />
      )}
    </section>
  );
}

function Account({ t, user }) {
  const meta = user.user_metadata ?? {};
  const [draft, setDraft] = useState(() => draftOf(user));
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);

  // The account changed elsewhere (the app, another tab): take its values,
  // unless the form has changes of its own.
  const initial = JSON.stringify(draftOf(user));
  const [base, setBase] = useState(initial);
  const dirty = JSON.stringify(draft) !== base;
  useEffect(() => {
    if (initial === base) return;
    if (!dirty) setDraft(JSON.parse(initial));
    setBase(initial);
  }, [initial]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (key, value) => setDraft((d) => ({ ...d, [key]: value }));

  async function save(event) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const supabase = await getSupabase();
      // user_metadata is merged key by key, so the app's other keys stay.
      const before = JSON.parse(base);
      const aboutChanged = before.gender !== draft.gender || before.birth_year !== draft.birth_year;
      const { error } = await supabase.auth.updateUser({
        data: {
          full_name: draft.full_name.trim(),
          plan: draft.plan,
          // Gender and birth year only when changed (with when); a cleared
          // one is removed.
          ...(aboutChanged ? demographicsData(draft) : {}),
        },
      });
      if (error) throw error;
      setBase(JSON.stringify(draft));
      setMessage({ text: t.saved });
      setTimeout(() => setMessage((m) => (m?.text === t.saved ? null : m)), 3000);
    } catch (err) {
      setMessage({ text: err.message || t.error, error: true });
    } finally {
      setSaving(false);
    }
  }

  const other = Object.entries(meta).filter(([k]) => !KNOWN.has(k));
  const pill = {
    email: user.email,
    name: draft.full_name,
    photo: meta.avatar_url || meta.picture || '',
  };

  return (
    <>
      {/* The account with its details beside it, then its sign-in methods
          and this month's activity; name and plan are saved together by the
          button in the corner, sign-in methods by their own actions. */}
      <div className="account-top">
        <div>
          <section className="account-section">
            <h2>{t.profile}</h2>
            <div className="account-profile">
              <Avatar user={pill} className="account-avatar is-large" />
              <div>
                <Field label={t.name}>
                  <input
                    value={draft.full_name}
                    autoComplete="name"
                    onChange={(e) => set('full_name', e.target.value)}
                  />
                </Field>
                <Demographics
                  value={{ gender: draft.gender, birth_year: draft.birth_year }}
                  onChange={(v) => setDraft((d) => ({ ...d, ...v }))}
                  idPrefix="account"
                />
              </div>
            </div>
          </section>
        </div>

        <aside className="account-section account-details" aria-label={t.details}>
          <dl className="specs">
            <div>
              <dt>{t.created}</dt>
              <dd>{formatDate(user.created_at, t.locale)}</dd>
            </div>
            <div>
              <dt>{t.lastSignIn}</dt>
              <dd>{formatDate(user.last_sign_in_at, t.locale)}</dd>
            </div>
            <div>
              <dt>{t.confirmed}</dt>
              <dd>{user.email_confirmed_at ? t.yes : t.no}</dd>
            </div>
          </dl>
          <Newsletter t={t} user={user} />
          {other.length > 0 && (
            <>
              <h3>{t.other}</h3>
              <dl className="specs">
                {other.map(([k, v]) => (
                  <div key={k}>
                    <dt>{k}</dt>
                    <dd>
                      <code>{typeof v === 'string' ? v : JSON.stringify(v)}</code>
                    </dd>
                  </div>
                ))}
              </dl>
            </>
          )}
        </aside>
      </div>

      <SignInMethods t={t} user={user} />

      <section className="account-section">
        <h2>{t.usage}</h2>
        <p className="note usage-lead">{t.usageLead}</p>
        <Usage t={t} />
        <p className="note">{t.usageHint}</p>
      </section>

      <section className="account-section">
        <h2>{t.plan}</h2>
        <Plans
          current={draftOf(user).plan}
          selected={draft.plan}
          onChoose={(id) => set('plan', id)}
        />
        <p className="note">
          {t.billingHint} <a href={billingUrl(user)}>{t.billing}</a>
        </p>
      </section>

      <section className="account-section">
        <SignOut t={t} />
        <p className="note">{t.deleteNote}</p>
      </section>

      <SaveBar
        t={t}
        visible={dirty || Boolean(message)}
        dirty={dirty}
        saving={saving}
        message={message}
        onSave={save}
        onRevert={() => {
          setDraft(JSON.parse(base));
          setMessage(null);
        }}
      />
    </>
  );
}

// Save changes and Revert, in the screen's bottom-right corner while there
// is something to save (and briefly after, to say it was saved). Fixed to
// the window, outside the page's column, and lifted above the footer when
// the footer scrolls into view, so it never covers it.
function SaveBar({ t, visible, dirty, saving, message, onSave, onRevert }) {
  const [lift, setLift] = useState(0);

  useEffect(() => {
    const footer = document.querySelector('.site-foot');
    if (!footer) return;
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const overlap = window.innerHeight - footer.getBoundingClientRect().top;
        setLift(Math.max(0, overlap));
      });
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return (
    <form
      className={`save-bar${visible ? ' is-visible' : ''}`}
      style={{ '--lift': `${lift}px` }}
      onSubmit={onSave}
      inert={!visible}
      aria-hidden={!visible}
    >
      {message ? <Status value={message} /> : <p className="note">{t.unsaved}</p>}
      {dirty && (
        <button type="button" className="btn is-outline" onClick={onRevert} disabled={saving}>
          {t.revert}
        </button>
      )}
      {dirty && <ContinueButton disabled={saving}>{saving ? t.saving : t.save}</ContinueButton>}
    </form>
  );
}

// Sign out, after a full-screen confirmation.
function SignOut({ t }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="btn is-danger" onClick={() => setOpen(true)}>
        {t.signOut}
      </button>
      {open && (
        <ConfirmDialog
          t={t}
          title={t.signOutTitle}
          text={t.signOutText}
          confirmLabel={t.signOut}
          busyLabel={t.signingOut}
          icon={
            <svg viewBox="0 0 24 24">
              <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3M10 17l-5-5 5-5M5 12h11" />
            </svg>
          }
          onConfirm={async () => {
            try {
              await (await getSupabase()).auth.signOut();
            } finally {
              window.location.href = '/';
            }
          }}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export default function Cont() {
  const { lang } = useLang();
  const t = T[lang];
  useMeta(META);
  const session = useSession();

  return (
    <Layout page="cont" mainClassName="wrap">
      <article className="doc account">
        <h1>{t.title}</h1>
        <p className="updated">{t.lead}</p>
        {session === undefined && <p className="note">{t.loading}</p>}
        {session === null && (
          <div className="callout">
            {t.signedOut} <a href={authHref({ signin: true })}>{t.signIn}</a>
          </div>
        )}
        {session && <Account t={t} user={session.user} />}
      </article>
    </Layout>
  );
}
