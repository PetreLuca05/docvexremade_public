import Layout from '../components/Layout.jsx';
import { useMeta } from '../i18n.jsx';
import Content from './ro/Cookies.jsx';

const META = {
  title: 'Politica de cookie-uri — DocVex',
  description:
    'Site-ul DocVex nu folosește cookie-uri: numără vizitele fără cookie-uri (Plausible) și reține doar sesiunea contului, dacă te autentifici (Legea nr. 506/2004).',
};

export default function Cookies() {
  useMeta(META);
  return (
    <Layout page="cookies" mainClassName="wrap">
      <Content />
    </Layout>
  );
}
