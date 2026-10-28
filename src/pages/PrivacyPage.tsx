import LegalPage from './LegalPage';
import { privacyPolicy } from '../legal';

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy policy"
      lead="How we collect, use and protect your information."
      icon="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7zM9 12l2 2 4-4"
      docKey="legal.privacy"
      fallback={{ updated: 'October 2026', sections: privacyPolicy }}
      other={{ to: '/terms', label: 'Read the terms of service' }}
    />
  );
}
