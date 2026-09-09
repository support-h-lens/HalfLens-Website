# Half Lens CMS connection and independent work directory

Local checkout: `C:\Users\amroa\h-lens-admin-worktree`.
Supabase project: `bvlsyinxjjalucproamx` (Half-lens Website).
Public URL/anon key are in ignored `.env.local`. No password, service key, or session is stored in source code.

## Content ownership

- **أعمال الصفحة الرئيسية** → `website_projects`: existing rich featured projects and case-study pages.
- **كل الأعمال** → `website_archive_works`: independent five-field form (type, title, client, year, HTTP(S) link).
- The existing five directory rows were copied once, not derived from homepage projects at runtime. The five filters now use the exact type chosen by the admin, not keyword guesses.
- New directory records start as drafts. Publish, revert to draft, archive, and owner-only delete are separate row actions. Editing preserves publication state.
- YouTube previews are derived from validated video URLs. Other links retain the HL preview. Links open in a new tab without opener access.
- The legacy fifth work had no supplied video URL. Its existing case-study URL is retained; replace that link in the directory editor when its video is available.

## Access and setup

The three migrations under `supabase/migrations` were applied to the new project using `supabase db push --linked`. The missing CMS base schema, RLS, membership RPC, media bucket policies, and archive schema are included.

`supabase/seed-website.sql` preserved the existing 5 homepage projects, 34 clients, contact channels, and 5 independent archive entries. It is an initial import, not an ongoing synchronization; reruns do not overwrite matching records. Do not rerun it to restore deliberately deleted items without checking intent.

The requested `admin@example.com` account was created in Supabase Auth and explicitly granted active owner membership. Its password was supplied by the user and is not recorded here. Change this temporary email/password before launch; the placeholder email cannot receive password resets.

Anonymous/non-member visitors can read published content, not drafts or memberships. Active viewers can review drafts but cannot write. Editors can create/update/publish; only owners can delete content. Browser clients cannot grant themselves CMS membership. Storage logo operations require an active editor/owner.

## Publishing

The public directory refreshes published archive records from Supabase on page load, including production builds. A successful empty response stays empty. Network failure retains the last build snapshot. Homepage changes and the directory's server-rendered/no-JavaScript/SEO snapshot require a rebuild.

No website deployment, Git push, or publishing-function deployment was performed. Hosting/CI must receive the new public Supabase environment values on the next authorized release. The existing **نشر الموقع** GitHub/Hostinger pipeline is separate and still needs its deployment secrets/function configured for this new Supabase project. It is intentionally not presented as a requirement for directory row publication.

## Checks

- `npm run build`, `npm run lint`, `npm run test:seo`.
- `node scripts/test-archive-content.mjs`: validation, safe links/thumbnail hosts, empty-state semantics, independent data.
- `supabase db query --linked --file supabase/tests/archive-rls.sql --output json`: real PostgreSQL role tests; all temporary fixtures roll back.
- `node scripts/check-work-archive.mjs`: Chromium/Firefox/WebKit, desktop/mobile, all filters, hover fill, keyboard, reduced motion, external links, no-JS snapshot.
- `node scripts/check-archive-cms.mjs`: opt-in integration using `HLENS_TEST_EMAIL` / `HLENS_TEST_PASSWORD` environment variables. Creates exactly one uniquely named QA archive row, checks draft/edit/publication/live filtering/archive/delete and unchanged homepage data, then removes that fixture. No credentials or sessions saved. Also checks five-field desktop/mobile editor and modal keyboard/scroll behavior.

Local development: `http://127.0.0.1:5188/`; production preview: `http://127.0.0.1:5189/`. Admin path `/admin/`; directory path `/work/`.
