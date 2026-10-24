import Layout from '../components/Layout.jsx';
import { useLang, useMeta } from '../i18n.jsx';
import En from './en/Cookies.jsx';
import Ro from './ro/Cookies.jsx';

const META = {
  ro: {
    title: 'Politica de cookie-uri — DocVex',
    description:
      'Site-ul DocVex nu folosește cookie-uri; reține doar limba aleasă și, dacă te autentifici, sesiunea contului (Legea nr. 506/2004).',
  },
  en: {
    title: 'Cookie policy — DocVex',
    description:
      'The DocVex site uses no cookies; it only remembers your chosen language and, if you sign in, your account session (Law no. 506/2004).',
  },
};

export default function Cookies() {
  const { lang } = useLang();
  useMeta(META);
  return (
    <Layout page="cookies" mainClassName="wrap">
      {lang === 'en' ? <En /> : <Ro />}
    </Layout>
  );
}
