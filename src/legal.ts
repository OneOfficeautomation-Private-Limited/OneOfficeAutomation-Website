/**
 * Text of the legal pages. Tokens such as {legalName} are filled in from company.ts.
 * These are standard starting terms: have your lawyer review them before launch.
 */
export interface Section {
  heading: string;
  kind: 'p' | 'ul';
  items: string[];
}

export const privacyPolicy: Section[] = [
  {
    heading: "Who we are",
    kind: "p",
    items: [
      "This policy explains how {legalName} (“OneOfficeAutomation”, “we”, “us”) handles personal information on {website} and in the customer accounts you create here. We are a company incorporated in Karnataka, India (CIN {cin}) with our registered office at {address}, and an office in Doha, Qatar.",
      "It covers our website only. The OneOfficeAutomation platform is self-hosted: the business data your agents process stays on your own servers and is not sent to us.",
    ],
  },
  {
    heading: "Information we collect",
    kind: "ul",
    items: [
      "Account details you give us when you register: name, work email, company, country, chosen plan and a password. We store only a salted, one-way hash of your password.",
      "Details you send through our forms: demo requests, partner applications and newsletter sign-ups, including anything you write in the message box.",
      "Messages and calls with our sales and support teams.",
      "Technical and usage information, such as pages visited and device type, but only if you accept analytics cookies.",
      "Your cookie choices, stored in your browser.",
    ],
  },
  {
    heading: "How we use it",
    kind: "ul",
    items: [
      "To create and run your account and keep it secure.",
      "To respond to demo, partner and support requests.",
      "To send product updates you asked for. You can unsubscribe at any time.",
      "To understand how the site is used and improve it, with your consent where required.",
      "To meet legal, tax and security obligations.",
    ],
  },
  {
    heading: "Cookies and similar technologies",
    kind: "p",
    items: [
      "Essential cookies keep the site working, for example the session cookie that keeps you signed in. They are always on.",
      "Analytics and marketing cookies stay off until you accept them in the cookie banner. You can change your choice at any time by clearing the site data in your browser, after which the banner appears again.",
    ],
  },
  {
    heading: "Who we share it with",
    kind: "p",
    items: [
      "We do not sell your personal information. We share it only with service providers who help us run the website, such as hosting and email providers, under confidentiality and security obligations, and with authorities when the law requires it.",
      "If we are involved in a merger, acquisition or sale of assets, your information may be transferred as part of that transaction, and we will tell you if that happens.",
    ],
  },
  {
    heading: "International transfers",
    kind: "p",
    items: [
      "We operate from India and Qatar, and our service providers may process data in other countries. Where we transfer personal information across borders, we use safeguards that the applicable law permits.",
    ],
  },
  {
    heading: "How long we keep it",
    kind: "p",
    items: [
      "We keep account information while your account is active and for a reasonable period afterwards for legal and accounting purposes. Form submissions are kept only as long as needed to handle your request. You can ask us to delete your information at any time.",
    ],
  },
  {
    heading: "How we protect it",
    kind: "p",
    items: [
      "We protect your information with encrypted connections, hashed passwords, signed session cookies, input validation and rate limiting, and we limit internal access to people who need it. No system is perfectly secure, so please use a strong, unique password.",
    ],
  },
  {
    heading: "Your rights",
    kind: "p",
    items: [
      "Under applicable law, including India’s Digital Personal Data Protection Act, 2023, you may have the right to access your information, have it corrected or deleted, withdraw consent, and raise a grievance. To use any of these rights, email {supportEmail} and we will respond within a reasonable time.",
    ],
  },
  {
    heading: "Children",
    kind: "p",
    items: [
      "Our website and services are for businesses and are not directed to anyone under 18. We do not knowingly collect information from children.",
    ],
  },
  {
    heading: "Changes to this policy",
    kind: "p",
    items: [
      "We may update this policy from time to time. When we do, we will change the date at the top of this page, and for significant changes we will take reasonable steps to let you know.",
    ],
  },
  {
    heading: "Contact us",
    kind: "p",
    items: [
      "{legalName}, {address}. Email {supportEmail}. Phone {phoneIndia} (India) or {phoneQatar} (Qatar).",
    ],
  },
];

export const termsOfService: Section[] = [
  {
    heading: "About these terms",
    kind: "p",
    items: [
      "These terms govern your use of {website} and any account you create here. The website is operated by {legalName} (CIN {cin}), registered at {address}. By using the website or creating an account, you agree to these terms. If you do not agree, please do not use it.",
    ],
  },
  {
    heading: "Your account",
    kind: "ul",
    items: [
      "You must be at least 18 and have authority to act for your business.",
      "Give accurate information and keep it up to date.",
      "Keep your password confidential. You are responsible for activity under your account, so tell us at {supportEmail} straight away if you suspect unauthorised use.",
      "We may suspend or close accounts that break these terms or put the service or other users at risk.",
    ],
  },
  {
    heading: "Acceptable use",
    kind: "ul",
    items: [
      "Do not misuse the website, for example by attempting to gain unauthorised access, probe or disrupt it, or overload it with automated requests.",
      "Do not upload malicious code or use the website to break the law or infringe others’ rights.",
      "Do not copy, resell or reverse engineer any part of the website except as the law allows.",
    ],
  },
  {
    heading: "Plans, trials and pricing",
    kind: "p",
    items: [
      "The Community edition is free. Starter and Business include a free trial. Prices shown on the Pricing page are in US dollars and exclude applicable taxes. Paid plans, billing, renewals and refunds are set out in your order form or subscription agreement with us, which prevails over these terms if they conflict. We may change prices for future periods with reasonable notice.",
    ],
  },
  {
    heading: "The OneOfficeAutomation platform",
    kind: "p",
    items: [
      "The platform is self-hosted software that runs on your own infrastructure. Your use of the platform is governed by your licence or subscription agreement with us, not by these website terms. Information on this website is for general guidance and does not form a contract for the platform.",
    ],
  },
  {
    heading: "Intellectual property",
    kind: "p",
    items: [
      "The website, the OneOfficeAutomation name and logo, the platform and all related content belong to {legalName} or its licensors and are protected by law. We grant you a limited, non-exclusive, non-transferable right to use the website for its intended purpose. Agents and workflows you build remain yours.",
    ],
  },
  {
    heading: "Third-party links and services",
    kind: "p",
    items: [
      "The website may link to third-party sites and may integrate third-party services. We do not control them and are not responsible for their content or practices.",
    ],
  },
  {
    heading: "Disclaimers",
    kind: "p",
    items: [
      "The website is provided “as is” and “as available”. To the extent the law allows, we do not promise that it will be uninterrupted, error-free or suitable for your particular purpose. Case studies and figures describe results for specific customers and are not a guarantee of your results.",
    ],
  },
  {
    heading: "Limitation of liability",
    kind: "p",
    items: [
      "To the extent the law allows, we are not liable for indirect, incidental or consequential loss, or for loss of profits, revenue or data arising from your use of the website. Nothing in these terms limits liability that cannot be limited by law.",
    ],
  },
  {
    heading: "Ending your account",
    kind: "p",
    items: [
      "You can stop using the website and ask us to close your account at any time by emailing {supportEmail}. We may suspend or end access if you break these terms. Sections that by their nature should continue, such as intellectual property and limitation of liability, will survive.",
    ],
  },
  {
    heading: "Governing law",
    kind: "p",
    items: [
      "These terms are governed by the laws of India. The courts of Karnataka have exclusive jurisdiction over disputes arising from them, unless the law gives you the right to bring a claim elsewhere.",
    ],
  },
  {
    heading: "Changes to these terms",
    kind: "p",
    items: [
      "We may update these terms from time to time. The date at the top of this page shows the latest version, and continuing to use the website after a change means you accept it.",
    ],
  },
  {
    heading: "Contact us",
    kind: "p",
    items: [
      "{legalName}, {address}. Email {supportEmail}. Phone {phoneIndia} (India) or {phoneQatar} (Qatar).",
    ],
  },
];

