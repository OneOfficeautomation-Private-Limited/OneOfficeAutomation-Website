# OneOfficeAutomation website (Hostinger)

The OneOfficeAutomation website with customer registration, built for a **Hostinger Node.js web app** (Business or Cloud hosting) with a **MySQL** database.

| Part | Technology | Folder |
|---|---|---|
| Website | React 18, TypeScript, Vite, React Router | `src/` |
| Server and API | Node.js 20+, Express (TypeScript) | `server/` |
| Database | MySQL / MariaDB | `server/schema.sql` |
| Security headers | Set by the server | `server/index.ts` |

**Includes:** a content management area at `/admin`, 10 marketing pages (with Resources section pages), Privacy policy (`/privacy`) and Terms of service (`/terms`) pages, and a 404 page; customer Sign up (`/signup`), Sign in (`/signin`) and My account (`/account`); demo, partner, newsletter and job-application forms that save to the database; and a cookie consent banner.


## Repository layout

| Folder | What's in it |
|---|---|
| `src/` | Front end: `pages/` (public site), `admin/` (CMS screens), `cms/` (content model), `components/`, `ds/` (design system), `logic/`, `auth/` |
| `server/` | Express API: `index.ts`, `api.ts` (router), `_lib/` (one module per domain), `schema.sql` |
| `public/` | Static assets (logos, favicons) |
| `scripts/` | Local run / reset / sample data; `scripts/windows/` PowerShell helpers |
| `docs/` | Hostinger checklist (`docs/deployment/`), manuals and screenshots (`docs/manuals/`), toolkit catalogue format |
| `.github/` | CI (type check + build on every pull request), PR and issue templates |

**Contributors:** start with [CONTRIBUTING.md](CONTRIBUTING.md) for setup, the full folder map and the branch / pull request workflow.

## Content management (CMS)

Almost everything that changes over time is editable from **`/admin`**, without touching code.

### First-time setup
1. Make sure the `ADMIN_SETUP_TOKEN` environment variable exists (see the deploy steps below).
2. Open `https://your-domain/admin`. You are sent to the setup screen.
3. Enter the setup token, your name, email and a password. This creates the first **admin** and works only once.
4. After that, you can delete the `ADMIN_SETUP_TOKEN` environment variable if you like. Add more people under **Team**.

### Roles
- **Admin:** everything, including the team and deleting submissions.
- **Editor:** edits content and handles the inbox (status changes, CSV export).

### What you can edit
The admin menu lists the main areas on the left; pick one and its options open on the right.

- **Site settings:** company details, phones, emails, **LinkedIn / Facebook / Instagram / YouTube links**, announcement bar.
- **Home & Platform:** home text and walkthrough, the platform numbers.
- **Solutions:** industries and their use cases.
- **Customers:** stories. Switch on **Feature this story** for the few you want to stand out: they get a badge, show first, and feed the hero cards, the scoreboard and the quote wall (3 or 4 works best).
- **Pricing:** plans, comparison table, questions, note.
- **Resources:** help types ("By what you need"), products ("By product") and every article. Each article gets a help type and, where it applies, a product, so customers can find it either way.
- **Partners:** types, benefits, levels and the step-by-step **procedure for becoming a partner**.
- **About, Careers:** text, values, timeline, teams, open roles, hiring steps.
- **Legal:** Terms of service and Privacy policy.

Each section has a **History** button (restore any earlier version) and **Reset to original**. Changes go live within a few seconds. There is no separate draft step.

On the public site, the Careers page has search, team and location filters, and shows 5 roles per screen. Resources pages have a filter row and search.

### Inbox
Demo requests, partner applications, job applications and newsletter sign-ups arrive in **Inbox**, with a status (new, contacted, closed), full details and a CSV download. **Customers** lists the people who registered on the website.

### Notes for developers
- Editable sections are defined in `src/cms/registry.ts`. The admin forms and the API validation both read it.
- The original (default) content comes from the design files: every `cms('key', default)` call in `Main.dc.html`, `Pricing.dc.html` and the other design pages is extracted into `src/cms/defaults.generated.json`. The public site always falls back to these defaults, so it still works if the database is empty or unreachable.
- To make something else editable: add a section to `registry.ts`, read it with `cms('your.key', default)` in the page, and regenerate.
- Content is stored in the `content` table (with `content_revisions` for history). Public pages read `GET /api/content`. Admin endpoints live under `/api/admin` and need the admin session cookie (HttpOnly, SameSite=Strict, 12 hours).
- Article text uses simple formatting: a blank line between paragraphs, `## ` for a heading, `- ` for a bullet. Nothing is rendered as raw HTML.
- Images and file uploads are not supported; add links instead.

## Workflows, portals and email

### Email (Zoho Mail)
The site sends emails (confirmations, approvals, rejections, invitations, password resets, team alerts) through SMTP. Add these environment variables in hPanel → your Node.js app → Environment variables, then redeploy:

| Variable | Value |
|---|---|
| `SMTP_HOST` | `smtp.zoho.in` if you sign in to Zoho at mail.zoho.in (India data centre), otherwise `smtp.zoho.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | `support@oneofficeautomation.com` |
| `SMTP_PASS` | The mailbox password, or an **app-specific password** if two-factor sign-in is on (Zoho Accounts → Security → App passwords) |
| `MAIL_FROM` | `OneOfficeAutomation <support@oneofficeautomation.com>` (must be the same address as `SMTP_USER`, or an alias of it) |
| `NOTIFY_EMAIL` | Where team alerts go, for example `support@oneofficeautomation.com` |
| `SITE_URL` | `https://oneofficeautomation.com` (used for links inside emails; required) |

Check it in /admin → Emails → "Send me a test email". Every email is listed there with sent, skipped or failed. Until these are set, nothing breaks: emails are recorded as "skipped".
Zoho limits how many emails a mailbox can send per day, depending on your plan.

### Email confirmation and sign-out
- New customers get a confirmation link in their welcome email (valid 7 days); /verify confirms it. Until then, My account doesn't show demo requests or other messages that were matched only by email address, and product updates can't be switched on. Customers can ask for a new link from My account. Resetting a password also confirms the address. Customers who registered before this update are unconfirmed until they use a link.
- Changing or resetting a password signs that person out on every other device. For team members, so does a role change or deactivation.
- `SITE_URL` should always be set. Without it, email links point to https://oneofficeautomation.com, never to the address in the request.

### What happens where
- **Demo requests**: New → Contacted → Demo scheduled → Demo done → Won / Lost. The visitor gets a confirmation; the team gets an alert.
- **Partner applications**: Submitted → In review → Approved / Rejected. Approving creates the partner account and emails a portal invitation (7-day link). Rejecting needs a reason, which is included in the email. Partners then go Onboarding → Active (automatically when the checklist is complete) → Inactive, at level Registered / Certified / Strategic. Level and status changes email the partner.
- **Deal registrations** (from the partner portal): approve (protected for N days) or reject with a reason; then Won / Lost.
- **Job applications**: New → Screening → Intro chat → Practical task → Offer → Hired / Not successful / Withdrawn. Applicants get a private status link; rejecting needs a reason and sends a polite email.
- **Customers**: Free / Trial / Paid / Enterprise (pending) / Enterprise / Suspended / Closed. Suspended and closed accounts can't sign in. Plan changes and account deletion are requests that need approval.
- **Community invites** and **event registrations** arrive under Requests. Set the community link under Emails → Community invitation link.
- **Content approval** (optional, Settings): editors' changes wait for an admin to approve them.
- Records are kept until someone removes them.

### Team roles
Admin (everything), Editor (content), Sales (demo requests, customers, requests, newsletter), Partner manager (partner applications, partners, deals), Recruiter (job applications), Viewer (read-only).

### Portals
- Customers: /account (profile, password, my requests, plan change, newsletter, data download, account deletion), /forgot and /reset.
- Partners: /partner/login, /partner (onboarding, level, deals, team, directory profile). Active partners who keep their listing on appear in the public directory on /partners.
- Job applicants: /application/… (link in their confirmation email). Newsletter: /unsubscribe link in every newsletter email. Community: /community.

New database tables are created automatically on start; existing data is untouched.

## Design system

The redesigned pages share one design system:
- `src/ds/ds.css`: colours, type scale, spacing, buttons, header and mega menus, footer, cookie notice, and the styles for each redesigned page.
- `src/ds/ui.tsx` and `src/ds/Form.tsx`: shared icons, the auto-play and reveal helpers, and the form fields used by Contact, Partners and Careers.
- `src/components/navMenus.ts`: what each main-menu dropdown shows. Edit labels, descriptions and links there.
- Fonts: Poppins (headings) and Inter (text), loaded from Google Fonts as before.
- Resources has three parts: **Documentation** (`/resources/docs`, one manual per product, read chapter by chapter), **FAQs** (`/resources/faqs`, grouped by product) and **Training** (`/resources/training`). Old addresses such as `/resources/get-started` lead to the matching new page.
- Admin → Resources: articles (with a chapter number for the reading order), FAQs, training material, learning path levels, insights and the landing-page text. The savings calculator is under Admin → Pricing.

Social links (LinkedIn, X, Facebook, Instagram, YouTube, WhatsApp) are set in **/admin → Site → Company details, contacts and social links**. An icon only shows in the footer when its link is filled in.

`npm run preview:file` builds a single-file preview of the site (for review only; it is not part of the deployment).

## Company information

The company name, CIN, address, phones, emails and social links live in the CMS under **Site settings** (defaults in the design file `About.dc.html`). The footer, the Contact and About pages, the sign-up consent text and the legal pages all read from it.

---

## Deploy to Hostinger (first time)

You need a Hostinger plan that runs **Node.js web apps** (Business or Cloud web hosting).

### 1. Create the database
hPanel → **Websites → your site → Databases → MySQL Databases**. Create a database and a user with a strong password.
Write down the **database name**, **user name** and **password** (Hostinger adds a prefix such as `u123456789_`; use the full names).
You don't need to create any tables: the server creates them the first time it starts. (You can also import `server/schema.sql` in phpMyAdmin.)

### 2. Create the Node.js app
hPanel → **Websites → Add website → Node.js Apps**. Choose one:
- **Upload your website files:** upload a `.zip` of this folder **without** `node_modules` (and without `.env`).
- **Import Git repository:** connect GitHub and choose the repository and branch.

Check the build settings Hostinger detects:
- Framework preset: **Express**
- Node.js version: **20.x** or **22.x**
- Root directory: the folder containing this README
- Entry file: `server.js`
- Build command: `npm run build`
- Start command: `npm start` (if asked)

### 3. Add the environment variables
In the same screen (or later under the app's **Environment variables**), add:

| Name | Value |
|---|---|
| `DB_HOST` | `localhost` (if that doesn't connect, use the MySQL host shown on the MySQL Databases page) |
| `DB_PORT` | `3306` |
| `DB_NAME` | the full database name from step 1 |
| `DB_USER` | the full user name from step 1 |
| `DB_PASSWORD` | the user's password |
| `JWT_SECRET` | a random string of at least 32 characters |
| `ADMIN_SETUP_TOKEN` | a random string of at least 16 characters (used once, to create the first admin) |

Generate random values with: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

Then **Deploy**. Hostinger installs the packages, runs the build and starts the app. If the build fails, open the app's **Deployments** and read the build log.

### 4. Connect your domain and HTTPS
Point `oneofficeautomation.com` at the app (when you create it, or later under the website's **Domains**), and make sure **SSL** is on (hPanel → Security → SSL). Sign-in cookies are HTTPS-only, so signing in only works over `https://`.

### 5. Check it
- `https://your-domain/api/health` should return `{"ok":true}`.
- Open `https://your-domain/admin` and create the first admin with your `ADMIN_SETUP_TOKEN`.
- Create an account at `/signup`, then sign out and sign in again.

**Updating the site later:** upload a new zip (or push to GitHub, if you connected it) and redeploy. Database content (admins, edits, submissions, customers) is kept.

**Where things go wrong:** if pages load but sign-in and forms say "Something went wrong", the database settings are usually wrong. The app's runtime log then shows *Could not connect to the database*.

---

## Using Visual Studio Code

1. Install **Node.js 20+** (nodejs.org) and **Visual Studio Code** (code.visualstudio.com).
2. Unzip the project, then in VS Code choose **File → Open Folder…** and pick the `oneofficeautomation` folder. Click **Yes, I trust the authors** if asked.
3. Open the terminal (**Terminal → New Terminal**) and run:
   ```
   npm install
   npm run local
   ```
   `npm run local` creates the `.env` settings file, builds the site and starts it. When the terminal says it is ready, open **http://localhost:3000**. (Press Ctrl+C to stop.) You need a local MySQL first; see the next section.
4. Prefer menus? Use **Terminal → Run Build Task…** (Ctrl+Shift+B) to start the site, or **Terminal → Run Task…** for the other tasks (install, live reload, type check).
5. Press **F5** and choose "Open the admin in Chrome" to open the admin in Chrome.
6. Where things are: pages in `src/pages`, admin screens in `src/admin`, editable content definitions in `src/cms/registry.ts`, the server and API in `server/`, database tables in `server/schema.sql`.

If Windows PowerShell blocks `npm`, run the commands in **Command Prompt** instead, or run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

## Run locally (test everything on your computer first)

You need **Node.js 20 or newer** (check with `node -v`) and a **MySQL or MariaDB** server on your computer (for example from mysql.com, mariadb.org, XAMPP or Docker).

```bash
# 1. In the project folder
npm install

# 2. Create a local database and user (in the MySQL command line, or phpMyAdmin if you use XAMPP)
#    CREATE DATABASE ooa CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
#    CREATE USER 'ooa'@'localhost' IDENTIFIED BY 'ooa-local-pass';
#    GRANT ALL ON ooa.* TO 'ooa'@'localhost';

# 3. Local settings (Windows: copy .env.example .env). Change the DB_ lines if your database is different.
cp .env.example .env

# 4. Build the site and start it, together with the API. The tables are created automatically.
npm run local
```

The first time `npm run local` starts with an empty database, it adds sample data and prints a login for every role (Admin, Editor, Sales, Partner manager, Recruiter, Viewer, a customer and a partner portal user). The logins are listed in `SAMPLE-LOGINS.md`. To start again from scratch: stop the site, run `npm run local:fresh` (it only ever empties a database on this computer), then `npm run local`.

**Windows (PowerShell):** `powershell -ExecutionPolicy Bypass -File .\scripts\windows\start-site.ps1` frees the port, sets it in `.env` and starts the site (`-Port 3000` to choose the port, `-Fresh` to empty the local database first). `stop-port.ps1` and `find-port-owner.ps1` are next to it.

**One command for everyday use:** `npm run restart` stops whatever is using the site's port (the `PORT` in `.env`, or 3000), then builds and starts the site. `npm run restart -- --fresh` also empties the local database first, so the sample users are created again. `npm run stop` only stops it.

Then open **http://localhost:3000**.

**Try the admin**
1. Open http://localhost:3000/admin. You are taken to the setup screen.
2. Setup token: `local-setup-token-1234567890` (from `.env`). Enter your name, an email and a password (10+ characters with a letter and a number).
3. Edit something (for example Pricing → Pricing plans → change a price), press **Save changes**, then open http://localhost:3000/pricing in another tab. The change is there.
4. Submit the demo form on http://localhost:3000/contact and watch it arrive in **Admin → Inbox**.

**Good to know**
- Forgot the admin password, or `/admin` asks you to sign in before you created an admin? Run `npm run admin:reset`. It removes the admin accounts (nothing else), so the setup screen appears again.
- Local data (admins, edits, form submissions, customer accounts) is stored in your local MySQL database. To start fresh, drop and recreate the database; the tables are created again on the next start.
- After you change code, press Ctrl+C and run `npm run local` again (it rebuilds the site).
- For faster front-end work, keep `npm run local` running, open a second terminal and run `npm run dev`, then use http://localhost:5173 (it forwards API calls to port 3000).
- Google Fonts need internet access; without it the site still works, in a fallback font.

## API

| Method | Path | Body |
|---|---|---|
| POST | `/api/auth/register` | firstName, lastName, email, company, country, plan, password, acceptTerms |
| POST | `/api/auth/login` | email, password |
| POST | `/api/auth/logout` | `{}` |
| GET | `/api/auth/me` | (returns the signed-in customer or 401) |
| POST | `/api/leads/demo` | fn, ln, em, co, plus optional ph, jt, cs, ii, pr |
| POST | `/api/leads/partner` | pn, pc, pe, pk, plus optional pt, pm |
| POST | `/api/leads/newsletter` | nl |
| POST | `/api/leads/career` | cn, ce, plus optional cph, crole, clink, cmsg |
| GET | `/api/health` | |
| GET | `/api/content` | (all edited content, public) |
| * | `/api/admin/...` | admin only: sign-in, content, inbox, customers, team |

## Security

- Passwords hashed with PBKDF2-SHA256 (Web Crypto, random 16-byte salt, 100,000 iterations). Hashes are never returned by the API.
- Password rule: at least 10 characters with a letter and a number, checked in the browser and on the server.
- Sessions: HMAC-SHA256 signed token in an `HttpOnly; Secure; SameSite=Lax` cookie, valid for 7 days.
- CSRF protection: API POSTs must be JSON, which cross-site forms can't send.
- Rate limits stored in the database: 20 sign-up or sign-in attempts per 15 minutes per IP; 30 form submissions per hour.
- Wrong email and wrong password get the same message and take the same time.
- All queries parameterised; all input validated with Zod.
- Security headers on every page, including a Content Security Policy and HSTS.
- The visitor's IP for rate limiting comes from Hostinger's proxy; only private-network proxies are trusted, so it can't be faked with an `X-Forwarded-For` header (see `TRUST_PROXY` in `.env.example`).

## View sign-ups and leads

Job applications from the Careers page are saved as leads of kind `career` (name, email, role, link to CV and message). Open roles are listed in `src/logic/CareersLogic.ts` (generated from `Careers.dc.html`): edit them there.

Everything is in **/admin** (Inbox and Accounts). For raw data, open hPanel → **Databases → phpMyAdmin**, choose your database and run, for example:
```sql
SELECT first_name, last_name, email, company, plan, created_at FROM customers ORDER BY created_at DESC;
SELECT kind, payload, created_at FROM leads ORDER BY created_at DESC;
```

## Before launch

- [ ] **Password reset and email verification.** Add an email provider (for example Resend, Postmark or SendGrid). "Forgot your password?" currently links to the Contact page.
- [ ] **Notify sales about new leads**, for example by email from the server (`server/api.ts`) or a scheduled export to your CRM.
- [ ] **Lawyer review** of the Privacy policy and Terms of service (edit them in the admin under Legal).
- [ ] **Set your real social profile links** in the admin under Site settings (they currently point to each platform's home page).
- [ ] **Analytics**, loaded only after visitors accept analytics cookies (`localStorage` key `ooa-consent`).
- [ ] **Content to confirm:** customer stories and logos, USD prices and plan features, partner benefits, careers roles, Resources items.
