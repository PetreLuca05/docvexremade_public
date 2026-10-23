import Layout from '../components/Layout.jsx';
import { useLang, useMeta } from '../i18n.jsx';
import En from './en/InformatiiLegale.jsx';
import Ro from './ro/InformatiiLegale.jsx';

const META = {
  ro: {
    title: 'Informații legale — DocVex',
    description:
      'Datele de identificare ale operatorului DocVex, autoritățile competente, soluționarea litigiilor, transparența AI, accesibilitate, securitate și cadrul legal aplicabil.',
  },
  en: {
    title: 'Legal information — DocVex',
    description:
      'DocVex operator identification, competent authorities, dispute resolution, AI transparency, accessibility, security and the applicable legal framework.',
  },
};

export default function InformatiiLegale() {
  const { lang } = useLang();
  useMeta(META);
  return (
    <Layout page="informatii-legale" mainClassName="wrap">
      {lang === 'en' ? <En /> : <Ro />}
    </Layout>
  );
}
