import LegalPage from './LegalPage';
import { termsOfService } from '../legal';

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of service"
      lead="The rules for using our website and accounts."
      icon="M6 3h9l3 3v15H6zM9 10h6M9 14h6M9 18h4"
      docKey="legal.terms"
      fallback={{ updated: 'October 2026', sections: termsOfService }}
      other={{ to: '/privacy', label: 'Read the privacy policy' }}
    />
  );
}
