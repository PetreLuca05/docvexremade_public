// The account page (cont.html): the design's portal, filled with the signed-in account as Supabase keeps it.
// What the site's account holds is shown in full: the name, e-mail, plan, sign-in methods, newsletter consent, the
// app's AI usage (the `ai` function) and the problem reports sent from the app (`app_reports_mine`). The design's other
// sections (projects, tracked cases, deadlines, notifications, devices, Playbook) stay in the desktop app for now, so
// those panels say so instead of showing anything made up.
import { authConfigured, authHref, billingUrl, getSupabase } from '../auth.js';

const PLANS = {
  start: { name: 'Start', price: '0 lei / lună', text: 'Pentru a încerca DocVex.' },
  pro: { name: 'Solo', price: '199 lei / lună', text: 'Pentru avocatul sau juristul care lucrează zilnic cu dosare.' },
  cabinet: { name: 'Cabinet', price: '499 lei / lună', text: 'Pentru cabinete și echipe juridice.' },
};
const CATEGORIES = {
  bug: 'Eroare',
  ai_answer: 'Răspuns AI',
  document: 'Document',
  billing: 'Facturare',
  feature: 'Propunere',
  other: 'Altceva',
};
const STATUSES = {
  new: ['Primită', ''],
  seen: ['Văzută', ''],
  replied: ['Cu răspuns', 'ok'],
  closed: ['Închisă', 'mut'],
};
const PROVIDERS = { google: 'Google', apple: 'Apple', azure: 'Microsoft', github: 'GitHub' };
const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];
const DAYS = ['duminică', 'luni', 'marți', 'miercuri', 'joi', 'vineri', 'sâmbătă'];

const esc = (v) =>
  String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const pad = (n) => String(n).padStart(2, '0');
const sameDay = (a, b) => a.toDateString() === b.toDateString();

// "astăzi, 09:10", "ieri, 17:20", "21 noiembrie", "14 octombrie 2025", as the design writes dates.
function when(iso, { time = true, year = false } = {}) {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  const now = new Date();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const hm = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (time && sameDay(d, now)) return `astăzi, ${hm}`;
  if (time && sameDay(d, yesterday)) return `ieri, ${hm}`;
  const day = `${d.getDate()} ${MONTHS[d.getMonth()]}`;
  return year || d.getFullYear() !== now.getFullYear() ? `${day} ${d.getFullYear()}` : day;
}

// When a usage limit starts again: "peste 2 ore și 10 minute", "luni", "pe 3 decembrie".
function resets(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const ms = d - Date.now();
  if (Number.isNaN(ms)) return '';
  if (ms <= 60e3) return 'Se reia acum';
  if (ms < 24 * 3600e3) {
    const h = Math.floor(ms / 3600e3);
    const m = Math.round((ms % 3600e3) / 60e3);
    const hours = h === 1 ? 'o oră' : h < 20 ? `${h} ore` : `${h} de ore`;
    const mins = m === 1 ? 'un minut' : m < 20 ? `${m} minute` : `${m} de minute`;
    return `Se reia peste ${h ? hours + (m ? ' și ' : '') : ''}${m || !h ? mins : ''}`;
  }
  if (ms < 7 * 24 * 3600e3) return `Se reia ${DAYS[d.getDay()]}`;
  return `Se reia pe ${when(iso, { time: false })}`;
}

const nameOf = (user) => {
  const meta = user.user_metadata ?? {};
  return (meta.full_name || meta.name || '').trim();
};
const planOf = (user) => PLANS[user.user_metadata?.plan] ?? PLANS.start;
const empty = (text) => `<p class="p-fine" data-empty>${esc(text)}</p>`;

// The app's own usage summary: the `ai` function's `usage` action, with the account's token.
async function fetchUsage(supabase) {
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

function meter(label, part) {
  const { used = 0, limit = 0, resetsAt } = part ?? {};
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const n = new Intl.NumberFormat('ro-RO');
  const detail = [limit ? `${n.format(used)} din ${n.format(limit)} tokeni` : '', resets(resetsAt)].filter(Boolean).join(' · ');
  return `<div class="meter"><p><span>${esc(label)}</span><b>${pct}%</b></p><div><i style="width:${pct}%"></i></div><small>${esc(detail)}</small></div>`;
}

export function initPortal(portal, tab) {
  const page = portal.closest('main');
  const $ = (s) => page.querySelector(s);
  const $$ = (s) => [...page.querySelectorAll(s)];
  const params = new URLSearchParams(window.location.search);
  let supabase = null;
  let user = null;
  let reports = [];
  // Leaving the page (signed out): once, whichever of the sign-out button and Supabase's event gets there first.
  let leaving = false;
  const leave = (url) => {
    if (leaving) return;
    leaving = true;
    window.location.replace(url);
  };

  if (!authConfigured) {
    $('[data-who]').textContent = 'Conturile nu sunt disponibile încă pe site. Revino curând.';
    portal.hidden = true;
    return;
  }

  function header() {
    const first = nameOf(user).split(/\s+/)[0];
    $('[data-hello]').textContent = first ? `Bun venit, ${first}` : 'Bun venit';
    $('[data-who]').textContent = `${user.email} · plan ${planOf(user).name}`;
  }

  function plan() {
    const p = planOf(user);
    $$('[data-plan-name]').forEach((el) => (el.textContent = p.name));
    $$('[data-plan-price]').forEach((el) => (el.textContent = p.price));
    $('[data-plan-text]').textContent = p.text;
    $('[data-billing]').href = billingUrl(user);
  }

  function profile() {
    const meta = user.user_metadata ?? {};
    const rows = [
      ['Nume', nameOf(user) || '—'],
      ['E-mail', user.email],
      ['E-mail confirmat', user.email_confirmed_at ? 'da' : 'nu'],
      ['Cont creat la', when(user.created_at, { time: false, year: true })],
      ['Ultima autentificare', when(user.last_sign_in_at)],
    ];
    if (meta.downloaded_version) rows.push(['Descărcată de pe site', `DocVex ${meta.downloaded_version}`]);
    $('[data-details]').innerHTML = rows.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    const ids = user.identities ?? [];
    const hasPassword = ids.some((i) => i.provider === 'email') || meta.has_password === true;
    const methods = ids
      .filter((i) => i.provider !== 'email')
      .map((i) => [PROVIDERS[i.provider] ?? i.provider, i.identity_data?.email || user.email]);
    if (hasPassword) methods.push(['E-mail și parolă', 'Parolă setată']);
    $('[data-methods]').innerHTML = methods.length
      ? methods.map(([b, s]) => `<li><div><b>${esc(b)}</b><span>${esc(s)}</span></div></li>`).join('')
      : '<li><div><b>E-mail</b><span>Fără parolă</span></div></li>';
    $('[data-pass-open] span').textContent = hasPassword ? 'Schimbați parola' : 'Setați o parolă';
    $('#p-news').checked = meta.newsletter === true;
    const devices = $('[data-devices]');
    devices.innerHTML = empty(
      'Niciun dispozitiv în cont: calculatoarele pe care folosiți aplicația se văd în DocVex.' +
        (meta.downloaded_version ? ` Ultima versiune descărcată de pe site: DocVex ${meta.downloaded_version}.` : ''),
    );
    const subject = encodeURIComponent('Ștergerea contului DocVex');
    const body = encodeURIComponent(`Vă rog să ștergeți contul DocVex ${user.email} și toate datele lui.`);
    $('[data-delete]').href = `mailto:support@docvex.ro?subject=${subject}&body=${body}`;
  }

  function showReports() {
    const box = $('[data-reports]');
    if (!reports.length) {
      box.innerHTML = empty('Nicio sesizare încă.');
      return;
    }
    const item = (r) => {
      const [label, cls] = STATUSES[r.status] ?? [r.status, ''];
      const meta = [r.public_id, CATEGORIES[r.category] ?? r.category, `trimisă pe ${when(r.created_at, { time: false })}`];
      const reply = r.admin_reply
        ? `<p><i>Răspunsul echipei, ${esc(when(r.replied_at, { time: false }))}:</i> ${esc(r.admin_reply)}</p>`
        : '';
      return `<li><div><b>${esc(r.title || '—')}</b><span>${esc(meta.join(' · '))}</span>${reply}</div><span class="p-tag ${cls}">${esc(label)}</span></li>`;
    };
    box.innerHTML = `<ul class="p-notif rep">${reports.map(item).join('')}</ul>`;
  }

  async function loadReports() {
    try {
      const { data, error } = await supabase
        .from('app_reports_mine')
        .select('public_id, category, title, status, admin_reply, replied_at, created_at')
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      reports = data ?? [];
      showReports();
    } catch {
      $('[data-reports]').innerHTML = empty('Sesizările nu au putut fi încărcate. Reîncărcați pagina ca să încercați din nou.');
    }
  }

  async function loadUsage() {
    try {
      const usage = await fetchUsage(supabase);
      const weekly = usage.weekly ?? {};
      const pct = weekly.limit ? Math.min(100, Math.round(((weekly.used ?? 0) / weekly.limit) * 100)) : 0;
      $('[data-ai-week]').textContent = `${pct}%`;
      $('[data-ai-week-sub]').textContent = resets(weekly.resetsAt).replace(/^Se reia/, 'se reia') || ' ';
      const blocked = usage.blocked
        ? `<p class="p-fine">Limita a fost atinsă${usage.blocked.until ? ` până ${esc(when(usage.blocked.until))}` : ''}.</p>`
        : '';
      const short = meter('Sesiunea curentă (5 ore)', usage.session) + meter('Săptămâna aceasta', usage.weekly);
      $('[data-ai-short]').innerHTML = blocked + short;
      const n = new Intl.NumberFormat('ro-RO');
      $('[data-ai-full]').innerHTML =
        blocked +
        short +
        (usage.fable ? meter('Fable, săptămâna aceasta', usage.fable) : '') +
        `<p class="p-fine">${esc(n.format(usage.requests ?? 0))} cereri săptămâna aceasta.</p>`;
    } catch {
      const failed = empty('Utilizarea nu a putut fi încărcată. Reîncărcați pagina ca să încercați din nou.');
      $('[data-ai-short]').innerHTML = failed;
      $('[data-ai-full]').innerHTML = failed;
      $('[data-ai-week-sub]').textContent = 'indisponibil';
    }
  }

  function render() {
    header();
    plan();
    profile();
  }

  // ---- newsletter -----------------------------------------------------------
  const news = $('#p-news');
  const newsOut = $('[data-news-out]');
  news.addEventListener('change', async () => {
    const on = news.checked;
    news.disabled = true;
    newsOut.hidden = false;
    newsOut.textContent = 'Se salvează…';
    try {
      const { error } = await supabase.auth.updateUser({
        data: { newsletter: on, newsletter_at: on ? new Date().toISOString() : null },
      });
      if (error) throw error;
      newsOut.textContent = on ? 'Vă vom trimite newsletterul DocVex.' : 'Nu mai primiți newsletterul.';
    } catch {
      news.checked = !on;
      newsOut.textContent = 'Ceva nu a mers. Încercați din nou.';
    } finally {
      news.disabled = false;
    }
  });

  // ---- password (also where the reset link lands: ?parola=noua) ---------------
  const form = $('[data-pass]');
  const out = form.querySelector('.au-out');
  const p1 = $('#p-pass1');
  const p2 = $('#p-pass2');
  const nonce = $('#p-nonce');
  const nonceField = form.querySelector('[data-nonce]');
  function fieldErr(input, msg) {
    const f = input.closest('.field');
    f.querySelector('.err').textContent = msg || '';
    f.classList.toggle('has-error', !!msg);
    if (msg) input.setAttribute('aria-invalid', 'true');
    else input.removeAttribute('aria-invalid');
    return !msg;
  }
  function openPassword(lead) {
    form.hidden = false;
    $('[data-pass-open]').hidden = true;
    form.querySelector('[data-pass-lead]').textContent = lead || 'Cel puțin 8 caractere, cu litere și cifre.';
    p1.focus();
  }
  function closePassword() {
    form.hidden = true;
    form.reset();
    nonceField.hidden = true;
    out.textContent = '';
    $('[data-pass-open]').hidden = false;
  }
  $('[data-pass-open]').addEventListener('click', () => openPassword());
  $('[data-pass-cancel]').addEventListener('click', closePassword);
  form.addEventListener('click', (e) => {
    const b = e.target.closest('[data-eye]');
    if (!b) return;
    const input = b.parentElement.querySelector('input');
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    b.textContent = show ? 'Ascunde' : 'Arată';
    b.setAttribute('aria-label', show ? 'Ascunde parola' : 'Arată parola');
  });
  form.addEventListener('input', (e) => {
    if (e.target.closest('.field.has-error')) fieldErr(e.target, '');
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = p1.value;
    const a = fieldErr(
      p1,
      !v
        ? 'Scrieți parola nouă.'
        : v.length < 8 || !/\p{L}/u.test(v) || !/\d/.test(v)
          ? 'Cel puțin 8 caractere, cu cel puțin o literă și o cifră.'
          : v !== v.trim()
            ? 'Parola nu poate începe sau se termina cu spațiu.'
            : '',
    );
    const b = fieldErr(p2, !p2.value ? 'Repetați parola nouă.' : p2.value !== v ? 'Parolele nu coincid.' : '');
    const c = nonceField.hidden || fieldErr(nonce, nonce.value.trim() ? '' : 'Scrieți codul primit pe e-mail.');
    if (!(a && b && c)) return form.querySelector('[aria-invalid="true"]')?.focus();
    const buttons = form.querySelectorAll('button');
    buttons.forEach((x) => (x.disabled = true));
    out.textContent = 'Se salvează…';
    try {
      const attrs = { password: v, data: { has_password: true } };
      if (!nonceField.hidden) attrs.nonce = nonce.value.trim();
      const { error } = await supabase.auth.updateUser(attrs);
      if (error?.code === 'reauthentication_needed') {
        // Secure password change: Supabase first sends a code to the account's e-mail.
        const { error: sendError } = await supabase.auth.reauthenticate();
        if (sendError) throw sendError;
        nonceField.hidden = false;
        out.textContent = `Pentru siguranță, v-am trimis un cod la ${user.email}. Introduceți-l mai sus.`;
        nonce.focus();
        return;
      }
      if (error) throw error;
      closePassword();
      newsOut.hidden = false;
      newsOut.textContent = 'Parola a fost schimbată.';
    } catch (err) {
      const texts = {
        same_password: 'Parola nouă trebuie să fie diferită de cea actuală.',
        weak_password: 'Parola este prea slabă. Alegeți una mai lungă.',
        reauthentication_not_valid: 'Codul nu este corect sau a expirat.',
        over_email_send_rate_limit: 'Prea multe încercări. Încercați din nou peste câteva minute.',
      };
      out.textContent = texts[err?.code] ?? 'Ceva nu a mers. Încercați din nou.';
    } finally {
      buttons.forEach((x) => (x.disabled = false));
    }
  });

  // ---- export -------------------------------------------------------------------
  $('[data-export]').addEventListener('click', () => {
    const data = {
      exported_at: new Date().toISOString(),
      account: {
        id: user.id,
        email: user.email,
        email_confirmed_at: user.email_confirmed_at ?? null,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at ?? null,
        user_metadata: user.user_metadata ?? {},
        identities: (user.identities ?? []).map((i) => ({
          provider: i.provider,
          email: i.identity_data?.email ?? null,
          created_at: i.created_at ?? null,
          last_sign_in_at: i.last_sign_in_at ?? null,
        })),
      },
      reports,
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `docvex-cont-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  });

  // ---- sign out ---------------------------------------------------------------------
  $('[data-signout]').addEventListener('click', () => {
    if (!supabase) return leave('/autentificare.html');
    supabase.auth
      .signOut()
      .catch(() => {})
      .then(() => leave('/autentificare.html'));
  });

  // ---- start ----------------------------------------------------------------------
  getSupabase()
    .then(async (client) => {
      supabase = client;
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        window.location.replace(authHref());
        return;
      }
      user = data.session.user;
      render();
      loadReports();
      loadUsage();
      supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) return leave('/autentificare.html');
        user = session.user;
        render();
        if (event === 'PASSWORD_RECOVERY') {
          tab('profil');
          openPassword('Alegeți parola nouă a contului.');
        }
      });
      // The password-reset link: straight to the new password.
      if (params.get('parola') === 'noua') {
        tab('profil');
        openPassword('Alegeți parola nouă a contului.');
        const url = new URL(window.location.href);
        url.searchParams.delete('parola');
        window.history.replaceState(null, '', url);
      }
      // Back from Stripe's portal or a tab link: /cont.html#abonament opens that section.
      const asked = window.location.hash.slice(1);
      if (asked && page.querySelector(`[data-panel="${CSS.escape(asked)}"]`)) tab(asked);
    })
    .catch(() => {
      $('[data-who]').textContent = 'Contul nu a putut fi încărcat. Reîncărcați pagina.';
    });
}
