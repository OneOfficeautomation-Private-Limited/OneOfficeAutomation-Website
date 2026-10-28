import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import RequireAuth from './auth/RequireAuth';
const HomePage = lazy(() => import('./pages/HomePage'));
const PlatformPage = lazy(() => import('./pages/PlatformPage'));
const SolutionsPage = lazy(() => import('./pages/SolutionsPage'));
const CustomersPage = lazy(() => import('./pages/CustomersPage'));
const PricingPage = lazy(() => import('./pages/PricingPage'));
const ResourcesPage = lazy(() => import('./pages/ResourcesPage'));
const PartnersPage = lazy(() => import('./pages/PartnersPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const CareersPage = lazy(() => import('./pages/CareersPage'));
const ContactPage = lazy(() => import('./pages/ContactPage'));
const SignUpPage = lazy(() => import('./pages/auth/SignUpPage'));
const SignInPage = lazy(() => import('./pages/auth/SignInPage'));
const AccountPage = lazy(() => import('./pages/auth/AccountPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const ResourceSectionPage = lazy(() => import('./pages/ResourceSectionPage'));
const AdminApp = lazy(() => import('./admin/AdminApp'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="platform" element={<PlatformPage />} />
        <Route path="solutions" element={<SolutionsPage />} />
        <Route path="customers" element={<CustomersPage />} />
        <Route path="pricing" element={<PricingPage />} />
        <Route path="resources" element={<ResourcesPage />} />
        <Route path="resources/:section" element={<ResourceSectionPage />} />
        <Route path="partners" element={<PartnersPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="careers" element={<CareersPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="signin" element={<SignInPage />} />
        <Route
          path="account"
          element={
            <RequireAuth>
              <AccountPage />
            </RequireAuth>
          }
        />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
      <Route path="admin/*" element={<Suspense fallback={<div style={{ minHeight: '100vh', background: '#F4F6FC' }} />}><AdminApp /></Suspense>} />
    </Routes>
  );
}
