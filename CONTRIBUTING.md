# Contributing

Thanks for helping build the OneOfficeAutomation website. This guide covers how the code is organised and how to get a change merged.

## 1. Set up

Requirements: **Node.js 20+** (see `.nvmrc`) and a local **MySQL / MariaDB** (XAMPP, Docker or a native install).

```bash
git clone <this repo>
cd oneofficeautomation-website
npm ci
# Create the local database once (see README → "Run locally"), then:
npm run local          # creates .env, builds, starts site + API, adds sample data on first run
npm run dev            # optional: front-end live reload (keep `npm run local` running)
```

Windows users can also use `scripts/windows/start-site.ps1` (see `scripts/windows/README.md`).
Sample logins for every role are in `SAMPLE-LOGINS.md` (local only, never on the live site).

## 2. Project structure

```
.
├── src/                      Front end (React 18 + TypeScript + Vite)
│   ├── App.tsx, main.tsx     Routes and entry point
│   ├── pages/                Public pages, one file per page
│   │   ├── auth/             Sign up, sign in, password recovery, My account
│   │   ├── partner/          Partner portal
│   │   ├── resources/        Docs, blog, events, FAQs, training, toolkits, support
│   │   └── public/           Small public pages (unsubscribe, status links…)
│   ├── logic/                Page logic/hooks, kept separate from page markup
│   ├── components/           Shared layout: header, footer, nav, cookie banner, analytics
│   ├── ds/                   Design system: tokens (ds.css), form controls, UI primitives
│   ├── ui/                   Generic UI (dialogs)
│   ├── auth/                 Customer session context and route guard
│   ├── cms/                  CMS model: registry.ts (editable sections), defaults, SEO, content context
│   └── admin/                The /admin app: one screen per file (Editor, Library, Pipeline, Team…)
├── server/                   Back end (Node.js + Express, TypeScript, bundled with esbuild)
│   ├── index.ts              Express server: static site, security headers, SEO HTML
│   ├── api.ts                Router for every /api/* request
│   ├── schema.sql            Database tables (created automatically on start)
│   └── _lib/                 One module per domain:
│       ├── admin.ts, adminWorkflow.ts   Admin API, approvals, pipelines, team
│       ├── portal.ts                    Customer self-service and partner portal
│       ├── library.ts, catalog.ts       Resources library and toolkit catalogue
│       ├── media.ts, mail.ts            Media uploads and SMTP email with log
│       ├── seoPage.ts                   Per-page meta tags, sitemap, robots.txt
│       ├── db.ts, http.ts, crypto.ts    Database, HTTP helpers, hashing/sessions
│       └── validation.ts, workflow.ts   Zod schemas, shared workflow rules
├── public/                   Static files served as-is (logos, favicons, OG image)
├── preview/                  Builds the single-file offline site preview
├── scripts/                  Dev tooling: local run, reset, sample data, sync defaults
│   └── windows/              PowerShell helpers (start site, free a port)
├── docs/
│   ├── deployment/           Hostinger checklist
│   ├── manuals/              Manual links, screenshots, offline admin tour and site preview
│   └── ACTION-CATALOG-FORMAT.md + sample-action-catalog.json
├── OPEN-ITEMS.md             Roadmap / outstanding work
└── .github/                  CI workflow, PR and issue templates
```

### Where to make common changes

| I want to… | Edit |
| --- | --- |
| Change a public page's layout | `src/pages/<Page>.tsx` (logic in `src/logic/<Page>Logic.ts`) |
| Make new content editable in /admin | `src/cms/registry.ts` + defaults in `src/cms/defaults.generated.json` |
| Add an admin screen | `src/admin/` and register it in `src/admin/AdminApp.tsx` / `siteMap.ts` |
| Add an API endpoint | Handler in `server/_lib/<domain>.ts`, route in `server/api.ts`, input schema in `validation.ts` |
| Add or change a table | `server/schema.sql` (additive changes only: `CREATE TABLE IF NOT EXISTS`, new nullable columns) |
| Change colours / typography | `src/ds/ds.css` and `src/theme.ts` |

> Most **content** (text, prices, articles, jobs) is edited in `/admin`, not in code. Only change defaults in code when the structure changes.

## 3. Workflow

1. Create an issue (or pick one) so others know you are on it.
2. Branch from `main`: `feature/<short-name>`, `fix/<short-name>` or `docs/<short-name>`.
3. Keep commits small with clear messages, e.g. `feat(admin): add CSV export to Partners`, `fix(server): rate-limit partner login`.
4. Before pushing, run:
   ```bash
   npm run typecheck
   npm run build
   ```
5. Open a pull request into `main` and fill in the template. CI runs the same type check and build; it must be green.
6. At least one review is required before merging. Use **Squash and merge**.

`main` is what gets deployed to Hostinger, so it must always build.

## 4. Rules

- **Never commit secrets.** `.env` is git-ignored; add new settings to `.env.example` with a safe placeholder and document them in the README.
- Don't commit `node_modules/`, `dist/` or `server-dist/`.
- Database changes must be backwards compatible with the live data; never drop or rename columns in place.
- Keep the code style already used: TypeScript strict, 2-space indent, LF line endings (see `.editorconfig`).
- Validate all API input with Zod (`server/_lib/validation.ts`) and check the user's role on admin endpoints.
