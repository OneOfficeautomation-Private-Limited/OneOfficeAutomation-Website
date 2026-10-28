import { useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import './admin.css';
import { AdminProvider } from './AdminContext';
import { Account, Customers, Team } from './Accounts';
import Dashboard from './Dashboard';
import Editor from './Editor';
import Inbox from './Inbox';
import Login from './Login';
import Setup from './Setup';
import Shell from './Shell';

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
          <Route path="inbox" element={<Inbox />} />
          <Route path="customers" element={<Customers />} />
          <Route path="team" element={<Team />} />
          <Route path="account" element={<Account />} />
        </Route>
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </AdminProvider>
  );
}
