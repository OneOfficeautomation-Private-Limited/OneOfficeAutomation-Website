# Open items

## Done

- [x] Item 1: private sections hidden from the public content API.
- [x] Phase 0: one source for default content (also fixed the admin's outdated “original” email templates).
- [x] Admin: a small “How to use this page” note on every admin screen. All wording is in `src/admin/help.ts`.

Agreed on 30 October 2026, not yet started. Sizes are rough estimates for one developer.

## 1. Fix first

- [x] **Public content API exposes private settings.** Done: sections marked `private: true` in the registry (community.settings, emails.templates) are never sent by `GET /api/content`. `GET /api/content` (server/api.ts) returns every saved section to anyone, including `community.settings` (the invite link meant only for approved members) and `emails.templates`. Return only the sections public pages need. Small; ship with the security update.

## 2. Decisions and checks before deploying today's update

- [x] Pricing features are now managed in one place: Pricing → comparison table in /admin. Plan cards build their lists from it. Still to decide there: whether email alerts, credential vault, high-availability set-up and onboarding and training are real.
- [x] Vault placement: change the Starter/Business cells of the “Credential vault” row in the comparison table; the cards follow.
- [ ] In /admin, check whether these sections were saved before; saved versions override the new defaults: Home → tabs, Pricing → plans and compare, Resources → hub and calculator, Careers → text.
- [x] Careers tagline tidied.
- [x] Solutions menu item now matches the page heading.
- [ ] Contact card on Home repeats "Talk to an expert…" in its line and first bullet (left as is by choice).
- [ ] Set `SITE_URL` on the server (required since the security update).
- [ ] Careers roles: add a city to each role’s Location (for example “Bengaluru, India”) and, optionally, a “Date posted”, so roles show well in Google’s job listings.
- [ ] Social links in Site settings are placeholders (https://www.linkedin.com/, facebook.com, instagram.com, youtube.com): the footer icons point to those sites’ home pages. Replace them with the company’s own pages, or clear them to hide the icons. Real profile links also appear in the company details search engines read.
- [ ] Media files are stored in the database: check that the hosting MySQL allows packets of at least 6 MB (`max_allowed_packet`; Hostinger’s default is normally higher).
- [ ] Analytics: choose Google Analytics 4 or Plausible in Site settings → Website analytics (off until set).
- [ ] Trust page: confirm the security contact email (used in /.well-known/security.txt) and add any real certifications.
- [ ] Toolkit catalogue: ask the product team for the export in docs/ACTION-CATALOG-FORMAT.md, then import it.
- [ ] Submit https://oneofficeautomation.com/sitemap.xml in Google Search Console and Bing Webmaster Tools after deploying.

## 3. Site-wide CMS plan

| Phase | What | Size |
|---|---|---|
| 0 ✅ | Done. All default content now lives in `src/cms/defaults.generated.json`. `core.defaults.json` (the few sections the main bundle needs) is generated from it by `scripts/sync-defaults.mjs`; `npm run typecheck` fails if it is out of date. | — |
| 1 ✅ | ✅ Editable page framing for 9 pages (Home, Platform, Solutions, Customers, Pricing, Partners, About, Careers, Contact): new “Pages” group in /admin. ✅ Form options (Contact dropdowns, Careers application email, Home search examples and quick picks). ✅ Menus and footer (“Menus and footer” group: top menu, dropdown menus with named icons and automatic industry sections, header buttons, footer columns, buttons and legal links). ✅ SEO (“SEO” group: site-wide defaults and per-page title, description, share image and “hide from search engines”; tags written into each page by the server, including share previews, canonical links and company details on the home page; product documentation titled automatically). ✅ sitemap.xml and robots.txt. ✅ Favicon, phone home-screen icon, PNG logo and a default share image. ✅ Content embedded in each page by the server: no blank wait. **Phase 1 complete.** | — |
| 2 ✅ | ✅ Structured data: company details (home), job postings (/careers, with an optional “Date posted” per role), FAQ data (/resources/faqs, /pricing). ✅ Media library (/admin/media): PNG, JPEG, WebP, GIF and PDF up to 5 MB, stored in the database (survives redeploys, included in backups), checked by contents (no SVG), duplicates reused, alt text, “where used”, delete protection, served at /media/… with long caching. ✅ Image fields with a picker (“Choose…”), and a visual icon picker for every icon field. ✅ Customer logos on story cards. ✅ Customer story pages (/customers/<story>, with optional challenge / what we built / results sections) and job role pages (/careers/<role>, with “Apply for this role” choosing the role in the form); own titles, descriptions and sitemap entries; job postings for Google now sit on each role page. ✅ Industry pages (/solutions/<sector>: use cases, before-and-after example, systems, matching customer stories), linked from the sector explorer, with their own SEO and sitemap entries. Blog post and event pages move to R3 (they need on-site posts and proper events first). **Phase 2 complete.** | — |
| 3 ✅ | Done: “Preview on the website” for unsaved section changes (only the editor sees it); toolkit catalogue (see R4); gated downloads (form, then file; each request a lead in Pipelines → Downloads, for Sales); redirects (SEO → Redirects, permanent or temporary); website analytics (Google Analytics 4 or Plausible, loaded only after consent, with a matching security policy). | — |
| 4 (partly) | ✅ Security and trust page (/trust, editable; certifications hidden until you add real ones) and /.well-known/security.txt. ✅ Webinar hub (/resources/webinars: upcoming webinars and recordings on demand). ❌ **Arabic version not built**: needs professional translation and a right-to-left review (see the note at the end). | — |

## 4. Resources plan

Today: 39 documentation articles are placeholders and publicly visible; 3 FAQs; 0 blog items; 0 events.

### Content work (no code)
- [ ] Hide or remove the 39 placeholder articles until written.
- [ ] Write Get started (6) and Troubleshooting (4) articles first.
- [ ] Add FAQs from recent sales calls and support.
- [ ] Publish a first blog post and a first webinar.

### Build
| Phase | What | Size |
|---|---|---|
| R1 ✅ | Done: Resources library (/admin/library) with one record per item, migration of existing content on first start, statuses (draft, in review, scheduled, published, archived), scheduling, owner, review-by date, order, parent topic, customers-only articles, history with restore, conflict detection, approval that keeps the live version up, summaries-only page data with article text loaded on demand. ✅ Nested topics: sub-topics sit under their parent, indented, in each product’s table of contents. **R1 complete.** | — |
| R2 ✅ | ✅ Article formatting: numbered steps, smaller headings, note/tip/warning boxes, code blocks, tables, images from this site, bold, inline code and links (safe: no raw HTML), with a live preview in the Library. ✅ Full-text search across article text, FAQs, blog, events and training (exact error messages rank first; customers-only text excluded), with “Searches that found nothing” in the Library. ✅ Real article addresses (/resources/docs/<product>/<article>) with their own title, description, canonical link and sitemap entry; old ?ch= links redirect. ✅ Troubleshooting entries (symptom, exact error, versions, environment, cause, fix, article number) and release notes (version, date, what’s new, changes, fixed, known limitations, deprecated), entered as structured fields and shown as formatted articles in Troubleshooting / What’s new and in product documentation; searchable by exact error. **R2 complete.** | — |
| R3 ✅ | Done: blog post pages, event pages (time zones, recordings, event data for Google), “Was this helpful?”, review reminders, embedded YouTube (privacy-enhanced) and Vimeo videos in articles, posts and events, and the monthly product updates email as an export (HTML and plain text, plus the subscriber list) for a newsletter tool. Courses were already linked to the learning path (the Training page’s level buttons). | — |
| R4 ✅ | Done: toolkit catalogue and action reference (/resources/toolkits and one page per toolkit, with inputs, outputs, examples, search across action names, “connectors only”, direct links to each action, SEO and sitemap), imported in /admin → Resources → Toolkit catalogue from one JSON file. Format: docs/ACTION-CATALOG-FORMAT.md (sample: docs/sample-action-catalog.json). **Needs the product team’s export in that format.** | — |

Also from the Automation Anywhere comparison: an "Applies to version" field from day one (version switcher once there's a second release), a standard article layout (breadcrumbs, version badge, updated date, "On this page", prerequisites, steps, result, related topics, feedback, print), and FAQs kept short with a link to the full article, shown on the FAQ page and at the end of each product's docs from the same entries. Verify the comparison against docs.automationanywhere.com; it was made from existing knowledge, not a live check.

### Problems these phases solve
Every visitor downloads all Resources content on every page; two editors saving the same list overwrite each other; lists are capped at 300 items; the admin list has no search or filters; article formatting is limited to headings, bullets and paragraphs; articles have no real addresses; there are no dates, owners or review reminders; search ignores article text, blog and events.

## 5. CMS functional test (30 October 2026): issues found

Tested on a live server with every role. Working: permissions per role, save and publish, add/duplicate/delete/reorder, validation (javascript: links, long text, list limits), typed HTML shown safely, history (newest 30 kept), restore, reset to original, approval workflow, private settings, phone layout, "Open the page" links.

- [x] Leaving a section with unsaved edits through the admin menu, links or the browser Back button now asks first.
- [x] Two people saving the same section: the second is stopped with a message and can load the latest version or save theirs on purpose. A second editor is warned when someone else's change is already waiting.
- [x] Approving a change that's older than the live section now asks first.
- [x] Content publishes, restores, resets and approvals are in the activity log, with readable labels on the dashboard.
- [x] Editors get an email when their change is approved or sent back (with the reason), and see the decision when they open the section. Both emails are editable in Emails.
- [x] 400 KB cap: solved by the Resources library (one record per item; 60 large articles tested).
- [x] Library screen has search and filters (type, status, product, review due).
- [x] Approval banners show a “What changed” table (live vs proposed), for sections and library items.
- [x] Link fields refuse "//other-site" and "/\\other-site".
- [x] Public content is cached for 5 seconds as intended.

## 6. Arabic version (not built)

An Arabic site needs three things that code alone can't provide well: professional translation of every page and email,
a right-to-left layout reviewed by an Arabic reader (menus, forms, numbers and icons all mirror), and a decision on scope
(the whole site, or key pages such as Home, Platform, Solutions and Contact). Machine translation published as-is would
undermine trust with the Qatar audience it is meant for. Recommended next step: choose the scope, get a translation quote,
and then the site can gain a language switch, /ar/ addresses, right-to-left styles and translated CMS fields per language.
