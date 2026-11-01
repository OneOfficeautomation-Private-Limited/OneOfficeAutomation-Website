# Sample logins (local testing only)

On your computer, `npm run local` adds these automatically the first time it starts with an empty database.
To start again from scratch in one step: `npm run restart -- --fresh` (stops anything on the site's port, empties the local database, starts the site and adds these users). Everyday restart: `npm run restart`.

**Never use these on the live site.** There, the first admin is created at `/admin/setup` with your own email
and password, and everyone else is added on the Team page.

## Admin area: `http://localhost:3000/admin` (or the PORT in your .env)

| Role | Email | Password | Sees |
| --- | --- | --- | --- |
| Admin | admin@example.com | adminpass123 | Everything, including Team, Settings and approvals |
| Editor | editor@example.com | teampass123 | Website content only |
| Sales | sales@example.com | teampass123 | Demo requests, downloads, newsletter, customers, requests |
| Partner manager | partners@example.com | teampass123 | Partner applications, partners, deal registrations |
| Recruiter | recruiter@example.com | teampass123 | Job applications |
| Viewer | viewer@example.com | teampass123 | Everything except Team, read-only |

## Website accounts

| Account | Email | Password | Where to sign in |
| --- | --- | --- | --- |
| Customer (verified, Starter plan) | customer@example.com | customer123 | `/signin`, then My account |
| Customer (not verified yet) | trial@example.com | customer123 | `/signin` |
| Partner portal (active partner, Doha Digital) | partner@example.com | partnerpass1 | `/partner/login` |

The sample data also includes demo requests, partner and job applications, a gated download, customer requests,
a change waiting for approval, library articles, events, media and the sample toolkit catalogue.
