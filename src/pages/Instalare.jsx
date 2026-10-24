import { useEffect, useRef, useState } from 'react';
import releases from 'virtual:releases';
import Layout from '../components/Layout.jsx';
import HeroCarousel from '../components/HeroCarousel.jsx';
import ContinueButton from '../components/ContinueButton.jsx';
import { recordDownload, storedUser } from '../auth.js';
import { track } from '../analytics.js';
import { useLang, useMeta } from '../i18n.jsx';
import { OSES, OS_NAMES, useOS } from '../os.js';

const META = {
  ro: {
    title: 'Descarcă DocVex pentru Windows și macOS — DocVex',
    description:
      'Descarcă DocVex pentru Windows sau macOS, vezi pașii de instalare și notele fiecărei versiuni.',
  },
  en: {
    title: 'Download DocVex for Windows and macOS — DocVex',
    description:
      'Download DocVex for Windows or macOS, see the installation steps and the notes for each version.',
  },
};

const T = {
  ro: {
    locale: 'ro-RO',
    title: 'Descarcă DocVex',
    updateTitle: 'Actualizează DocVex',
    system: 'Sistemul de operare',
    latest: (os) => `Ultima versiune pentru ${OS_NAMES[os]}`,
    prerelease: 'Versiune de test',
    download: (v, os) => `Descarcă DocVex ${v} pentru ${OS_NAMES[os]}`,
    published: 'Publicată',
    arch: { universal: 'Universal', arm64: 'Apple silicon (M1 și mai noi)', x64: 'Intel' },
    otherArch: 'Alte variante:',
    whatsNew: 'Ce aduce',
    seeNotes: 'Toate noutățile',
    size: 'Dimensiune',
    soon: (os) => `DocVex pentru ${OS_NAMES[os]} vine în curând.`,
    none: (os) => `Nicio versiune pentru ${OS_NAMES[os]} nu este publicată încă. Revino curând.`,
    noneOther: (os) => `Vezi versiunea pentru ${OS_NAMES[os]}`,
    stepsTitle: (os) => `Instalare pe ${OS_NAMES[os]}`,
    howTo: (os) => `Cum instalezi pe ${OS_NAMES[os]}`,
    close: 'Închide',
    steps: {
      windows: [
        <>
          Descarcă fișierul <code>docvex-…-setup.exe</code> cu butonul de mai sus.
        </>,
        'Deschide fișierul descărcat și urmează pașii instalatorului.',
        <>
          Dacă Windows afișează „Windows a protejat computerul”, alege <b>Mai multe informații</b>,
          apoi <b>Executați oricum</b>.
        </>,
        'Pornește DocVex din meniul Start. Versiunile noi apar în fila Actualizări din aplicație.',
      ],
      mac: [
        <>
          Descarcă fișierul <code>docvex-….dmg</code> cu butonul de mai sus.
        </>,
        <>
          Deschide fișierul și trage <b>Docvex</b> în dosarul <b>Aplicații</b>.
        </>,
        <>
          La prima pornire, dacă macOS spune că aplicația nu poate fi verificată, deschide{' '}
          <b>Setări sistem → Confidențialitate și securitate</b> și alege <b>Deschide oricum</b>.
        </>,
        'Pornește DocVex din Launchpad sau din Aplicații. Versiunile noi apar în fila Actualizări din aplicație.',
      ],
    },
    historyTitle: (os) => `Toate versiunile pentru ${OS_NAMES[os]}`,
    forOs: (os) => `Pentru ${OS_NAMES[os]}`,
    noVersions: (os) => `Nicio versiune pentru ${OS_NAMES[os]} încă.`,
    latestOnly: 'Se poate descărca doar ultima versiune.',
    privacy: (
      <>
        Fișierul se descarcă direct de pe serverele GitHub, unde sunt publicate versiunile
        aplicației; vezi <a href="/confidentialitate.html#github">politica de confidențialitate</a>.
      </>
    ),
  },
  en: {
    locale: 'en-GB',
    title: 'Download DocVex',
    updateTitle: 'Update DocVex',
    system: 'Operating system',
    latest: (os) => `Latest version for ${OS_NAMES[os]}`,
    prerelease: 'Pre-release',
    download: (v, os) => `Download DocVex ${v} for ${OS_NAMES[os]}`,
    published: 'Published',
    arch: { universal: 'Universal', arm64: 'Apple silicon (M1 and later)', x64: 'Intel' },
    otherArch: 'Other builds:',
    whatsNew: 'What’s new',
    seeNotes: 'All release notes',
    size: 'Size',
    soon: (os) => `DocVex for ${OS_NAMES[os]} is coming soon.`,
    none: (os) => `No version for ${OS_NAMES[os]} has been published yet. Check back soon.`,
    noneOther: (os) => `See the version for ${OS_NAMES[os]}`,
    stepsTitle: (os) => `Installing on ${OS_NAMES[os]}`,
    howTo: (os) => `How to install on ${OS_NAMES[os]}`,
    close: 'Close',
    steps: {
      windows: [
        <>
          Download the <code>docvex-…-setup.exe</code> file with the button above.
        </>,
        'Open the downloaded file and follow the installer’s steps.',
        <>
          If Windows shows “Windows protected your PC”, choose <b>More info</b>, then{' '}
          <b>Run anyway</b>.
        </>,
        'Start DocVex from the Start menu. New versions show up in the app’s Updates tab.',
      ],
      mac: [
        <>
          Download the <code>docvex-….dmg</code> file with the button above.
        </>,
        <>
          Open it and drag <b>Docvex</b> into the <b>Applications</b> folder.
        </>,
        <>
          On first launch, if macOS says the app cannot be verified, open{' '}
          <b>System Settings → Privacy &amp; Security</b> and choose <b>Open Anyway</b>.
        </>,
        'Start DocVex from Launchpad or Applications. New versions show up in the app’s Updates tab.',
      ],
    },
    historyTitle: (os) => `All versions for ${OS_NAMES[os]}`,
    forOs: (os) => `For ${OS_NAMES[os]}`,
    noVersions: (os) => `No versions for ${OS_NAMES[os]} yet.`,
    latestOnly: 'Only the latest version can be downloaded.',
    privacy: (
      <>
        The file downloads directly from GitHub’s servers, where the app’s versions are published;
        see the <a href="/confidentialitate.html#github">privacy policy</a>.
      </>
    ),
  },
};

// A download: remembered on a signed-in account (the header's Update badge)
// and counted in Plausible.
function downloaded(file, version, location) {
  recordDownload(version);
  track('Download Click', {
    platform: /\.dmg$/i.test(file.file) ? 'mac' : 'windows',
    arch: file.arch ?? 'x64',
    version,
    location,
  });
}

function formatDate(iso, locale) {
  return new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(new Date(iso));
}

function formatSize(bytes, locale) {
  return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 1 }).format(bytes / 1024 ** 2)} MB`;
}

// A release's installers for one system: Windows has one, macOS one per
// processor (the preferred first).
const filesFor = (r, os) => (os === 'mac' ? r.mac : r.windows ? [r.windows] : []);
const other = (os) => (os === 'mac' ? 'windows' : 'mac');

function OsIcon({ os }) {
  return os === 'mac' ? (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M16.4 12.6c0-2.4 2-3.5 2-3.6-1.1-1.6-2.8-1.8-3.4-1.8-1.4-.1-2.8.9-3.5.9s-1.8-.9-3-.8a4.5 4.5 0 0 0-3.8 2.3c-1.6 2.8-.4 7 1.2 9.3.8 1.1 1.7 2.4 2.9 2.3 1.2 0 1.6-.7 3-.7s1.8.7 3 .7c1.3 0 2.1-1.1 2.8-2.3a10 10 0 0 0 1.3-2.6s-2.5-1-2.5-3.7ZM14.1 5.6c.6-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1 .1 2.1-.6 2.8-1.4Z" />
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 5.5 10 4.5v7H3v-6Zm0 13 7 1v-7H3v6Zm8 1.1 10 1.4v-8.5H11v7.1Zm0-15.2V11.5h10V3l-10 1.4Z" />
    </svg>
  );
}

function OsSwitch({ os, setOs, t }) {
  return (
    <div className="os-switch" role="radiogroup" aria-label={t.system}>
      {OSES.map((o) => (
        <button key={o} type="button" role="radio" aria-checked={o === os} onClick={() => setOs(o)}>
          <OsIcon os={o} />
          {OS_NAMES[o]}
        </button>
      ))}
    </div>
  );
}

// The release notes' opening paragraph and first bullet points, for the
// hero (GitHub's HTML, read as text).
function highlightsOf(notes, max = 6) {
  if (!notes || typeof DOMParser === 'undefined') return { summary: '', items: [] };
  const doc = new DOMParser().parseFromString(notes, 'text/html');
  const summary = doc.querySelector('p')?.textContent.trim() ?? '';
  const items = [...doc.querySelectorAll('ul > li')]
    .filter((li) => !li.parentElement.closest('li'))
    .map((li) => li.firstChild?.textContent?.trim() || li.textContent.trim())
    .filter(Boolean)
    .slice(0, max);
  return { summary, items };
}

// Opens a release's card in the list below and brings it into view.
function openRelease(version) {
  const card = document.getElementById(`v-${version}`);
  const details = card?.querySelector('details');
  if (details) details.open = true;
  card?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9.5" />
    <path d="M12 11v6M12 7.5v.5" />
  </svg>
);

// The page's hero, as on the home page (the photos, their veil and parallax,
// the header over it): the latest version for the system chosen with the
// switch, its download and the steps' i button; and what's new in it beside.
function DownloadHero({ release, os, setOs, onSteps, t, title }) {
  const alt = other(os);
  const hasAlt = releases.some((r) => filesFor(r, alt).length);
  const [main, ...rest] = release ? filesFor(release, os) : [];
  const { summary, items } = highlightsOf(release?.notes);
  // The installation steps, beside the main button.
  const info = (
    <button
      type="button"
      className="info-button"
      aria-label={t.howTo(os)}
      title={t.howTo(os)}
      aria-haspopup="dialog"
      onClick={onSteps}
    >
      <InfoIcon />
    </button>
  );

  return (
    <section className="hero is-dark download-hero">
      <HeroCarousel />
      <div className="wrap download-main">
        <div className="download-copy">
          {release ? (
            <>
              <span className="eyebrow">
                {title} · {t.latest(os)}
                {release.prerelease && ` · ${t.prerelease}`}
              </span>
              <h1>
                DocVex <span className="download-version">{release.version}</span>
              </h1>
              {summary && <p className="download-summary">{summary}</p>}
              <ul className="download-chips">
                <li>
                  {t.published} {formatDate(release.date, t.locale)}
                </li>
                <li>{formatSize(main.size, t.locale)}</li>
                {main.arch && <li>{t.arch[main.arch]}</li>}
              </ul>
              <OsSwitch os={os} setOs={setOs} t={t} />
              <div className="actions">
                <ContinueButton
                  href={main.url}
                  onClick={() => downloaded(main, release.version, 'hero')}
                >
                  {t.download(release.version, os)}
                </ContinueButton>
                {info}
              </div>
              {/* Other builds for this system (Apple silicon / Intel), when there are. */}
              {rest.length > 0 && (
                <p className="download-file">
                  {t.otherArch}{' '}
                  {rest.map((f, i) => (
                    <span key={f.file}>
                      {i > 0 && ' · '}
                      <a href={f.url} onClick={() => downloaded(f, release.version, 'hero-other')}>
                        {f.arch ? t.arch[f.arch] : f.file}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </>
          ) : (
            <>
              <span className="eyebrow">{title}</span>
              <h1>{t.soon(os)}</h1>
              <p className="download-summary">{t.none(os)}</p>
              <OsSwitch os={os} setOs={setOs} t={t} />
              <div className="actions">
                {hasAlt && (
                  <button type="button" className="btn is-outline" onClick={() => setOs(alt)}>
                    {t.noneOther(alt)}
                  </button>
                )}
                {info}
              </div>
            </>
          )}
        </div>

        {items.length > 0 && (
          <aside className="download-news" aria-labelledby="noutati">
            <div className="download-news-head">
              <h2 id="noutati">
                {t.whatsNew} <span>{release.version}</span>
              </h2>
              <button
                type="button"
                className="link-button"
                onClick={() => openRelease(release.version)}
              >
                {t.seeNotes}
              </button>
            </div>
            <ol>
              {items.map((item, i) => (
                <li key={item}>
                  <span className="download-news-num" aria-hidden="true">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <p>{item}</p>
                </li>
              ))}
            </ol>
          </aside>
        )}
      </div>
    </section>
  );
}

// The installation steps for the chosen system, full screen (the i button
// beside the system switch). Escape, the backdrop or Close shut it; focus
// starts on Close and goes back to the button.
function StepsDialog({ os, t, onClose }) {
  const close = useRef(null);
  useEffect(() => {
    const before = document.activeElement;
    close.current?.focus();
    document.body.classList.add('has-modal');
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.classList.remove('has-modal');
      before?.focus?.();
    };
  }, [onClose]);
  return (
    <div className="modal" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className="modal-box is-steps"
        role="dialog"
        aria-modal="true"
        aria-labelledby="steps-title"
      >
        <button type="button" className="modal-close" aria-label={t.close} onClick={onClose}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        <span className="modal-icon is-info" aria-hidden="true">
          <OsIcon os={os} />
        </span>
        <h2 id="steps-title">{t.stepsTitle(os)}</h2>
        <ol className="steps-list">
          {t.steps[os].map((step, i) => (
            <li key={i}>
              <span className="steps-num" aria-hidden="true">
                {i + 1}
              </span>
              <span>{step}</span>
            </li>
          ))}
        </ol>
        <button ref={close} type="button" className="btn is-outline" onClick={onClose}>
          {t.close}
        </button>
      </div>
    </div>
  );
}

function FileLinks({ files, version, t }) {
  return files.map((f) => (
    <a key={f.file} href={f.url} onClick={() => downloaded(f, version, 'history')}>
      {f.file} ({formatSize(f.size, t.locale)}
      {f.arch && `, ${t.arch[f.arch]}`})
    </a>
  ));
}

export default function Instalare() {
  const { lang } = useLang();
  const t = T[lang];
  useMeta(META);
  const [os, setOs] = useOS();
  const [steps, setSteps] = useState(false);
  const latest = releases.find((r) => filesFor(r, os).length);
  // Only the releases with an installer for the chosen system.
  const forOs = releases.filter((r) => filesFor(r, os).length);

  return (
    <Layout page="instalare" overlay>
      <DownloadHero
        release={latest}
        os={os}
        setOs={setOs}
        onSteps={() => setSteps(true)}
        t={t}
        title={storedUser() ? t.updateTitle : t.title}
      />
      {steps && <StepsDialog os={os} t={t} onClose={() => setSteps(false)} />}

      {/* The versions: white, like the sections under the home page's hero. */}
      <section className="section install-versions">
        <div className="wrap">
          <article className="doc install">
            {/* The versions for the system chosen above, each with its files. */}
            <h2 id="versiuni">{t.historyTitle(os)}</h2>
            {forOs.length ? (
              <ul className="release-list">
                {forOs.map((r, index) => (
                  <li key={r.version} id={`v-${r.version}`} className="release-card">
                    {/* Closed by default: the version and date; opened, its notes
                    and files. */}
                    <details>
                      <summary className="release-head">
                        <h3>
                          DocVex {r.version}
                          {r.prerelease && <span className="badge">{t.prerelease}</span>}
                        </h3>
                        <span>{formatDate(r.date, t.locale)}</span>
                        <svg className="release-chevron" viewBox="0 0 16 16" aria-hidden="true">
                          <path d="M4 6l4 4 4-4" />
                        </svg>
                      </summary>
                      <div className="release-body">
                        {/* Release notes as GitHub renders (and sanitises) them. */}
                        {r.notes && (
                          <div
                            className="release-notes"
                            dangerouslySetInnerHTML={{ __html: r.notes }}
                          />
                        )}
                        {/* Only the latest version can be downloaded. */}
                        {index === 0 ? (
                          <div className="release-files">
                            <div>
                              <b>{t.forOs(os)}</b>
                              <FileLinks files={filesFor(r, os)} version={r.version} t={t} />
                            </div>
                          </div>
                        ) : (
                          <p className="note release-old">{t.latestOnly}</p>
                        )}
                      </div>
                    </details>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="note">{t.noVersions(os)}</p>
            )}

            <p className="note">{t.privacy}</p>
          </article>
        </div>
      </section>
    </Layout>
  );
}
