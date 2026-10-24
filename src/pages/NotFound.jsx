import BackButton from '../components/BackButton.jsx';
import Layout from '../components/Layout.jsx';
import { useEffect } from 'react';
import { useLang, useMeta } from '../i18n.jsx';
import { track } from '../analytics.js';

const META = {
  ro: { title: 'Pagina nu există — DocVex', description: '' },
  en: { title: 'Page not found — DocVex', description: '' },
};

const T = {
  ro: { title: 'Pagina nu există', code: 'Eroare 404', back: 'Înapoi la pagina principală' },
  en: { title: 'Page not found', code: 'Error 404', back: 'Back to the home page' },
};

// The page's content, also shown by the admin dashboard to anyone who is not
// an admin (so it does not advertise what it is).
export function NotFoundContent() {
  const { lang } = useLang();
  const t = T[lang];
  return (
    <article className="doc">
      <h1>{t.title}</h1>
      <p className="updated">{t.code}</p>
      <BackButton href="/">{t.back}</BackButton>
    </article>
  );
}

export default function NotFound() {
  useMeta(META);
  useEffect(() => track('404', { path: window.location.pathname }), []);
  return (
    <Layout page="404" mainClassName="wrap">
      <NotFoundContent />
    </Layout>
  );
}
