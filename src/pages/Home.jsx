import HeroCarousel from '../components/HeroCarousel.jsx';
import Layout from '../components/Layout.jsx';
import { useLang, useMeta } from '../i18n.jsx';
import { CLIENT_OS, OS_NAMES } from '../os.js';
import { authHref, storedUser } from '../auth.js';
import AskDocvex from '../components/AskDocvex.jsx';
import ContinueButton from '../components/ContinueButton.jsx';

// The visitor's system, or both when it is neither (Linux, a phone).
const SYSTEM = OS_NAMES[CLIENT_OS];

export const META = {
  ro: {
    title: 'DocVex — documente juridice, organizate',
    description:
      'DocVex: aplicație desktop pentru avocați și juriști din România. Proiecte, documente, legislație, CAEN și cercetare juridică asistată de AI.',
  },
  en: {
    title: 'DocVex — legal documents, organised',
    description:
      'DocVex: a desktop app for lawyers and legal professionals in Romania. Projects, documents, legislation, CAEN codes and AI-assisted legal research.',
  },
};

// The mock-ups in the module frames show Romanian documents and a Romanian
// question on purpose (that is what the app works with), so they are not
// translated.
const T = {
  ro: {
    eyebrow: `Testare internă · ${SYSTEM ?? 'Windows și macOS'}`,
    title: ['Fiecare dosar.', 'Un singur loc.'],
    lead: 'Aplicație desktop pentru avocați și juriști din România: proiecte cu fișierele lor, previzualizare pentru Word, PDF, Excel și WhatsApp, trimiteri la legislație și coduri CAEN recunoscute, cercetare juridică în surse oficiale.',
    download: SYSTEM ? `Descarcă pentru ${SYSTEM}` : 'Descarcă aplicația',
    discover: 'Descoperă modulele',
    modulesLabel: 'Module',
    tiles: ['Proiecte', 'Legislație și CAEN', 'Cercetare juridică'],
    perks: [
      ['Fișiere locale', 'Proiectele rămân dosare pe discul tău.'],
      ['Previzualizare', 'Word, PDF, Excel, audio, video, WhatsApp.'],
      ['Legislație', 'Legi, OUG, HG, coduri, decizii CCR/ICCJ.'],
      ['Scanare', 'Fotografii îndreptate, salvate ca PDF.'],
      ['Actualizări', 'Instalate automat la repornire.'],
    ],
    folder: 'Dosar',
    aboutEyebrow: 'Despre',
    aboutTitle: 'Un instrument unic, construit în jurul dosarului.',
    about: [
      'Documentele unui caz ajung din toate părțile: e-mail, WhatsApp, scanări, portalul instanțelor. DocVex le adună într-un proiect care este, de fapt, un dosar obișnuit pe computerul tău. Aplicația doar le organizează și le afișează.',
      'Peste ele adaugă ce lipsea: trimiterile la acte normative devin vizibile, codurile CAEN sunt explicate, iar întrebările juridice primesc răspunsuri care își citează sursele.',
    ],
    aboutLink: 'Cum tratăm datele tale →',
    modulesTitle: 'Trei module, un singur flux.',
    projects: {
      title: 'Proiecte',
      text: 'Fiecare proiect este un dosar pe disc. Deschizi orice fișier direct în aplicație, fără să pornești alte programe.',
      specs: [
        ['Stocare', 'Local, pe computerul tău'],
        ['Formate', 'Word · PDF · Excel · imagini'],
        ['Media', 'Audio · video'],
        ['Conversații', 'Exporturi WhatsApp'],
        ['Scanare', 'Foto → PDF îndreptat'],
      ],
    },
    law: {
      title: 'Legislație și CAEN',
      text: 'Trimiterile la acte normative și codurile CAEN sunt evidențiate direct în document, ca să ajungi la sursă dintr-un clic.',
      specs: [
        ['Acte', 'Legi · OUG · HG · coduri'],
        ['Jurisprudență', 'Decizii CCR și ICCJ'],
        ['CAEN', 'Coduri recunoscute și explicate'],
        ['Unde', 'În documentul deschis'],
      ],
    },
    research: {
      title: 'Cercetare juridică',
      text: 'Întrebi în limba română și primești un răspuns care citează sursele oficiale din care provine.',
      specs: [
        ['Limbă', 'Română'],
        ['Legislație', 'legislatie.just.ro · EUR-Lex'],
        ['Instanțe', 'portal.just.ro'],
        ['Firme, avocați', 'ANAF · UNBR'],
        ['Trimitere', 'Doar la cererea ta'],
      ],
      aiNote:
        'Răspunsurile sunt generate de un sistem de inteligență artificială (Claude, Anthropic), pot conține erori și nu țin loc de consultanță juridică.',
      aiLink: 'Transparență AI',
    },
    casesEyebrow: 'În practică',
    casesTitle: 'Cum arată o zi de lucru.',
    cases: [
      [
        'Dimineața',
        'Clientul trimite pe WhatsApp poze cu un proces-verbal. Le scanezi ca PDF și le pui în proiectul cazului, lângă conversația exportată.',
      ],
      [
        'La redactare',
        'Deschizi întâmpinarea în DocVex. Fiecare articol de lege citat este evidențiat, iar codul CAEN al societății apare explicat.',
      ],
      [
        'Înainte de termen',
        'Verifici un termen procedural cu o întrebare în română și primești răspunsul împreună cu actul normativ din care provine.',
      ],
      [
        'Seara',
        'Închizi aplicația. Fișierele rămân în dosarele tale, iar versiunea nouă, dacă există, se instalează la următoarea pornire.',
      ],
    ],
    faqTitle: 'Detaliile tehnice, explicate simplu.',
    faq: [
      [
        'Unde sunt păstrate documentele mele?',
        'Pe computerul tău. Un proiect DocVex este un dosar obișnuit pe disc, iar aplicația nu încarcă documentele pe un server propriu.',
      ],
      [
        'Când pleacă date de pe computer?',
        <>
          Doar când folosești o funcție care are nevoie de un serviciu extern: cercetarea juridică
          cu AI trimite întrebarea și ce alegi să atașezi, iar căutările trimit termenii căutați
          către sursele publice. Detaliile sunt în{' '}
          <a href="confidentialitate.html#aplicatie">politica de confidențialitate</a>.
        </>,
      ],
      [
        'Ce surse folosește cercetarea juridică?',
        'legislatie.just.ro, EUR-Lex, portal.just.ro, ANAF și UNBR.',
      ],
      [
        'Pe ce sisteme funcționează?',
        <>
          Pe Windows și macOS. Instalatorul (<code>docvex-…-setup.exe</code> pentru Windows,{' '}
          <code>docvex-….dmg</code> pentru macOS) este pe{' '}
          <a href="instalare.html">pagina de descărcare</a>.
        </>,
      ],
      [
        'Cum primesc versiunile noi?',
        'Aplicația verifică singură dacă există o versiune nouă și o instalează la repornire.',
      ],
      [
        'Respectă DocVex GDPR și legislația UE?',
        <>
          Prelucrăm datele potrivit GDPR și Legii nr. 190/2018, site-ul nu folosește cookie-uri, iar
          funcțiile AI sunt semnalate potrivit Regulamentului (UE) 2024/1689. Vezi{' '}
          <a href="confidentialitate.html">Politica de confidențialitate</a> și{' '}
          <a href="informatii-legale.html#cadru">cadrul legal aplicabil</a>.
        </>,
      ],
      [
        'Pot folosi DocVex acum?',
        'Versiunile actuale sunt destinate testării interne, nu uzului public.',
      ],
    ],
    ctaEyebrow: 'Începe',
    ctaTitle: 'Găsește-ți dosarele, mai repede.',
    ctaText:
      'Creează-ți contul DocVex în câteva minute, alege planul potrivit și descarcă aplicația. Același cont te autentifică pe site și în aplicație.',
    ctaStart: 'Creează cont',
    ctaPricing: 'Vezi planurile',
    ctaSignedIn: 'Mergi la contul tău',
    ctaNote: 'Versiunile actuale sunt destinate testării interne.',
  },
  en: {
    eyebrow: `Internal testing · ${SYSTEM ?? 'Windows and macOS'}`,
    title: ['Every case file.', 'One place.'],
    lead: 'A desktop app for lawyers and legal professionals in Romania: projects with their files, previews for Word, PDF, Excel and WhatsApp, recognised references to legislation and CAEN codes, and legal research in official sources.',
    download: SYSTEM ? `Download for ${SYSTEM}` : 'Download the app',
    discover: 'Explore the modules',
    modulesLabel: 'Modules',
    tiles: ['Projects', 'Legislation and CAEN', 'Legal research'],
    perks: [
      ['Local files', 'Projects stay as folders on your disk.'],
      ['Preview', 'Word, PDF, Excel, audio, video, WhatsApp.'],
      ['Legislation', 'Laws, emergency and government ordinances, codes, CCR/ICCJ decisions.'],
      ['Scanning', 'Photos straightened and saved as PDF.'],
      ['Updates', 'Installed automatically on restart.'],
    ],
    folder: 'Case',
    aboutEyebrow: 'About',
    aboutTitle: 'One tool, built around the case file.',
    about: [
      'The documents of a case arrive from everywhere: e-mail, WhatsApp, scans, the courts portal. DocVex gathers them in a project that is simply an ordinary folder on your computer. The app only organises and displays them.',
      'On top, it adds what was missing: references to legislation become visible, CAEN codes are explained, and legal questions get answers that cite their sources.',
    ],
    aboutLink: 'How we handle your data →',
    modulesTitle: 'Three modules, one flow.',
    projects: {
      title: 'Projects',
      text: 'Each project is a folder on disk. You open any file right in the app, without starting other programs.',
      specs: [
        ['Storage', 'Local, on your computer'],
        ['Formats', 'Word · PDF · Excel · images'],
        ['Media', 'Audio · video'],
        ['Conversations', 'WhatsApp exports'],
        ['Scanning', 'Photo → straightened PDF'],
      ],
    },
    law: {
      title: 'Legislation and CAEN',
      text: 'References to legislation and CAEN codes are highlighted right in the document, so the source is one click away.',
      specs: [
        ['Acts', 'Laws · ordinances · codes'],
        ['Case law', 'CCR and ICCJ decisions'],
        ['CAEN', 'Codes recognised and explained'],
        ['Where', 'In the open document'],
      ],
    },
    research: {
      title: 'Legal research',
      text: 'You ask in Romanian and get an answer that cites the official sources it comes from.',
      specs: [
        ['Language', 'Romanian'],
        ['Legislation', 'legislatie.just.ro · EUR-Lex'],
        ['Courts', 'portal.just.ro'],
        ['Companies, lawyers', 'ANAF · UNBR'],
        ['Sent', 'Only when you ask'],
      ],
      aiNote:
        'Answers are generated by an artificial intelligence system (Claude, Anthropic), may contain errors and are no substitute for legal advice.',
      aiLink: 'AI transparency',
    },
    casesEyebrow: 'In practice',
    casesTitle: 'What a working day looks like.',
    cases: [
      [
        'Morning',
        'A client sends photos of an official report over WhatsApp. You scan them to PDF and put them in the case project, next to the exported conversation.',
      ],
      [
        'Drafting',
        'You open the statement of defence in DocVex. Every cited article of law is highlighted, and the company’s CAEN code is explained.',
      ],
      [
        'Before a deadline',
        'You check a procedural deadline with a question in Romanian and get the answer together with the legal act it comes from.',
      ],
      [
        'Evening',
        'You close the app. Your files stay in your folders, and a new version, if there is one, installs at the next start.',
      ],
    ],
    faqTitle: 'The technical details, explained simply.',
    faq: [
      [
        'Where are my documents kept?',
        'On your computer. A DocVex project is an ordinary folder on disk, and the app does not upload documents to a server of its own.',
      ],
      [
        'When does data leave my computer?',
        <>
          Only when you use a feature that needs an external service: AI legal research sends your
          question and whatever you choose to attach, and searches send the search terms to the
          public sources. The details are in the{' '}
          <a href="confidentialitate.html#aplicatie">privacy policy</a>.
        </>,
      ],
      [
        'What sources does legal research use?',
        'legislatie.just.ro, EUR-Lex, portal.just.ro, ANAF and UNBR.',
      ],
      [
        'Which systems does it run on?',
        <>
          Windows and macOS. The installer (<code>docvex-…-setup.exe</code> for Windows,{' '}
          <code>docvex-….dmg</code> for macOS) is on the <a href="instalare.html">download page</a>.
        </>,
      ],
      [
        'How do I get new versions?',
        'The app checks for a new version by itself and installs it on restart.',
      ],
      [
        'Does DocVex comply with the GDPR and EU law?',
        <>
          We process data under the GDPR and Law no. 190/2018, the site uses no cookies, and AI
          features are disclosed under Regulation (EU) 2024/1689. See the{' '}
          <a href="confidentialitate.html">Privacy policy</a> and the{' '}
          <a href="informatii-legale.html#cadru">applicable legal framework</a>.
        </>,
      ],
      [
        'Can I use DocVex now?',
        'The current versions are meant for internal testing, not for public use.',
      ],
    ],
    ctaEyebrow: 'Get started',
    ctaTitle: 'Find your case files, faster.',
    ctaText:
      'Create your DocVex account in a few minutes, choose the plan that fits and download the app. The same account signs you in on the site and in the app.',
    ctaStart: 'Create account',
    ctaPricing: 'See the plans',
    ctaSignedIn: 'Go to your account',
    ctaNote: 'The current versions are meant for internal testing.',
  },
};

const TILES = [
  ['proiecte', 'is-files'],
  ['legislatie', 'is-law'],
  ['cercetare', 'is-chat'],
];

const PERK_ICONS = [
  'M3 7h6l2 2h10v10H3z',
  'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h5',
  'M12 3v18M5 7h14M5 7l-3 7h6zM19 7l-3 7h6z',
  'M4 7V4h3M17 4h3v3M20 17v3h-3M7 20H4v-3M8 9h8v6H8z',
  'M20 12a8 8 0 1 1-2.3-5.6M20 4v5h-5',
];

function Specs({ items }) {
  return (
    <dl className="specs">
      {items.map(([term, value]) => (
        <div key={term}>
          <dt>{term}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function Home() {
  const { lang } = useLang();
  const t = T[lang];
  useMeta(META);
  const signedIn = Boolean(storedUser());

  return (
    <Layout page="index" overlay>
      {/* ---- Hero ---------------------------------------------------- */}

      <section className="hero is-dark">
        <HeroCarousel />
        {/* Copy and module tiles side by side (stacked on narrow screens),
            the feature strip below: together they fit one screen. */}
        <div className="wrap hero-main">
          <div className="hero-copy">
            <span className="eyebrow">{t.eyebrow}</span>
            <h1>
              {t.title[0]}
              <br />
              {t.title[1]}
            </h1>
            <p>{t.lead}</p>
            <div className="actions">
              <a className="btn is-outline" href="instalare.html">
                {t.download} <span aria-hidden="true">→</span>
              </a>
              <a className="btn is-ghost" href="#module">
                {t.discover}
              </a>
            </div>
          </div>
          <ul className="tiles" aria-label={t.modulesLabel}>
            {TILES.map(([id, art], i) => (
              <li key={id}>
                <a href={`#${id}`}>
                  <span className={`tile-art ${art}`} aria-hidden="true"></span>
                  <span>{t.tiles[i]}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div className="wrap">
          <ul className="perks" id="functii">
            {t.perks.map(([title, text], i) => (
              <li key={PERK_ICONS[i]}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d={PERK_ICONS[i]} />
                </svg>
                <div>
                  <b>{title}</b>
                  <span>{text}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---- Concept ------------------------------------------------- */}

      <section className="section is-light">
        <div className="wrap split">
          <div className="frame" aria-hidden="true">
            <div className="desk">
              <div className="paper p1"></div>
              <div className="paper p2"></div>
              <div className="paper p3"></div>
              <div className="folder">
                <span>{t.folder}</span>
              </div>
            </div>
          </div>
          <div>
            <span className="eyebrow">{t.aboutEyebrow}</span>
            <h2>{t.aboutTitle}</h2>
            {t.about.map((p) => (
              <p key={p}>{p}</p>
            ))}
            <a className="link-more" href="confidentialitate.html#aplicatie">
              {t.aboutLink}
            </a>
          </div>
        </div>
      </section>

      {/* ---- Modules ------------------------------------------------- */}

      <section className="section is-light modules" id="module">
        <div className="wrap">
          <h2 className="display">{t.modulesTitle}</h2>
          <article className="module" id="proiecte">
            <div className="frame" aria-hidden="true">
              <div className="mini-app">
                <div className="mini-list">
                  <span className="t-doc">Întâmpinare.docx</span>{' '}
                  <span className="t-pdf is-on">Decizie impunere.pdf</span>{' '}
                  <span className="t-xls">Calcul penalități.xlsx</span>{' '}
                  <span className="t-chat">Conversație client.zip</span>{' '}
                  <span className="t-img">Scan proces-verbal.pdf</span>
                </div>
                <div className="mini-preview">
                  <div className="ln w60 dark"></div>
                  <div className="ln w90"></div>
                  <div className="ln w85"></div>
                  <div className="ln w70"></div>
                  <div className="ln w90"></div>
                  <div className="ln w50"></div>
                  <div className="stamp">PDF</div>
                </div>
              </div>
            </div>
            <div className="module-copy">
              <h3>{t.projects.title}</h3>
              <p>{t.projects.text}</p>
              <Specs items={t.projects.specs} />
            </div>
          </article>
          <article className="module is-flip" id="legislatie">
            <div className="frame" aria-hidden="true">
              <div className="mini-doc">
                <p>
                  Prin <mark>OUG nr. 195/2002</mark>, coroborat cu <mark>art. 1.357 C. civ.</mark>,
                  și având în vedere <mark>Decizia CCR nr. 33/2018</mark> …
                </p>
                <div className="pop">
                  <b>Legea nr. 207/2015</b> <span>Codul de procedură fiscală</span>{' '}
                  <em>legislatie.just.ro</em>
                </div>
                <p>
                  Societatea desfășoară activități <mark className="is-caen">CAEN 4711</mark>.
                </p>
              </div>
            </div>
            <div className="module-copy">
              <h3>{t.law.title}</h3>
              <p>{t.law.text}</p>
              <Specs items={t.law.specs} />
            </div>
          </article>
          <article className="module" id="cercetare">
            <div className="frame" aria-hidden="true">
              <div className="mini-chat">
                <div className="q">
                  Care este termenul de contestare a unei decizii de impunere?
                </div>
                <div className="a">
                  <div className="ln w90"></div>
                  <div className="ln w80"></div>
                  <div className="ln w60"></div>
                  <div className="cites">
                    <span>legislatie.just.ro</span>
                    <span>ANAF</span>
                    <span>portal.just.ro</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="module-copy">
              <h3>{t.research.title}</h3>
              <p>{t.research.text}</p>
              <Specs items={t.research.specs} />
              <p className="ai-note">
                {t.research.aiNote} <a href="informatii-legale.html#ai">{t.research.aiLink}</a>
              </p>
            </div>
          </article>
        </div>
      </section>

      {/* ---- Use cases ----------------------------------------------- */}

      <section className="section is-light">
        <div className="wrap">
          <span className="eyebrow">{t.casesEyebrow}</span>
          <h2 className="display">{t.casesTitle}</h2>
          <div className="cases">
            {t.cases.map(([tag, text]) => (
              <article key={tag}>
                <span className="case-tag">{tag}</span>
                <p>{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ---- FAQ ----------------------------------------------------- */}

      <section className="section is-light" id="intrebari">
        <div className="wrap faq">
          <h2 className="display">{t.faqTitle}</h2>
          <div className="faq-list">
            {t.faq.map(([question, answer]) => (
              <details key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
          {/* Under the last question: ask the assistant; as a chat it spans
              the whole section. */}
          <AskDocvex />
        </div>
      </section>

      {/* ---- Get started --------------------------------------------- */}

      <section className="section is-light cta" id="incepe">
        <div className="wrap">
          <span className="eyebrow">{t.ctaEyebrow}</span>
          <h2 className="display">{t.ctaTitle}</h2>
          <p>{t.ctaText}</p>
          <div className="actions is-center">
            {signedIn ? (
              <ContinueButton href="/cont.html">{t.ctaSignedIn}</ContinueButton>
            ) : (
              <>
                <ContinueButton href={authHref()}>{t.ctaStart}</ContinueButton>
                <ContinueButton href="/preturi.html" outline>
                  {t.ctaPricing}
                </ContinueButton>
              </>
            )}
          </div>
          <p className="note">{t.ctaNote}</p>
        </div>
      </section>
    </Layout>
  );
}
