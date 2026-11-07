import Layout from '../components/Layout.jsx';
import { useMeta } from '../i18n.jsx';
import Content from './ro/InformatiiLegale.jsx';

const META = {
  title: 'Informații legale — DocVex',
  description:
    'Datele de identificare ale operatorului DocVex, autoritățile competente, soluționarea litigiilor, transparența AI, accesibilitate, securitate și cadrul legal aplicabil.',
};

export default function InformatiiLegale() {
  useMeta(META);
  return (
    <Layout page="informatii-legale" mainClassName="wrap">
      <Content />
    </Layout>
  );
}
