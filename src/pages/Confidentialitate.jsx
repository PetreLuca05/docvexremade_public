import Layout from '../components/Layout.jsx';
import { useLang, useMeta } from '../i18n.jsx';
import En from './en/Confidentialitate.jsx';
import Ro from './ro/Confidentialitate.jsx';

const META = {
  ro: {
    title: 'Politica de confidențialitate — DocVex',
    description:
      'Cum prelucrează DocVex datele cu caracter personal, conform Regulamentului (UE) 2016/679 (GDPR) și Legii nr. 190/2018.',
  },
  en: {
    title: 'Privacy policy — DocVex',
    description:
      'How DocVex processes personal data under Regulation (EU) 2016/679 (GDPR) and Law no. 190/2018.',
  },
};

export default function Confidentialitate() {
  const { lang } = useLang();
  useMeta(META);
  return (
    <Layout page="confidentialitate" mainClassName="wrap">
      {lang === 'en' ? <En /> : <Ro />}
    </Layout>
  );
}
