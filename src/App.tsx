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
const DocsPage = lazy(() => import('./pages/resources/DocsPage'));
const FaqsPage = lazy(() => import('./pages/resources/FaqsPage'));
const TrainingPage = lazy(() => import('./pages/resources/TrainingPage'));
const SupportPage = lazy(() => import('./pages/resources/SupportPage'));
const EventsPage = lazy(() => import('./pages/resources/EventsPage'));
const BlogPage = lazy(() => import('./pages/resources/BlogPage'));
const ForgotPage = lazy(() => import('./pages/auth/RecoverPages').then((m) => ({ default: m.ForgotPage })));
const ResetPage = lazy(() => import('./pages/auth/RecoverPages').then((m) => ({ default: m.ResetPage })));
const PartnerLoginPage = lazy(() => import('./pages/partner/PartnerPages').then((m) => ({ default: m.PartnerLoginPage })));
const PartnerPortalPage = lazy(() => import('./pages/partner/PartnerPages').then((m) => ({ default: m.PartnerPortalPage })));
const ApplicationStatusPage = lazy(() => import('./pages/public/PublicPages').then((m) => ({ default: m.ApplicationStatusPage })));
const UnsubscribePage = lazy(() => import('./pages/public/PublicPages').then((m) => ({ default: m.UnsubscribePage })));
const StoryPage = lazy(() => import('./pages/DetailPages').then((m) => ({ default: m.StoryPage })));
const ToolkitsPage = lazy(() => import('./pages/resources/ToolkitsPage').then((m) => ({ default: m.ToolkitsPage })));
const ToolkitPage = lazy(() => import('./pages/resources/ToolkitsPage').then((m) => ({ default: m.ToolkitPage })));
const TrustPage = lazy(() => import('./pages/DetailPages').then((m) => ({ default: m.TrustPage })));
const WebinarsPage = lazy(() => import('./pages/DetailPages').then((m) => ({ default: m.WebinarsPage })));
const DownloadPage = lazy(() => import('./pages/DetailPages').then((m) => ({ default: m.DownloadPage })));
const PostPage = lazy(() => import('./pages/DetailPages').then((m) => ({ default: m.PostPage })));
const EventPage = lazy(() => import('./pages/DetailPages').then((m) => ({ default: m.EventPage })));
const SectorPage = lazy(() => import('./pages/DetailPages').then((m) => ({ default: m.SectorPage })));
const RolePage = lazy(() => import('./pages/DetailPages').then((m) => ({ default: m.RolePage })));
const VerifyEmailPage = lazy(() => import('./pages/public/PublicPages').then((m) => ({ default: m.VerifyEmailPage })));
const CommunityPage = lazy(() => import('./pages/public/PublicPages').then((m) => ({ default: m.CommunityPage })));
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
        <Route path="resources/docs" element={<DocsPage />} />
        <Route path="resources/docs/:product" element={<DocsPage />} />
        <Route path="resources/docs/:product/:article" element={<DocsPage />} />
        <Route path="resources/faqs" element={<FaqsPage />} />
        <Route path="resources/training" element={<TrainingPage />} />
        <Route path="resources/support" element={<SupportPage />} />
        <Route path="resources/events" element={<EventsPage />} />
        <Route path="resources/blog" element={<BlogPage />} />
        <Route path="resources/:section" element={<ResourceSectionPage />} />
        <Route path="partners" element={<PartnersPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="careers" element={<CareersPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="signup" element={<SignUpPage />} />
        <Route path="signin" element={<SignInPage />} />
        <Route path="forgot" element={<ForgotPage />} />
        <Route path="reset" element={<ResetPage mode="reset" />} />
        <Route path="partner" element={<PartnerPortalPage />} />
        <Route path="partner/login" element={<PartnerLoginPage />} />
        <Route path="partner/forgot" element={<ForgotPage partner />} />
        <Route path="partner/reset" element={<ResetPage mode="partner-reset" />} />
        <Route path="partner/accept" element={<ResetPage mode="partner-accept" />} />
        <Route path="application/:token" element={<ApplicationStatusPage />} />
        <Route path="unsubscribe" element={<UnsubscribePage />} />
        <Route path="verify" element={<VerifyEmailPage />} />
        <Route path="customers/:story" element={<StoryPage />} />
        <Route path="careers/:role" element={<RolePage />} />
        <Route path="solutions/:sector" element={<SectorPage />} />
        <Route path="resources/blog/:post" element={<PostPage />} />
        <Route path="resources/download/:post" element={<DownloadPage />} />
        <Route path="trust" element={<TrustPage />} />
        <Route path="resources/webinars" element={<WebinarsPage />} />
        <Route path="resources/toolkits" element={<ToolkitsPage />} />
        <Route path="resources/toolkits/:toolkit" element={<ToolkitPage />} />
        <Route path="resources/events/:event" element={<EventPage />} />
        <Route path="community" element={<CommunityPage />} />
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
