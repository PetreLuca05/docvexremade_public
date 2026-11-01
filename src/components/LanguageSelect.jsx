import { useState } from 'react';
import { getSupabase } from '../auth.js';
import { useLang } from '../i18n.jsx';

const T = {
  ro: {
    title: 'Limba e-mailurilor',
    note: 'Limba e-mailurilor pe care ți le trimite DocVex: notificările despre dosare, răspunsurile la rapoarte și e-mailurile de autentificare. Aceeași setare ca în aplicație (Setări → Language).',
    names: { ro: 'Română', en: 'English' },
    saved: 'Salvat.',
    error: 'Nu am putut salva. Încearcă din nou.',
  },
  en: {
    title: 'Email language',
    note: 'The language of the emails DocVex sends you: case notifications, report replies and sign-in emails. The same setting as in the app (Settings → Language).',
    names: { ro: 'Română', en: 'English' },
    saved: 'Saved.',
    error: "Couldn't save. Try again.",
  },
};

// The account's email language, user_metadata.lang ('ro' or 'en', Romanian
// when not set); the server mirrors it to notify_prefs.lang. Saved as soon
// as it is chosen. (The site's own language is the header's switcher.)
export default function LanguageSelect({ user }) {
  const t = T[useLang().lang];
  const [lang, setLang] = useState(user.user_metadata?.lang === 'en' ? 'en' : 'ro');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState(null);

  async function change(next) {
    const before = lang;
    setLang(next);
    setBusy(true);
    setStatus(null);
    try {
      const supabase = await getSupabase();
      // user_metadata is merged key by key, so the other keys stay.
      const { error } = await supabase.auth.updateUser({ data: { lang: next } });
      if (error) throw error;
      setStatus({ text: t.saved });
    } catch (err) {
      setLang(before);
      setStatus({ text: err.message || t.error, error: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="account-section">
      <h2>{t.title}</h2>
      <p className="note">{t.note}</p>
      {['ro', 'en'].map((id) => (
        <label className="check" key={id}>
          <input
            type="radio"
            name="email-lang"
            value={id}
            checked={lang === id}
            disabled={busy}
            onChange={() => change(id)}
          />
          <span>{t.names[id]}</span>
        </label>
      ))}
      {status && (
        <p className={status.error ? 'auth-error' : 'note'} role="status">
          {status.text}
        </p>
      )}
    </section>
  );
}
