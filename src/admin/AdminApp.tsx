import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './admin.css';
import { AdminProvider } from './AdminContext';
import { Account, Team } from './Accounts';
import { ActivityLog, CustomerPage, Customers, Deals, Emails, PartnerPage, Partners, Requests, Settings } from './Ops';
import { Pipeline, RecordPage } from './Pipeline';
import Dashboard from './Dashboard';
import Editor from './Editor';
import Login from './Login';
import Setup from './Setup';
import Shell from './Shell';
import { Library, LibraryItem } from './Library';
import { MediaLibrary } from './Media';
import { CatalogAdmin } from './Catalog';
import { PageOverview } from './PageOverview';

/** The content management area at /admin. It has its own sign-in and is hidden from search engines. */
export default function AdminApp() {
  useEffect(() => {
    const meta = document.createElement('meta');
    meta.name = 'robots';
    meta.content = 'noindex, nofollow';
    document.head.appendChild(meta);
    document.title = 'Admin | OneOfficeAutomation';
    return () => meta.remove();
  }, []);
  return (
    <AdminProvider>
      <Routes>
        <Route path="login" element={<Login />} />
        <Route path="setup" element={<Setup />} />
        <Route element={<Shell />}>
          <Route index element={<Dashboard />} />
          <Route path="content/:key" element={<Editor />} />
          <Route path="library" element={<Library />} />
          <Route path="media" element={<MediaLibrary />} />
          <Route path="catalog" element={<CatalogAdmin />} />
          <Route path="pages/:id" element={<PageOverview />} />
          <Route path="library/:id" element={<LibraryItem />} />
          <Route path="inbox" element={<Navigate to="/admin/pipeline/demo" replace />} />
          <Route path="pipeline/:kind" element={<Pipeline />} />
          <Route path="records/:id" element={<RecordPage />} />
          <Route path="partners" element={<Partners />} />
          <Route path="partners/:id" element={<PartnerPage />} />
          <Route path="deals" element={<Deals />} />
          <Route path="requests" element={<Requests />} />
          <Route path="customers" element={<Customers />} />
          <Route path="customers/:id" element={<CustomerPage />} />
          <Route path="emails" element={<Emails />} />
          <Route path="settings" element={<Settings />} />
          <Route path="activity" element={<ActivityLog />} />
          <Route path="team" element={<Team />} />
          <Route path="account" element={<Account />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminProvider>
  );
}
