import Layout from '../components/Layout.jsx';
import { useMeta } from '../i18n.jsx';
import Content from './ro/Termeni.jsx';

const META = {
  title: 'Termeni și condiții — DocVex',
  description: 'Termenii de utilizare a site-ului și a aplicației DocVex.',
};

export default function Termeni() {
  useMeta(META);
  return (
    <Layout page="termeni" mainClassName="wrap">
      <Content />
    </Layout>
  );
}
