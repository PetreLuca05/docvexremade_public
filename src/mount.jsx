import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/style.css';

export function mount(Page) {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <Page />
    </StrictMode>,
  );
}
