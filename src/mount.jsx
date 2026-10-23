import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { LangProvider } from './i18n.jsx';
import './styles/style.css';

export function mount(Page) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <LangProvider>
        <Page />
      </LangProvider>
    </StrictMode>,
  );
}
