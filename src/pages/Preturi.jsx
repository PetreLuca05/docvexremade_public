import Layout from '../components/Layout.jsx';
import Plans from '../components/Plans.jsx';
import { authHref } from '../auth.js';
import { useMeta } from '../i18n.jsx';

const META = {
  title: 'Prețuri — DocVex',
  description:
    'Planurile DocVex pentru avocați, juriști și cabinete. Creează-ți contul și începe.',
};

const T = {
  eyebrow: 'Prețuri',
  title: 'Un plan pentru fiecare cabinet.',
  lead: 'Toate planurile includ aplicația desktop pentru Windows și macOS și actualizările ei.',
};

// The plans; each leads to the sign-up page with the plan picked.
export default function Preturi() {
  const t = T;
  useMeta(META);

  return (
    <Layout page="preturi" mainClassName="pricing">
      <section className="wrap pricing-head">
        <span className="eyebrow">{t.eyebrow}</span>
        <h1 className="display">{t.title}</h1>
        <p>{t.lead}</p>
        <Plans href={(id) => authHref({ plan: id })} />
      </section>
    </Layout>
  );
}
