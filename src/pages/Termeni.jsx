import Layout from '../components/Layout.jsx';
import { useLang, useMeta } from '../i18n.jsx';
import En from './en/Termeni.jsx';
import Ro from './ro/Termeni.jsx';

const META = {
  ro: {
    title: 'Termeni și condiții — DocVex',
    description: 'Termenii de utilizare a site-ului și a aplicației DocVex.',
  },
  en: {
    title: 'Terms and conditions — DocVex',
    description: 'The terms of use of the DocVex site and app.',
  },
};

export default function Termeni() {
  const { lang } = useLang();
  useMeta(META);
  return (
    <Layout page="termeni" mainClassName="wrap">
      {lang === 'en' ? <En /> : <Ro />}
    </Layout>
  );
}
