import Layout from '../components/Layout.jsx';
import Plans from '../components/Plans.jsx';
import { useLang, useMeta } from '../i18n.jsx';

const META = {
  ro: {
    title: 'Prețuri — DocVex',
    description:
      'Planurile DocVex pentru avocați, juriști și cabinete. Creează-ți contul și începe.',
  },
  en: {
    title: 'Pricing — DocVex',
    description:
      'DocVex plans for lawyers, legal professionals and firms. Create your account and get started.',
  },
};

const T = {
  ro: {
    eyebrow: 'Prețuri',
    title: 'Un plan pentru fiecare cabinet.',
    lead: 'Toate planurile includ aplicația desktop pentru Windows și macOS și actualizările ei.',
  },
  en: {
    eyebrow: 'Pricing',
    title: 'A plan for every firm.',
    lead: 'Every plan includes the desktop app for Windows and macOS, and its updates.',
  },
};

// The plans; each leads to the sign-up page with the plan picked.
export default function Preturi() {
  const { lang } = useLang();
  const t = T[lang];
  useMeta(META);

  return (
    <Layout page="preturi" mainClassName="pricing">
      <section className="wrap pricing-head">
        <span className="eyebrow">{t.eyebrow}</span>
        <h1 className="display">{t.title}</h1>
        <p>{t.lead}</p>
        <Plans href={(id) => `/autentificare.html?plan=${id}`} />
      </section>
    </Layout>
  );
}
