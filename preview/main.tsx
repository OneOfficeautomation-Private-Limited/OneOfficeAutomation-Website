// Preview build only (not deployed): the real site in one file, with in-memory page navigation
// and the built-in default content, so it can be viewed beside the chat.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { AuthProvider } from '../src/auth/AuthContext';
import { CmsProvider } from '../src/cms/CmsContext';
import '../src/index.css';
import '../src/ds/ds.css';
import { DialogHost } from '../src/ui/dialog';

const start = window.location.hash.replace('#', '');
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MemoryRouter initialEntries={[start ? `/${start}` : '/']}>
      <CmsProvider>
        <AuthProvider>
          <App />
        </AuthProvider>
      </CmsProvider>
    </MemoryRouter>
    <DialogHost />
  </StrictMode>,
);
