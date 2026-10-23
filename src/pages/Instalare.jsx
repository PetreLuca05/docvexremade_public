import releases from 'virtual:releases';
import Layout from '../components/Layout.jsx';
import { useLang, useMeta } from '../i18n.jsx';

const META = {
  ro: {
    title: 'Descarcă DocVex pentru Windows — DocVex',
    description:
      'Descarcă instalatorul DocVex pentru Windows, vezi pașii de instalare și notele fiecărei versiuni.',
  },
  en: {
    title: 'Download DocVex for Windows — DocVex',
    description:
      'Download the DocVex installer for Windows, see the installation steps and the notes for each version.',
  },
};

const T = {
  ro: {
    locale: 'ro-RO',
    title: 'Descarcă DocVex',
    lead: 'Aplicația desktop DocVex pentru Windows.',
    testing: 'Versiunile actuale sunt destinate testării interne, nu uzului public.',
    latest: 'Ultima versiune',
    prerelease: 'Versiune de test',
    download: (v) => `Descarcă DocVex ${v}`,
    published: 'Publicată',
    none: 'Nicio versiune nu este publicată încă. Revino curând.',
    stepsTitle: 'Instalare',
    steps: [
      <>
        Descarcă fișierul <code>docvex-…-setup.exe</code> cu butonul de mai sus.
      </>,
      'Deschide fișierul descărcat și urmează pașii instalatorului.',
      <>
        Dacă Windows afișează „Windows a protejat computerul”, alege <b>Mai multe informații</b>,
        apoi <b>Executați oricum</b>.
      </>,
      'Pornește DocVex din meniul Start. Versiunile noi se instalează apoi singure, la repornire.',
    ],
    historyTitle: 'Toate versiunile',
    file: 'Fișier',
    privacy: (
      <>
        Fișierul se descarcă direct de pe serverele GitHub, unde sunt publicate versiunile
        aplicației; vezi <a href="confidentialitate.html#github">politica de confidențialitate</a>.
      </>
    ),
  },
  en: {
    locale: 'en-GB',
    title: 'Download DocVex',
    lead: 'The DocVex desktop app for Windows.',
    testing: 'The current versions are meant for internal testing, not for public use.',
    latest: 'Latest version',
    prerelease: 'Pre-release',
    download: (v) => `Download DocVex ${v}`,
    published: 'Published',
    none: 'No version has been published yet. Check back soon.',
    stepsTitle: 'Installation',
    steps: [
      <>
        Download the <code>docvex-…-setup.exe</code> file with the button above.
      </>,
      'Open the downloaded file and follow the installer’s steps.',
      <>
        If Windows shows “Windows protected your PC”, choose <b>More info</b>, then{' '}
        <b>Run anyway</b>.
      </>,
      'Start DocVex from the Start menu. New versions then install themselves on restart.',
    ],
    historyTitle: 'All versions',
    file: 'File',
    privacy: (
      <>
        The file downloads directly from GitHub’s servers, where the app’s versions are
        published; see the <a href="confidentialitate.html#github">privacy policy</a>.
      </>
    ),
  },
};

function formatDate(iso, locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));
}

function formatSize(bytes, locale) {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024 ** 2)} MB`;
}

export default function Instalare() {
  const { lang } = useLang();
  const t = T[lang];
  useMeta(META);
  const [latest] = releases;

  return (
    <Layout page="instalare" mainClassName="wrap">
      <article className="doc install">
        <h1>{t.title}</h1>
        <p className="updated">{t.lead}</p>

        {latest ? (
          <section className="release-latest">
            <span className="eyebrow">
              {t.latest}
              {latest.prerelease && ` · ${t.prerelease}`}
            </span>
            <a className="btn is-gold" href={latest.url}>
              {t.download(latest.version)} <span aria-hidden="true">↓</span>
            </a>
            <p className="note">
              Windows · <code>{latest.file}</code> · {formatSize(latest.size, t.locale)} ·{' '}
              {t.published} {formatDate(latest.date, t.locale)}
            </p>
          </section>
        ) : (
          <div className="callout">{t.none}</div>
        )}

        <p className="note">{t.testing}</p>

        <h2 id="pasi">{t.stepsTitle}</h2>
        <ol className="steps">
          {t.steps.map((step, i) => (
            <li key={i}>{step}</li>
          ))}
        </ol>

        {releases.length > 0 && (
          <>
            <h2 id="versiuni">{t.historyTitle}</h2>
            <ul className="release-list">
              {releases.map((r) => (
                <li key={r.version}>
                  <div className="release-head">
                    <h3>
                      DocVex {r.version}
                      {r.prerelease && <span className="badge">{t.prerelease}</span>}
                    </h3>
                    <span>{formatDate(r.date, t.locale)}</span>
                  </div>
                  {/* Release notes as GitHub renders (and sanitises) them. */}
                  {r.notes && (
                    <div className="release-notes" dangerouslySetInnerHTML={{ __html: r.notes }} />
                  )}
                  <a href={r.url}>
                    {t.file}: {r.file} ({formatSize(r.size, t.locale)})
                  </a>
                </li>
              ))}
            </ul>
          </>
        )}

        <p className="note">{t.privacy}</p>
      </article>
    </Layout>
  );
}
