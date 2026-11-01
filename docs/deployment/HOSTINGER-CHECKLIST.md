# Hostinger deployment checklist (summary of the Technical guide, sections 4 to 7)

1. Hostinger plan with Node.js web apps (Business or Cloud), Node.js 20 or 22.
2. hPanel → Databases → MySQL: create a database and user; note the full names (with the u…_ prefix).
3. Connect this GitHub repository in Hostinger (recommended), or zip the repository WITHOUT node_modules, dist, server-dist and .env.
4. hPanel → Websites → Add website → Node.js Apps: upload the zip; entry file `server.js`, build command `npm run build`, start `npm start`.
5. Environment variables (see `.env.example`): DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD, JWT_SECRET (64+ random characters),
   ADMIN_SETUP_TOKEN (16+), SITE_URL=https://oneofficeautomation.com, and for email SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, MAIL_FROM, NOTIFY_EMAIL.
6. Deploy. Tables are created automatically (`server/schema.sql` is there for reference or a manual import).
7. Connect the domain, switch SSL on, open https://oneofficeautomation.com/api/health → {"ok":true}.
8. Open /admin → create the first admin with the setup token. Add the team on the Team page.
9. Check: email test (Emails sent), company details, analytics, sitemap in Google Search Console.

The sample users in `SAMPLE-LOGINS.md` are for a computer's test copy only; they never exist on the live site.
