import { useEffect, useId, useRef, useState } from 'react';
import { authRedirect, getSupabase } from '../auth.js';
import { track } from '../analytics.js';
import BackButton from './BackButton.jsx';
import ContinueButton from './ContinueButton.jsx';
import { useLang } from '../i18n.jsx';
import Demographics from './Demographics.jsx';
import { demographicsData, demographicsError, EMPTY_DEMOGRAPHICS } from '../demographics.js';
import { checkEmail, checkName, checkPassword, generatePassword } from '../validate.js';
import { FEATURED, PLAN_IDS, usePlanText } from './Plans.jsx';

const T = {
  ro: {
    steps: ['Contul', 'Parola', 'Despre tine', 'Planul', 'Verificare'],
    aboutLead:
      'Opțional: genul și data nașterii, pentru statisticile noastre. Poți trece peste acest pas.',
    aboutLabel: 'Despre tine',
    aboutNone: 'Nespecificat',
    genderNames: { female: 'Feminin', male: 'Masculin', other: 'Altul' },
    reviewLead: 'Verifică datele înainte de a crea contul. Poți modifica orice pas.',
    edit: 'Modifică',
    stepOf: (i, n) => `Pasul ${i} din ${n}`,
    next: 'Continuă',
    back: 'Înapoi',
    google: 'Continuă cu Google',
    or: 'sau',
    name: 'Nume și prenume',
    email: 'E-mail',
    password: 'Parolă',
    passwordAgain: 'Repetă parola',
    show: 'Arată parola',
    hide: 'Ascunde parola',
    capsLock: 'Caps Lock este activat.',
    placeholders: {
      name: 'ex. Andrei Popescu',
      email: 'nume@exemplu.ro',
      newPassword: 'Cel puțin 8 caractere',
      passwordAgain: 'Scrie parola din nou',
      password: 'Parola ta',
    },
    generate: 'Sugerează o parolă puternică',
    generated: 'Am completat o parolă puternică și am copiat-o. Salveaz-o în managerul de parole.',
    generatedNotCopied: 'Am completat o parolă puternică. Salveaz-o în managerul de parole.',
    newsletter:
      'Trimite-mi newsletterul DocVex: noutăți despre produs și sfaturi, pe e-mail. Te poți dezabona oricând.',
    didYouMean: 'Ai vrut să scrii',
    useIt: 'Folosește-l',
    nameErrors: {
      required: 'Scrie-ți numele.',
      tooShort: 'Numele trebuie să aibă cel puțin 2 caractere.',
      tooLong: 'Numele poate avea cel mult 80 de caractere.',
      invalidChars: 'Folosește doar litere, spații, cratime, apostrofuri și puncte.',
    },
    emailErrors: {
      required: 'Scrie-ți adresa de e-mail.',
      spaces: 'Adresa de e-mail nu poate conține spații.',
      noAt: 'Adresei îi lipsește „@”, de exemplu nume@exemplu.ro.',
      noDomain: 'Scrie domeniul după „@”, de exemplu exemplu.ro.',
      tooLong: 'Adresa de e-mail este prea lungă.',
      dots: 'Partea dinainte de „@” nu poate începe, se termina sau avea două puncte la rând.',
      domain: 'Domeniul nu pare corect, de exemplu exemplu.ro.',
    },
    rules: {
      length: 'Cel puțin 8 caractere',
      letters: 'Cel puțin o literă',
      digit: 'Cel puțin o cifră',
      cases: 'Litere mari și mici (recomandat)',
      symbol: 'Un simbol, de exemplu ! ? # (recomandat)',
      personal: 'Nu conține numele sau e-mailul tău',
      common: 'Nu este o parolă des folosită',
      edges: 'Nu începe și nu se termină cu spațiu',
    },
    strength: ['Prea slabă', 'Slabă', 'Acceptabilă', 'Bună', 'Puternică'],
    strengthLabel: 'Puterea parolei',
    passwordInvalid: 'Parola nu îndeplinește încă toate cerințele de mai jos.',
    mismatch: 'Parolele nu coincid.',
    againRequired: 'Repetă parola, ca să fim siguri că ai scris-o corect.',
    passwordRequired: 'Scrie-ți parola.',
    match: 'Parolele coincid.',
    planLabel: 'Plan',
    plan: 'Alege planul',
    planHint: 'Ce include planul ales vezi în stânga. Îl poți schimba oricând din pagina contului.',
    terms: (
      <>
        Am citit și accept <a href="/termeni.html">termenii și condițiile</a> și{' '}
        <a href="/confidentialitate.html#cont">politica de confidențialitate</a>.
      </>
    ),
    termsRequired: 'Pentru a crea contul trebuie să accepți termenii.',
    create: 'Creează contul',
    creating: 'Se creează contul…',
    welcome: (name) => `Bun venit, ${name}!`,
    welcomeText: 'Contul tău DocVex este gata.',
    checkEmail: 'Verifică-ți e-mailul',
    checkEmailText: (e) =>
      `Ți-am trimis un link de confirmare la ${e}. Deschide-l ca să-ți activezi contul; poate ajunge și în dosarul Spam.`,
    resend: 'Retrimite e-mailul',
    resendIn: (s) => `Poți retrimite în ${s} s`,
    resent: 'E-mailul a fost retrimis.',
    wrongEmail: 'Ai greșit adresa?',
    exists: 'Există deja un cont cu acest e-mail.',
    signInInstead: 'Autentifică-te cu el',
    signIn: 'Intră în cont',
    signingIn: 'Se verifică…',
    forgot: 'Ai uitat parola?',
    forgotTitle: 'Resetează parola',
    forgotText: 'Îți trimitem un link cu care îți setezi o parolă nouă.',
    sendLink: 'Trimite linkul',
    sending: 'Se trimite…',
    linkSent: (e) =>
      `Dacă există un cont pentru ${e}, ți-am trimis un link de resetare. Verifică și dosarul Spam.`,
    backToSignIn: 'Înapoi la autentificare',
    errors: {
      invalid_credentials: 'E-mailul sau parola nu sunt corecte.',
      email_not_confirmed: 'Confirmă-ți întâi adresa de e-mail, din linkul primit.',
      weak_password: 'Supabase a respins parola ca fiind prea slabă. Alege una mai lungă.',
      over_email_send_rate_limit:
        'Prea multe e-mailuri trimise. Încearcă din nou peste câteva minute.',
      over_request_rate_limit: 'Prea multe încercări. Așteaptă puțin și încearcă din nou.',
      signup_disabled: 'Crearea conturilor noi este oprită momentan.',
      email_address_invalid: 'Adresa de e-mail nu este acceptată.',
      generic: 'Ceva nu a mers. Încearcă din nou.',
    },
  },
  en: {
    steps: ['Account', 'Password', 'About you', 'Plan', 'Review'],
    aboutLead:
      'Optional: your gender and date of birth, for our statistics. You can skip this step.',
    aboutLabel: 'About you',
    aboutNone: 'Not given',
    genderNames: { female: 'Female', male: 'Male', other: 'Other' },
    reviewLead: 'Check your details before creating the account. You can change any step.',
    edit: 'Edit',
    stepOf: (i, n) => `Step ${i} of ${n}`,
    next: 'Continue',
    back: 'Back',
    google: 'Continue with Google',
    or: 'or',
    name: 'Full name',
    email: 'Email',
    password: 'Password',
    passwordAgain: 'Repeat the password',
    show: 'Show password',
    hide: 'Hide password',
    capsLock: 'Caps Lock is on.',
    placeholders: {
      name: 'e.g. Andrei Popescu',
      email: 'name@example.com',
      newPassword: 'At least 8 characters',
      passwordAgain: 'Type the password again',
      password: 'Your password',
    },
    generate: 'Suggest a strong password',
    generated: 'A strong password is filled in and copied. Save it in your password manager.',
    generatedNotCopied: 'A strong password is filled in. Save it in your password manager.',
    newsletter:
      'Send me the DocVex newsletter: product news and tips, by email. You can unsubscribe at any time.',
    didYouMean: 'Did you mean',
    useIt: 'Use it',
    nameErrors: {
      required: 'Enter your name.',
      tooShort: 'Your name must have at least 2 characters.',
      tooLong: 'Your name can have at most 80 characters.',
      invalidChars: 'Use only letters, spaces, hyphens, apostrophes and dots.',
    },
    emailErrors: {
      required: 'Enter your email address.',
      spaces: 'An email address cannot contain spaces.',
      noAt: 'The address is missing “@”, for example name@example.com.',
      noDomain: 'Add the domain after “@”, for example example.com.',
      tooLong: 'The email address is too long.',
      dots: 'The part before “@” cannot start or end with a dot, or have two in a row.',
      domain: 'The domain does not look right, for example example.com.',
    },
    rules: {
      length: 'At least 8 characters',
      letters: 'At least one letter',
      digit: 'At least one digit',
      cases: 'Upper- and lower-case letters (recommended)',
      symbol: 'A symbol, such as ! ? # (recommended)',
      personal: 'Does not contain your name or email',
      common: 'Is not a commonly used password',
      edges: 'Does not start or end with a space',
    },
    strength: ['Too weak', 'Weak', 'Fair', 'Good', 'Strong'],
    strengthLabel: 'Password strength',
    passwordInvalid: 'The password does not meet all the requirements below yet.',
    mismatch: 'The passwords do not match.',
    againRequired: 'Repeat the password, to make sure you typed it right.',
    passwordRequired: 'Enter your password.',
    match: 'The passwords match.',
    planLabel: 'Plan',
    plan: 'Choose your plan',
    planHint:
      'What the chosen plan includes is shown on the left. You can change it at any time from your account page.',
    terms: (
      <>
        I have read and accept the <a href="/termeni.html">terms and conditions</a> and the{' '}
        <a href="/confidentialitate.html#cont">privacy policy</a>.
      </>
    ),
    termsRequired: 'You need to accept the terms to create an account.',
    create: 'Create account',
    creating: 'Creating your account…',
    welcome: (name) => `Welcome, ${name}!`,
    welcomeText: 'Your DocVex account is ready.',
    checkEmail: 'Check your email',
    checkEmailText: (e) =>
      `We sent a confirmation link to ${e}. Open it to activate your account; it may land in your Spam folder.`,
    resend: 'Resend the email',
    resendIn: (s) => `You can resend in ${s}s`,
    resent: 'The email has been sent again.',
    wrongEmail: 'Wrong address?',
    exists: 'An account with this email already exists.',
    signInInstead: 'Sign in with it',
    signIn: 'Sign in',
    signingIn: 'Checking…',
    forgot: 'Forgot your password?',
    forgotTitle: 'Reset your password',
    forgotText: 'We will send you a link to set a new password.',
    sendLink: 'Send the link',
    sending: 'Sending…',
    linkSent: (e) =>
      `If there is an account for ${e}, we sent it a reset link. Check your Spam folder too.`,
    backToSignIn: 'Back to sign in',
    errors: {
      invalid_credentials: 'The email or password is incorrect.',
      email_not_confirmed: 'Confirm your email address first, from the link you received.',
      weak_password: 'Supabase rejected the password as too weak. Choose a longer one.',
      over_email_send_rate_limit: 'Too many emails sent. Try again in a few minutes.',
      over_request_rate_limit: 'Too many attempts. Wait a moment and try again.',
      signup_disabled: 'Creating new accounts is turned off at the moment.',
      email_address_invalid: 'This email address is not accepted.',
      generic: 'Something went wrong. Please try again.',
    },
  },
};

export function useAuthText() {
  const { lang } = useLang();
  return T[lang];
}

const errorText = (t, err) => t.errors[err?.code] ?? t.errors.generic;

// After a submit that failed its checks: the cursor in the first field with
// an error (once the errors have rendered).
function focusFirstError(form) {
  requestAnimationFrame(() => form.querySelector('[aria-invalid="true"]')?.focus());
}

// ---- fields ----------------------------------------------------------------

// A labelled input with its error (or hint) linked for screen readers. An
// error shows once the field has been left with something in it, or the step
// submitted; leaving an empty field (switching tabs, say) shows nothing.
function TextField({ label, error, hint, children }) {
  const id = useId();
  const msg = `${id}-msg`;
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>
        <span>{label}</span>
      </label>
      {children({
        id,
        'aria-invalid': Boolean(error),
        'aria-describedby': error || hint ? msg : undefined,
      })}
      {error ? (
        <small id={msg} className="field-error" role="alert">
          {error}
        </small>
      ) : (
        hint && <small id={msg}>{hint}</small>
      )}
    </div>
  );
}

// A password input with show / hide and a Caps Lock warning; `defaultShown`
// starts it revealed (a suggested password).
function PasswordInput({
  t,
  value,
  onChange,
  onBlur,
  autoComplete,
  placeholder,
  defaultShown = false,
  inputProps,
}) {
  const [shown, setShown] = useState(defaultShown);
  const [caps, setCaps] = useState(false);
  const onKey = (e) => setCaps(e.getModifierState?.('CapsLock') ?? false);
  return (
    <>
      <div className="password-input">
        <input
          {...inputProps}
          type={shown ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          onBlur={(e) => {
            setCaps(false);
            onBlur?.(e);
          }}
          onKeyDown={onKey}
          onKeyUp={onKey}
          spellCheck={false}
          autoCapitalize="none"
        />
        <button
          type="button"
          className="password-toggle"
          aria-label={shown ? t.hide : t.show}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
            <circle cx="12" cy="12" r="3" />
            {shown && <path d="M4 4l16 16" />}
          </svg>
        </button>
      </div>
      {caps && (
        <small className="field-warning" role="status">
          {t.capsLock}
        </small>
      )}
    </>
  );
}

function StrengthMeter({ t, check, password }) {
  const level = check.score;
  return (
    <div className="strength" aria-live="polite" data-level={password ? level : undefined}>
      <div className="strength-bar">
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={password && i < Math.max(level, 1) ? 'is-on' : undefined} />
        ))}
      </div>
      {password && (
        <small>
          {t.strengthLabel}: <b>{t.strength[level]}</b>
        </small>
      )}
      <ul className="rules">
        {check.rules.map((r) => (
          <li
            key={r.id}
            className={[r.ok && password ? 'is-ok' : '', r.required ? '' : 'is-optional']
              .filter(Boolean)
              .join(' ')}
          >
            <svg viewBox="0 0 16 16" aria-hidden="true">
              {r.ok && password ? <path d="M3.5 8.5l3 3 6-7" /> : <circle cx="8" cy="8" r="2.2" />}
            </svg>
            {t.rules[r.id]}
          </li>
        ))}
      </ul>
    </div>
  );
}

export function GoogleButton({ t, onClick, disabled }) {
  return (
    <button
      type="button"
      className="btn is-outline auth-google"
      onClick={onClick}
      disabled={disabled}
    >
      <svg viewBox="0 0 18 18" aria-hidden="true">
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
      {t.google}
    </button>
  );
}

// ---- sign up ---------------------------------------------------------------

// Creating an account in four steps (account, password, plan, and a review
// of it all with the terms),
// each checked before the next; the data stays when going back. The page
// owns the step, so its intro can follow it. After it:
// a welcome (signed in at once) or "check your e-mail" with a resend.
// The review's line for the optional step: "Feminin · 3 martie 1988".
function aboutSummary(about, t, lang) {
  const parts = [];
  if (about.gender) parts.push(t.genderNames[about.gender]);
  const { birth_day: d, birth_month: m, birth_year: y } = about;
  if (d && m && y) {
    parts.push(
      new Intl.DateTimeFormat(lang === 'en' ? 'en-GB' : 'ro-RO', { dateStyle: 'long' }).format(
        new Date(Number(y), Number(m) - 1, Number(d)),
      ),
    );
  }
  return parts.length ? parts.join(' · ') : t.aboutNone;
}

export function SignUp({ plan, setPlan, step, setStep, onSignIn, onCreated }) {
  const t = useAuthText();
  const { lang } = useLang();
  const pt = usePlanText();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [accept, setAccept] = useState(false);
  // Marketing consent: an active opt-in, never ticked in advance (GDPR).
  const [newsletter, setNewsletter] = useState(false);
  // Gender and date of birth, optional (statistics only).
  const [about, setAbout] = useState(EMPTY_DEMOGRAPHICS);
  // The suggested password, and whether it reached the clipboard.
  const [suggested, setSuggested] = useState(null);
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [exists, setExists] = useState(false);
  const [sent, setSent] = useState('');
  const first = useRef(null);

  const nameError = checkName(name);
  const emailCheck = checkEmail(email);
  const pw = checkPassword(password, { email, name });
  const againError = !again ? t.againRequired : again !== password ? t.mismatch : null;
  const show = (field) => touched[field];
  const touch = (...fields) =>
    setTouched((s) => ({ ...s, ...Object.fromEntries(fields.map((f) => [f, true])) }));

  // Focus the first field of each step.
  useEffect(() => {
    first.current?.focus();
  }, [step]);

  // Counted once, when the first step is shown.
  const started = useRef(false);
  useEffect(() => {
    if (step === 0 && !started.current) {
      started.current = true;
      track('Signup Started');
    }
  }, [step]);

  function next(event) {
    event.preventDefault();
    setError(null);
    const form = event.currentTarget;
    if (step === 0) {
      touch('name', 'email');
      if (nameError || emailCheck.error) return focusFirstError(form);
      setExists(false);
      setStep(1);
    } else if (step === 1) {
      touch('password', 'again');
      if (!pw.valid || againError) return focusFirstError(form);
      setStep(2);
    } else if (step === 2) {
      touch('about');
      if (demographicsError(about)) return focusFirstError(form);
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else {
      touch('accept');
      if (!accept) return focusFirstError(form);
      create();
    }
  }

  // Fills both password fields with a strong random password, shows them and
  // copies it.
  async function suggest() {
    const value = generatePassword();
    setPassword(value);
    setAgain(value);
    touch('password', 'again');
    let copied = false;
    try {
      await navigator.clipboard.writeText(value);
      copied = true;
    } catch {
      // No clipboard access: it is still filled in and shown.
    }
    setSuggested({ password: value, copied });
  }

  async function create() {
    setBusy(true);
    try {
      const supabase = await getSupabase();
      const { data, error: err } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          emailRedirectTo: authRedirect(),
          data: {
            full_name: name.trim(),
            plan: plan ?? 'start',
            has_password: true,
            // The newsletter consent and when it was given.
            newsletter,
            newsletter_at: newsletter ? new Date().toISOString() : null,
            // Only what was chosen; nothing when both are "Prefer not to say".
            ...Object.fromEntries(
              Object.entries(demographicsData(about)).filter(([, v]) => v !== null),
            ),
          },
        },
      });
      if (err) throw err;
      // An address already in use comes back as a user with no identities.
      if (data.user && !data.user.identities?.length) {
        setExists(true);
        setStep(0);
        return;
      }
      track('Signup Completed', { plan: plan ?? 'start' });
      if (data.session) onCreated?.(data.session);
      else setSent(email.trim());
    } catch (err) {
      if (err.code === 'user_already_exists' || err.code === 'email_exists') {
        setExists(true);
        setStep(0);
      } else if (err.code === 'weak_password') {
        setError(errorText(t, err));
        setStep(1);
      } else {
        setError(errorText(t, err));
      }
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return <CheckEmail t={t} email={sent} onBack={() => setSent('')} />;
  }

  return (
    <form onSubmit={next} noValidate>
      {step === 0 && (
        <>
          <TextField
            label={t.name}
            error={show('name') && nameError ? t.nameErrors[nameError] : null}
          >
            {(props) => (
              <input
                {...props}
                ref={first}
                value={name}
                autoComplete="name"
                placeholder={t.placeholders.name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name && touch('name')}
              />
            )}
          </TextField>
          <TextField
            label={t.email}
            error={
              exists
                ? t.exists
                : show('email') && emailCheck.error
                  ? t.emailErrors[emailCheck.error]
                  : null
            }
          >
            {(props) => (
              <input
                {...props}
                type="email"
                inputMode="email"
                value={email}
                autoComplete="email"
                placeholder={t.placeholders.email}
                spellCheck={false}
                autoCapitalize="none"
                onChange={(e) => {
                  setEmail(e.target.value);
                  setExists(false);
                }}
                onBlur={() => email && touch('email')}
              />
            )}
          </TextField>
          {exists && (
            <p className="field-action">
              <button type="button" className="link-button" onClick={() => onSignIn(email.trim())}>
                {t.signInInstead}
              </button>
            </p>
          )}
          {emailCheck.suggestion && (
            <p className="field-suggestion" role="status">
              {t.didYouMean} <b>{emailCheck.suggestion}</b>?{' '}
              <button
                type="button"
                className="link-button"
                onClick={() => setEmail(emailCheck.suggestion)}
              >
                {t.useIt}
              </button>
            </p>
          )}
        </>
      )}

      {step === 1 && (
        <>
          <TextField
            label={t.password}
            error={show('password') && !pw.valid ? t.passwordInvalid : null}
          >
            {(props) => (
              <PasswordInput
                key={suggested?.password}
                t={t}
                value={password}
                onChange={setPassword}
                onBlur={() => password && touch('password')}
                autoComplete="new-password"
                placeholder={t.placeholders.newPassword}
                defaultShown={Boolean(suggested)}
                inputProps={{ ...props, ref: first }}
              />
            )}
          </TextField>
          <p className="field-action">
            <button type="button" className="link-button" onClick={suggest}>
              {t.generate}
            </button>
          </p>
          {suggested && password === suggested.password && (
            <p className="field-suggestion" role="status">
              {suggested.copied ? t.generated : t.generatedNotCopied}
            </p>
          )}
          <StrengthMeter t={t} check={pw} password={password} />
          <TextField
            label={t.passwordAgain}
            error={show('again') && againError ? againError : null}
            hint={again && !againError ? t.match : null}
          >
            {(props) => (
              <PasswordInput
                key={suggested?.password}
                t={t}
                value={again}
                onChange={setAgain}
                onBlur={() => again && touch('again')}
                autoComplete="new-password"
                placeholder={t.placeholders.passwordAgain}
                defaultShown={Boolean(suggested)}
                inputProps={props}
              />
            )}
          </TextField>
        </>
      )}

      {step === 2 && (
        <>
          <p className="note">{t.aboutLead}</p>
          <Demographics
            value={about}
            onChange={setAbout}
            idPrefix="signup"
            showErrors={show('about')}
            firstRef={first}
          />
        </>
      )}

      {step === 3 && (
        <fieldset className="plan-choice">
          <legend>{t.plan}</legend>
          {PLAN_IDS.map((id, i) => (
            <label
              key={id}
              className={[
                'plan-option',
                (plan ?? 'start') === id && 'is-on',
                id === FEATURED && 'is-featured',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {/* The recommended plan's pill, on the card's top-right border. */}
              {id === FEATURED && <span className="plan-option-badge">{pt.featured}</span>}
              <input
                type="radio"
                name="plan"
                value={id}
                ref={i === 0 ? first : undefined}
                checked={(plan ?? 'start') === id}
                onChange={() => setPlan(id)}
              />
              <span className="plan-option-radio" aria-hidden="true" />
              <span className="plan-option-body">
                <span className="plan-option-name">{pt.plans[id].name}</span>
                <span className="plan-option-text">{pt.plans[id].text}</span>
              </span>
              <span className="plan-option-price">
                <b>{pt.plans[id].price}</b> {pt.perMonth}
              </span>
            </label>
          ))}
          <small>{t.planHint}</small>
        </fieldset>
      )}

      {step === 4 && (
        <>
          <p className="note">{t.reviewLead}</p>
          <dl className="review">
            {[
              [t.name, name.trim(), 0],
              [t.email, email.trim(), 0],
              [
                t.password,
                '•'.repeat(Math.min(password.length, 12)),
                1,
                <small data-level={pw.score}>{t.strength[pw.score]}</small>,
              ],
              [t.aboutLabel, aboutSummary(about, t, lang), 2],
              [
                t.planLabel,
                `${pt.plans[plan ?? 'start'].name} · ${pt.plans[plan ?? 'start'].price} ${pt.perMonth}`,
                3,
              ],
            ].map(([label, value, to, extra]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  <span className="review-value">
                    {value}
                    {extra}
                  </span>
                  <button
                    type="button"
                    className="link-button"
                    aria-label={`${t.edit}: ${label}`}
                    onClick={() => setStep(to)}
                  >
                    {t.edit}
                  </button>
                </dd>
              </div>
            ))}
          </dl>
          {/* Optional, unticked: the step's first control. */}
          <label className="check">
            <input
              ref={first}
              type="checkbox"
              checked={newsletter}
              onChange={(e) => setNewsletter(e.target.checked)}
            />
            <span>{t.newsletter}</span>
          </label>
          <label className={`check${show('accept') && !accept ? ' has-error' : ''}`}>
            <input
              type="checkbox"
              checked={accept}
              aria-invalid={Boolean(show('accept') && !accept)}
              onChange={(e) => setAccept(e.target.checked)}
            />
            <span>{t.terms}</span>
          </label>
          {show('accept') && !accept && (
            <small className="field-error" role="alert">
              {t.termsRequired}
            </small>
          )}
        </>
      )}

      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}

      <div className="form-actions">
        {step > 0 ? (
          <BackButton onClick={() => setStep(step - 1)} disabled={busy}>
            {t.back}
          </BackButton>
        ) : (
          <span className="note">{t.stepOf(1, t.steps.length)}</span>
        )}
        <ContinueButton disabled={busy}>
          {busy ? t.creating : step < 4 ? t.next : t.create}
        </ContinueButton>
      </div>
    </form>
  );
}

// "Check your e-mail", with a resend that waits a minute between sends.
function CheckEmail({ t, email, onBack }) {
  const [wait, setWait] = useState(60);
  const [status, setStatus] = useState(null);
  useEffect(() => {
    if (wait <= 0) return;
    const id = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(id);
  }, [wait]);

  async function resend() {
    setStatus(null);
    try {
      const supabase = await getSupabase();
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: authRedirect() },
      });
      if (error) throw error;
      setStatus({ text: t.resent });
      setWait(60);
    } catch (err) {
      setStatus({ text: errorText(t, err), error: true });
    }
  }

  return (
    <div className="auth-done" role="status">
      <span className="auth-done-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <path d="m4 7 8 6 8-6" />
        </svg>
      </span>
      <h2>{t.checkEmail}</h2>
      <p>{t.checkEmailText(email)}</p>
      <div className="actions is-center">
        <button type="button" className="btn is-outline" onClick={resend} disabled={wait > 0}>
          {wait > 0 ? t.resendIn(wait) : t.resend}
        </button>
      </div>
      {status && <p className={status.error ? 'auth-error' : 'note'}>{status.text}</p>}
      <p className="note">{t.wrongEmail}</p>
      <BackButton onClick={onBack}>{t.back}</BackButton>
    </div>
  );
}

// ---- sign in ---------------------------------------------------------------

export function SignIn({ initialEmail = '' }) {
  const t = useAuthText();
  const [view, setView] = useState('signin');
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [sent, setSent] = useState('');
  const first = useRef(null);
  const emailCheck = checkEmail(email);

  useEffect(() => {
    if (initialEmail) setEmail(initialEmail);
  }, [initialEmail]);

  useEffect(() => {
    first.current?.focus();
  }, [view]);

  async function signIn(event) {
    event.preventDefault();
    setTouched({ email: true, password: true });
    if (emailCheck.error || !password) return focusFirstError(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const supabase = await getSupabase();
      const { error: err } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (err) throw err;
      track('Signin', { provider: 'email' });
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  async function sendReset(event) {
    event.preventDefault();
    setTouched({ email: true });
    if (emailCheck.error) return focusFirstError(event.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const supabase = await getSupabase();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/cont.html?parola=noua#metode`,
      });
      if (err) throw err;
      track('Password Reset Requested');
      setSent(email.trim());
    } catch (err) {
      setError(errorText(t, err));
    } finally {
      setBusy(false);
    }
  }

  const emailField = (
    <TextField
      label={t.email}
      error={touched.email && emailCheck.error ? t.emailErrors[emailCheck.error] : null}
    >
      {(props) => (
        <input
          {...props}
          ref={first}
          type="email"
          inputMode="email"
          value={email}
          autoComplete="email"
          placeholder={t.placeholders.email}
          spellCheck={false}
          autoCapitalize="none"
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => email && setTouched((s) => ({ ...s, email: true }))}
        />
      )}
    </TextField>
  );

  if (view === 'forgot') {
    return sent ? (
      <div className="auth-done" role="status">
        <p>{t.linkSent(sent)}</p>
        <BackButton
          onClick={() => {
            setSent('');
            setView('signin');
          }}
        >
          {t.backToSignIn}
        </BackButton>
      </div>
    ) : (
      <form onSubmit={sendReset} noValidate>
        <h3 className="auth-subtitle">{t.forgotTitle}</h3>
        <p className="note">{t.forgotText}</p>
        {emailField}
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <BackButton onClick={() => setView('signin')}>{t.back}</BackButton>
          <ContinueButton disabled={busy}>{busy ? t.sending : t.sendLink}</ContinueButton>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={signIn} noValidate>
      {emailField}
      <TextField
        label={t.password}
        error={touched.password && !password ? t.passwordRequired : null}
      >
        {(props) => (
          <PasswordInput
            t={t}
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            placeholder={t.placeholders.password}
            inputProps={props}
          />
        )}
      </TextField>
      {error && (
        <p className="auth-error" role="alert">
          {error}
        </p>
      )}
      {/* Forgot your password? on the left, Sign in on the right. */}
      <div className="form-actions">
        <button type="button" className="link-button" onClick={() => setView('forgot')}>
          {t.forgot}
        </button>
        <ContinueButton disabled={busy}>{busy ? t.signingIn : t.signIn}</ContinueButton>
      </div>
    </form>
  );
}
