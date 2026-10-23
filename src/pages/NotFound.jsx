import { useLang, useMeta } from '../i18n.jsx';

const META = {
  ro: { title: 'Pagina nu există — DocVex', description: '' },
  en: { title: 'Page not found — DocVex', description: '' },
};

const T = {
  ro: { title: 'Pagina nu există', code: 'Eroare 404', back: 'Înapoi la pagina principală' },
  en: { title: 'Page not found', code: 'Error 404', back: 'Back to the home page' },
};

export default function NotFound() {
  const { lang } = useLang();
  const t = T[lang];
  useMeta(META);
  return (
    <main className="wrap">
      <article className="doc">
        <h1>{t.title}</h1>
        <p className="updated">{t.code}</p>
        <p>
          <a href="/">{t.back}</a>
        </p>
      </article>
    </main>
  );
}
