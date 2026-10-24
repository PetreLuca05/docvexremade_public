import { useEffect, useState } from 'react';
import Layout from '../components/Layout.jsx';
import { PLAN_IDS, PlanDetails, usePlanText } from '../components/Plans.jsx';
import { GoogleButton, SignIn, SignUp, useAuthText } from '../components/AuthForms.jsx';
import { authConfigured, authRedirect, checkoutUrl, getSupabase, paymentLink } from '../auth.js';
import { useLang, useMeta } from '../i18n.jsx';

const META = {
  ro: {
    title: 'Autentificare — DocVex',
    description: 'Creează-ți contul DocVex sau autentifică-te, cu Google sau cu e-mail și parolă.',
  },
  en: {
    title: 'Sign in — DocVex',
    description:
      'Create your DocVex account or sign in, with Google or with an email and password.',
  },
};

const T = {
  ro: {
    // The intro beside the form, for each tab.
    intro: {
      signup: {
        eyebrow: 'Începe',
        title: 'Creează-ți contul DocVex.',
        // The sign-up's own steps, followed as the form moves on.
        steps: [
          ['Contul', 'Numele și e-mailul tău, sau continuă cu Google, mai jos.'],
          ['Parola', 'O parolă sigură: cel puțin 8 caractere, cu litere și cifre.'],
          ['Planul', 'Alegi planul; cele plătite se plătesc online, prin Stripe.'],
          ['Verificare', 'Verifici toate datele, accepți termenii și creezi contul.'],
        ],
        stepOf: (i, n) => `Pasul ${i} din ${n}`,
        goTo: (name) => `Înapoi la pasul ${name}`,
      },
      signin: {
        eyebrow: 'Bine ai revenit',
        title: 'Intră în contul tău DocVex.',
        steps: [
          'Intră cu Google sau cu e-mailul și parola contului.',
          'Ai uitat parola? Îți trimitem un link ca să-ți setezi una nouă.',
          'Același cont te autentifică și în aplicație.',
        ],
      },
    },
    plan: 'Planul ales',
    signUp: 'Cont nou',
    signIn: 'Autentificare',
    signedIn: (email) => `Ești autentificat ca ${email}.`,
    pay: 'Continuă la plată',
    payLater: 'Plata online pentru acest plan nu este disponibilă încă.',
    paid: 'Plata a fost primită. Mulțumim!',
    download: 'Descarcă aplicația',
    signOut: 'Ieși din cont',
    unavailable: 'Conturile nu sunt disponibile încă pe site. Revino curând.',
    errors: {
      invalid_credentials: 'E-mailul sau parola nu sunt corecte.',
      user_already_exists: 'Există deja un cont cu acest e-mail. Autentifică-te.',
      email_exists: 'Există deja un cont cu acest e-mail. Autentifică-te.',
      weak_password: 'Parola este prea slabă. Alege una mai lungă.',
      email_not_confirmed: 'Confirmă-ți întâi adresa de e-mail, din linkul primit.',
      over_email_send_rate_limit: 'Prea multe încercări. Încearcă din nou peste câteva minute.',
      generic: 'Ceva nu a mers. Încearcă din nou.',
    },
  },
  en: {
    // The intro beside the form, for each tab.
    intro: {
      signup: {
        eyebrow: 'Get started',
        title: 'Create your DocVex account.',
        // The sign-up's own steps, followed as the form moves on.
        steps: [
          ['Account', 'Your name and email, or continue with Google below.'],
          ['Password', 'A secure password: at least 8 characters, with letters and digits.'],
          ['Plan', 'Choose your plan; paid ones are paid online, through Stripe.'],
          ['Review', 'Check all your details, accept the terms and create the account.'],
        ],
        stepOf: (i, n) => `Step ${i} of ${n}`,
        goTo: (name) => `Back to the ${name} step`,
      },
      signin: {
        eyebrow: 'Welcome back',
        title: 'Sign in to your DocVex account.',
        steps: [
          'Sign in with Google or with your account’s email and password.',
          'Forgot your password? We will send you a link to set a new one.',
          'The same account signs you in to the app too.',
        ],
      },
    },
    plan: 'Chosen plan',
    signUp: 'New account',
    signIn: 'Sign in',
    signedIn: (email) => `You are signed in as ${email}.`,
    pay: 'Continue to payment',
    payLater: 'Online payment for this plan is not available yet.',
    paid: 'Payment received. Thank you!',
    download: 'Download the app',
    signOut: 'Sign out',
    unavailable: 'Accounts are not available on the site yet. Check back soon.',
    errors: {
      invalid_credentials: 'The email or password is incorrect.',
      user_already_exists: 'An account with this email already exists. Sign in instead.',
      email_exists: 'An account with this email already exists. Sign in instead.',
      weak_password: 'The password is too weak. Choose a longer one.',
      email_not_confirmed: 'Confirm your email address first, from the link you received.',
      over_email_send_rate_limit: 'Too many attempts. Try again in a few minutes.',
      generic: 'Something went wrong. Please try again.',
    },
  },
};

// "#autentificare" (the header's sign-in link) opens the form on sign-in.
function modeFromHash() {
  return window.location.hash === '#autentificare' ? 'signin' : 'signup';
}

function AuthPanel({ t, lang, plan, setPlan, mode, setMode, step, setStep }) {
  const pt = usePlanText();
  const at = useAuthText();
  const [session, setSession] = useState(undefined);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [signInEmail, setSignInEmail] = useState('');
  const [welcome, setWelcome] = useState(false);
  const paidBack = new URLSearchParams(window.location.search).get('plata') === 'ok';

  useEffect(() => {
    if (!authConfigured) return;
    let subscription;
    let alive = true;
    getSupabase().then((supabase) => {
      supabase.auth.getSession().then(({ data }) => alive && setSession(data.session));
      ({
        data: { subscription },
      } = supabase.auth.onAuthStateChange((_event, next) => {
        if (alive) setSession(next);
      }));
    });
    return () => {
      alive = false;
      subscription?.unsubscribe();
    };
  }, []);

  // A plan picked before confirming the e-mail comes back with the account.
  const savedPlan = session?.user?.user_metadata?.plan;
  useEffect(() => {
    if (PLAN_IDS.includes(savedPlan)) setPlan((p) => p ?? savedPlan);
  }, [savedPlan, setPlan]);

  // Signed in (by signing in, creating an account or coming back from
  // Google): on to the landing page, logged in; or first to Stripe, when a
  // paid plan was picked while creating the account. The panel below stays
  // only for the return from Stripe.
  const leaving = Boolean(session) && !paidBack;
  useEffect(() => {
    if (!leaving) return;
    const paid = mode === 'signup' && plan && plan !== 'start';
    const checkout = paid ? checkoutUrl(plan, session.user, lang) : null;
    window.location.replace(checkout || '/');
  }, [leaving]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!authConfigured) return <div className="callout">{t.unavailable}</div>;
  if (session === undefined || leaving) return <div className="auth-card" aria-busy="true" />;

  const chosen = plan ?? 'start';
  const planSelect = (
    <label className="field">
      <span>{t.plan}</span>
      <select value={chosen} onChange={(e) => setPlan(e.target.value)}>
        {PLAN_IDS.map((id) => (
          <option key={id} value={id}>
            {pt.plans[id].name} · {pt.plans[id].price} {pt.perMonth}
          </option>
        ))}
      </select>
    </label>
  );

  if (session) {
    const user = session.user;
    const paid = chosen !== 'start';
    const checkout = paid ? checkoutUrl(chosen, user, lang) : null;
    return (
      <div className="auth-card">
        {paidBack && <div className="callout">{t.paid}</div>}
        {welcome && (
          <div className="auth-welcome">
            <h2>{at.welcome((user.user_metadata?.full_name ?? '').split(' ')[0] || user.email)}</h2>
            <p>{at.welcomeText}</p>
          </div>
        )}
        <p>{t.signedIn(user.email)}</p>
        {planSelect}
        <div className="actions">
          {paid && checkout && (
            <a className="btn is-gold" href={checkout}>
              {t.pay}
            </a>
          )}
          <a
            className={`btn ${paid && checkout ? 'is-outline' : 'is-gold'}`}
            href="/instalare.html"
          >
            {t.download}
          </a>
          <button
            type="button"
            className="btn is-ghost"
            onClick={async () => (await getSupabase()).auth.signOut()}
          >
            {t.signOut}
          </button>
        </div>
        {paid && !paymentLink(chosen) && <p className="note">{t.payLater}</p>}
      </div>
    );
  }

  // Google returns to this page; the plan picked before leaving comes back
  // in the redirect's ?plan=.
  async function google() {
    setBusy(true);
    setError('');
    try {
      const supabase = await getSupabase();
      // From New account the plan comes back with Google (?plan=), so a paid
      // one goes on to Stripe; from Sign in it does not.
      const redirect = new URL(authRedirect());
      if (mode === 'signup') redirect.searchParams.set('plan', chosen);
      const { error: err } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirect.toString() },
      });
      if (err) throw err;
    } catch (err) {
      setError(t.errors[err.code] ?? t.errors.generic);
      setBusy(false);
    }
  }

  // The form's card, then "or" and Google below it.
  return (
    <div className="auth-column">
      <div className="auth-card">
        <div className="auth-tabs" role="tablist">
          {[
            ['signup', t.signUp],
            ['signin', t.signIn],
          ].map(([m, label]) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              onClick={() => {
                setMode(m);
                setError('');
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {error && (
          <p className="auth-error" role="alert">
            {error}
          </p>
        )}
        {mode === 'signup' ? (
          <SignUp
            plan={plan}
            setPlan={setPlan}
            step={step}
            setStep={setStep}
            onSignIn={(email) => {
              setSignInEmail(email);
              setMode('signin');
            }}
            onCreated={() => setWelcome(true)}
          />
        ) : (
          <SignIn initialEmail={signInEmail} />
        )}
      </div>
      <p className="auth-or">{at.or}</p>
      <GoogleButton t={at} onClick={google} disabled={busy} />
    </div>
  );
}

export default function Autentificare() {
  const { lang } = useLang();
  const t = T[lang];
  useMeta(META);
  const [plan, setPlan] = useState(() => {
    const p = new URLSearchParams(window.location.search).get('plan');
    return PLAN_IDS.includes(p) ? p : null;
  });
  // The tab, shared by the form and the intro beside it.
  const [mode, setMode] = useState(modeFromHash);
  useEffect(() => {
    const onHash = () => setMode(modeFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  const intro = t.intro[mode];
  // The sign-up's step, shown both in the form and in the intro beside it.
  const [step, setStep] = useState(0);

  return (
    <Layout
      page="autentificare"
      navPage={mode === 'signin' ? 'autentificare' : null}
      mainClassName="pricing auth-page"
    >
      <section className="wrap get-started is-page" id="incepe">
        <div>
          <div className="auth-intro" key={mode}>
            <span className="eyebrow">{intro.eyebrow}</span>
            <h1 className="display" id="autentificare">
              {intro.title}
            </h1>
            {mode === 'signup' ? (
              <ol className="progress" aria-label={intro.stepOf(step + 1, intro.steps.length)}>
                {intro.steps.map(([name, text], i) => (
                  <li
                    key={name}
                    className={i < step ? 'is-done' : i === step ? 'is-current' : undefined}
                    aria-current={i === step ? 'step' : undefined}
                  >
                    <span className="progress-dot" aria-hidden="true">
                      {i < step ? (
                        <svg viewBox="0 0 16 16">
                          <path d="M3.5 8.5l3 3 6-7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </span>
                    <span className="progress-body">
                      {i < step ? (
                        <button
                          type="button"
                          className="progress-name"
                          aria-label={intro.goTo(name)}
                          onClick={() => setStep(i)}
                        >
                          {name}
                        </button>
                      ) : (
                        <b className="progress-name">{name}</b>
                      )}
                      <span>{text}</span>
                      {/* The plan step: the plan ticked in the form. */}
                      {i === 2 && step === 2 && (
                        <PlanDetails key={plan ?? 'start'} id={plan ?? 'start'} compact />
                      )}
                    </span>
                  </li>
                ))}
              </ol>
            ) : (
              <ol className="steps">
                {intro.steps.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ol>
            )}
          </div>
        </div>
        <AuthPanel
          t={t}
          lang={lang}
          plan={plan}
          setPlan={setPlan}
          mode={mode}
          setMode={setMode}
          step={step}
          setStep={setStep}
        />
      </section>
    </Layout>
  );
}
