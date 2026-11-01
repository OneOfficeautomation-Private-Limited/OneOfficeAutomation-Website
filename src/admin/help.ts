/**
 * "How to use this page" notes shown in small text under each admin screen's title.
 * Keep each note short: one line saying what the screen is for, then up to four steps.
 * Edit the wording here; the HowTo component picks the right note from the page address.
 */
export interface Help { what: string; steps: string[] }

const KIND_WHAT: Record<string, string> = {
  demo: 'Demo requests sent from the Contact page and the “Book a demo” buttons.',
  partner: 'Applications from companies that want to become partners.',
  career: 'Job applications from the Careers page.',
  newsletter: 'People who subscribed to product updates.',
  download: 'People who filled in the form to download an e-book, whitepaper or other gated file.',
};

const HELP: { match: RegExp; help: (m: RegExpMatchArray) => Help }[] = [
  {
    match: /^\/admin\/?$/,
    help: () => ({
      what: 'Your starting point each day: what is new, what is waiting and what needs a follow-up.',
      steps: [
        'Start with “Waiting for a decision” and open each item to approve, reject or move it on.',
        '“Needs attention” lists open items nobody has touched for two days, and follow-ups that are due.',
        'Use the menu on the left to open a pipeline or edit website content.',
      ],
    }),
  },
  {
    match: /^\/admin\/pipeline\/([a-z]+)$/,
    help: (m) => ({
      what: KIND_WHAT[m[1]] ?? 'Every submission of this type, newest first.',
      steps: [
        'Filter by stage, or search by name, email or company.',
        'Click a row to open it, move it to the next stage and add notes.',
        'Download CSV saves the list you are looking at as a spreadsheet.',
      ],
    }),
  },
  {
    match: /^\/admin\/records\/[^/]+$/,
    help: () => ({
      what: 'One submission, with its details, stage, owner, notes and history.',
      steps: [
        'Move to another stage: click the stage it should go to. Some stages email the person, and rejecting asks for a reason.',
        'Set an owner and a follow-up date so the team knows who acts next, and when.',
        'Notes are internal and never shown to the person. History records every change.',
        'Delete record removes it for good. Only admins can do this.',
      ],
    }),
  },
  {
    match: /^\/admin\/partners$/,
    help: () => ({
      what: 'Approved partner companies. New applications arrive in Pipelines → Partner applications.',
      steps: [
        'Filter by status or type, or search by company.',
        'Click a company to set its level, status and onboarding checklist.',
      ],
    }),
  },
  {
    match: /^\/admin\/partners\/[^/]+$/,
    help: () => ({
      what: 'One partner company: its level, status, onboarding and the people who can use the partner portal.',
      steps: [
        'Tick the onboarding checklist as each step is done. When every item is ticked, the partner becomes Active automatically.',
        'Change the level, status or type and save. Inactive partners can’t sign in to the portal.',
        'Resend invitation emails a new sign-in link to someone who hasn’t joined yet.',
        'Manage deals shows the deals this partner has registered.',
      ],
    }),
  },
  {
    match: /^\/admin\/deals$/,
    help: () => ({
      what: 'Customers that partners have registered, so other partners can’t claim them.',
      steps: [
        'Approve a deal and choose how many days the customer stays protected for that partner.',
        'Reject with a short message; it is included in the email to the partner.',
        'Partners mark deals as won or lost themselves in the partner portal.',
      ],
    }),
  },
  {
    match: /^\/admin\/requests$/,
    help: () => ({
      what: 'Things people asked for that need a decision: plan changes, account deletions, community invitations and event registrations.',
      steps: [
        'Filter by type or status to see what is waiting.',
        'Approve or reject. Either way, the person gets an email.',
        'Only admins can approve an account deletion, because it can’t be undone.',
      ],
    }),
  },
  {
    match: /^\/admin\/customers$/,
    help: () => ({
      what: 'People who created an account on the website.',
      steps: [
        'Search by name, email or company, or filter by plan and status.',
        'Click a name to change the plan or status, or to see their requests.',
      ],
    }),
  },
  {
    match: /^\/admin\/customers\/[^/]+$/,
    help: () => ({
      what: 'One customer account: plan, status, requests and history.',
      steps: [
        'Change the plan or status and save. Suspended customers can’t sign in.',
        'Their demo requests and other requests are listed below, with links to each.',
        'Delete account removes the account for good. Only admins can do this.',
      ],
    }),
  },
  {
    match: /^\/admin\/emails$/,
    help: () => ({
      what: 'Every email the website has sent, and whether it was delivered.',
      steps: [
        'A failed email shows the reason. Check the email settings on the server if many fail.',
        'Send me a test email to check that sending works.',
        'Edit the email texts changes the wording of every email the website sends.',
      ],
    }),
  },
  {
    match: /^\/admin\/settings$/,
    help: () => ({
      what: 'Settings for how the admin works.',
      steps: [
        'Content approval: when it’s on, changes made by Editors wait until an admin approves them. Admins’ own changes go live straight away.',
        'Send me a test email to check that the website can send email.',
      ],
    }),
  },
  {
    match: /^\/admin\/activity$/,
    help: () => ({
      what: 'The last 200 changes made in the admin: who did what, and when.',
      steps: ['Use it to check what changed, or to see who handled a submission.'],
    }),
  },
  {
    match: /^\/admin\/team$/,
    help: () => ({
      what: 'The people who can sign in to this admin, and what each one can do.',
      steps: [
        'Add team member: enter a name, email, role and a temporary password, then share the password with them privately.',
        'They change the temporary password in My account after signing in.',
        'Changing someone’s role or password, or setting their access to Inactive, signs them out everywhere. Reset gives them a new temporary password.',
      ],
    }),
  },
  {
    match: /^\/admin\/account$/,
    help: () => ({
      what: 'Your own sign-in details.',
      steps: ['Change password: enter your current password and a new one with at least 10 characters, a letter and a number. Your other devices are signed out.'],
    }),
  },
  {
    match: /^\/admin\/content\/site\.analytics$/,
    help: () => ({
      what: 'Choose the tools that measure visits or track advertising on the website.',
      steps: [
        'Press + Add, choose the tool and paste its ID (the hint under the ID box says where to find it).',
        'Analytics tools load only after a visitor accepts analytics cookies; advertising tools only after they accept marketing cookies.',
        'Save. The website allows exactly the addresses the chosen tools need. To stop a tool, delete it and save.',
      ],
    }),
  },
  {
    match: /^\/admin\/content\/site\.settings$/,
    help: () => ({
      what: 'The company’s offices, legal details, contact details and social links, used across the website, the legal pages and emails.',
      steps: [
        'Offices: add one per country or legal company. Tick “Head office” on the main one; its details appear in the legal pages.',
        'Social media: add only the company’s real pages. Each one shows as an icon in the footer.',
        'The footer tagline and announcement bar are further down. Save when you’re done.',
      ],
    }),
  },
  {
    match: /^\/admin\/content\/site\.redirects$/,
    help: () => ({
      what: 'Send visitors and search engines from an old page address to a new one.',
      steps: [
        'Press + Add, type the old address (for example /old-guide) and the new one.',
        'Tick “Permanent move” when a page has moved for good, so search engines update their links.',
        'Save. Test by opening the old address in a new tab.',
      ],
    }),
  },
  {
    match: /^\/admin\/content\/seo\.(site|pages)$/,
    help: () => ({
      what: 'What search engines and link previews (LinkedIn, WhatsApp, X) show for the website’s pages.',
      steps: [
        'Keep titles under 60 characters and descriptions under 160, written for a person deciding whether to click.',
        'A share image is optional: without one, the default image is used.',
        '“Hide from search engines” keeps a page out of Google and the sitemap.',
      ],
    }),
  },
  {
    match: /^\/admin\/content\/emails\.templates$/,
    help: () => ({
      what: 'The wording of every email the website sends.',
      steps: [
        'Choose an email from the list at the top. Each one says who receives it.',
        'Edit the subject and message. The buttons under the message insert the details that are filled in automatically, such as the person’s name.',
        'Check the preview, send yourself a test, then save.',
      ],
    }),
  },
  {
    match: /^\/admin\/content\/[^/]+$/,
    help: () => ({
      what: 'Edit the words on the website. The note above says where this content appears.',
      steps: [
        'Change the fields. In lists, use Add, Duplicate and Delete, and ↑ ↓ to change the order.',
        'Save changes. It goes live straight away, or waits for an admin if content approval is on for your role.',
        'Open the page ↗ to check the result on the website.',
        'History restores an earlier version. Reset to original brings back the default text.',
      ],
    }),
  },
  {
    match: /^\/admin\/catalog$/,
    help: () => ({
      what: 'The toolkits, connectors and actions listed on the website, imported from the product’s own export.',
      steps: [
        'Ask the product team for the catalogue export (format: docs/ACTION-CATALOG-FORMAT.md).',
        'Press “Choose file and import”. The whole catalogue is replaced at once.',
        'If the file has problems, nothing changes and each problem is listed with where it is.',
        'Import again after each release so the reference stays current.',
      ],
    }),
  },
  {
    match: /^\/admin\/media$/,
    help: () => ({
      what: 'Images and PDFs for the website, such as customer logos, screenshots for articles, banners and downloads.',
      steps: [
        'Upload: press Upload files or drag files here. PNG, JPEG, WebP, GIF or PDF, up to 5 MB each.',
        'Add a description to every image: screen readers and search engines read it.',
        'To use a file: pick it from any image field (“Choose…”), or press Copy for articles and paste the code into an article.',
        'Where used shows the pages that use a file. Only admins can delete, and you are warned if it’s still in use.',
      ],
    }),
  },
  {
    match: /^\/admin\/library$/,
    help: () => ({
      what: 'Every article, FAQ, blog item, event and training item, one at a time.',
      steps: [
        'Search, or filter by type, status or product. “Review due” lists items whose review date has passed.',
        'Click an item to edit it. To add one, choose the type under “New” and press Create.',
        'Only Published items (and Scheduled ones once their date arrives) appear on the website.',
      ],
    }),
  },
  {
    match: /^\/admin\/library\/[^/]+$/,
    help: () => ({
      what: 'One library item: its words, and when and to whom it is shown.',
      steps: [
        'Status: Draft and In review stay hidden; Published shows now; Scheduled shows from the date you choose; Archived hides it but keeps it.',
        'Articles: choose a parent topic and an order to place it in the product’s table of contents, and who can read it.',
        'Set an owner and a review date so someone checks it stays correct.',
        'Save. History restores an earlier version. If content approval is on, Editors’ changes go to In review for an admin.',
      ],
    }),
  },
  {
    match: /^\/admin\/login$/,
    help: () => ({
      what: 'Sign in with the email and password your admin gave you.',
      steps: ['Forgot your password? Ask an admin to set a new one for you in Team.'],
    }),
  },
  {
    match: /^\/admin\/setup$/,
    help: () => ({
      what: 'Creates the first admin account. This only works once, with the setup token from the server settings.',
      steps: ['After this, add everyone else from Team.'],
    }),
  },
];

/** The note for an admin address, or null if the screen has none. */
export function helpFor(path: string): Help | null {
  const clean = path.replace(/\/+$/, '') || '/';
  for (const h of HELP) {
    const m = clean.match(h.match) ?? (clean === '/admin' ? '/admin/'.match(h.match) : null);
    if (m) return h.help(m);
  }
  return null;
}
