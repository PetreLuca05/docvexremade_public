import Layout from '../components/Layout.jsx';
import { useMeta } from '../i18n.jsx';
import Content from './ro/Confidentialitate.jsx';

const META = {
  title: 'Politica de confidențialitate — DocVex',
  description:
    'Cum prelucrează DocVex datele cu caracter personal, conform Regulamentului (UE) 2016/679 (GDPR) și Legii nr. 190/2018.',
};

export default function Confidentialitate() {
  useMeta(META);
  return (
    <Layout page="confidentialitate" mainClassName="wrap">
      <Content />
    </Layout>
  );
}
