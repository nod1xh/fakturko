# Fakturko

Mobile + web app for tracking supplier invoices (what we owe, what's paid) for restaurants and cafés.
First client: **Intermezo** (a restaurant). Built for one client now, but the database is multi-company from day one.
Full plan: `docs/intermezo-plan.md` — read it before larger changes.

## Users
- **Owner's friend** – enters invoices daily on Android (installed APK).
- **Boss** – enters invoices and checks debts on iPhone/laptop via the web version (added to home screen).
- Both share the same company data, so entering an invoice must be equally fast on Android and web.

## Working with me
- I'm a beginner. Explain step by step, say which file to open and where to run each command.
- Edit files directly. Before changes, briefly tell me the plan and wait for my OK. After changes, explain what you did and how I can test it.
- I develop on **Windows** with VS Code (PowerShell terminal).
- Talk to me in Bosnian; code, comments and commits in English.
- Never ask me for or read the real values in `.env`. I fill that file in myself.

## Stack
- **Expo (React Native) + TypeScript + Expo Router** – one codebase for Android and web.
- **Supabase** – Postgres, Auth (email + password), RLS. No custom server: the app talks to Supabase directly via `supabase-js`.
- **EAS Build** – Android APK. **Netlify** – hosts the web build, auto-deploys on push to `main` (GitHub).
- All on free plans during testing. Free Supabase pauses after 7 days idle and has no backups.
- Web is a single-page app: `app.json` → `web.output` is `"single"` (not `"static"`), because Supabase auth needs the browser. Don't change it back.

## Folder structure
App code lives in `src/`; import with the `@/` alias (`@/lib/supabase`).
```
src/app/                Expo Router screens (file = route)
  (auth)/login.tsx      Login
  (app)/index.tsx       My companies (auto-enter if only one)
  (app)/[firmaId]/index.tsx                 Suppliers list
  (app)/[firmaId]/dobavljac/[id].tsx        Supplier: tabs Debts / Paid
src/components/         Reusable UI (InvoiceRow, SupplierSheet, Toast…)
src/lib/supabase.ts     Supabase client
src/lib/format.ts       Money and date helpers
src/constants/theme.ts  Colors, fonts, spacing
supabase/migrations/    SQL for tables + RLS (source of truth for the DB)
supabase/seed.sql       Test data (test DB only)
supabase/tests/rls_test.sql   RLS + constraint tests (run after every migration)
docs/intermezo-plan.md  Detailed plan
docs/pracenje-faktura.html   Original HTML prototype (design reference)
```

## Database (Supabase)
Invoices belong to a **company**, not a user. Users see companies through memberships.

| Table | Key columns |
|---|---|
| `auth.users` | managed by Supabase Auth |
| `firme` | id, naziv, vrsta_objekta |
| `clanstva` | korisnik_id → auth.users, firma_id → firme, uloga (`vlasnik` \| `poslovodja`) |
| `dobavljaci` | id, firma_id, naziv, auto_rok_dana (NULL = due date entered manually) |
| `fakture` | id, firma_id, dobavljac_id, broj, iznos numeric(12,2), datum_unosa date, rok_placanja date, placeno bool, datum_placanja date |

**RLS (enabled on every table, no exceptions):**
- Helper `private.is_member(firma_id)` (security definer, empty `search_path`) checks `clanstva` for `auth.uid()`. It lives in schema `private`, which is not exposed via the Data API, so it can't be called as an RPC.
- `firme`: select only if `is_member(id)`.
- `clanstva`: select own rows (`korisnik_id = auth.uid()`). No inserts from the app yet (members added manually in SQL).
- `dobavljaci`, `fakture`: select/insert/update/delete only if `is_member(firma_id)`.
- Every schema change goes into a new file in `supabase/migrations/`.

## Conventions
- DB tables/columns in Bosnian snake_case (as above); TypeScript identifiers in English camelCase.
- All UI text in Bosnian.
- Money in KM, 2 decimals, formatted with `bs-BA` locale: `1.234,50 KM`.
- Dates stored as ISO `YYYY-MM-DD`, shown as `DD.MM.YYYY.`
- "Overdue" / "due soon" (≤7 days) is computed in the app, never stored.
- Marking paid sets `placeno = true` and `datum_placanja = today`; undo resets both.
- `authenticated` has UPDATE only on specific columns. The app changes rows only with `.update()` containing just the allowed columns: never `upsert`, never the whole row.
  - `dobavljaci`: `naziv`, `auto_rok_dana`
  - `fakture`: `dobavljac_id`, `broj`, `iznos`, `datum_unosa`, `rok_placanja`, `placeno`, `datum_placanja`
- Design follows `docs/pracenje-faktura.html`: same tabs, same checkbox-to-pay, same bottom sheets.
- Never put the Supabase `service_role` / secret key in the app. Only the anon/publishable key, via `.env`.
- Keep it simple: no extra libraries without a reason I agree to.

## Environment
`.env` (not committed, must be in `.gitignore`; `.env.example` with empty values is committed):
```
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```
The key can be the new publishable key (`sb_publishable_...`) or the legacy anon key; both work.
Same two variables are set in Netlify and in EAS (`eas env`).
After changing `.env`, restart with `npx expo start --clear`.

## Commands
```
npm install                     Install dependencies
npx expo install <package>      Add a library (picks versions compatible with our Expo SDK)
npx expo start                  Dev server (press a = Android, w = web)
npx expo start --web            Web only
npx expo export -p web          Web build → dist/  (Netlify: publish dir `dist`)
eas build -p android --profile preview    APK (preview profile has "buildType": "apk")
```

## Current status
_Update as we go._

- [x] Phase 1 – Preparation (accounts: GitHub, Expo, Supabase, Netlify; questions for client)
- [x] Phase 2 – Project setup (Expo + web, Supabase connected, GitHub repo)
- [x] Phase 3 – Database (tables, RLS, test companies + 3 test users, RLS tests)
- [ ] Phase 4 – Screens (login, companies, suppliers, supplier tabs, forms)
- [ ] Phase 5 – Excel export, APK, Netlify deploy, install on both devices
- [ ] Phase 6 – Test month and fixes

**Now working on:** Phase 4
**Notes:**
- Expo project created (`fakturko`), `reset-project` done, web runs in browser.
- `app.json` web output changed to `"single"`.
- Supabase project `fakturko` created (region: Central EU / Frankfurt).
- Supabase libraries installed, `src/lib/supabase.ts` done, `.env` git-ignored, `.env.example` added.
- Connection test passed (green). `src/app/index.tsx` is still a TEMPORARY test screen (expected PGRST205; now that tables exist and anon has no access, it gets a permission error instead). Replace in Phase 4.
- GitHub: private repo `nod1xh/fakturko`, branch `main`, remote `origin`.
- Migrations applied manually in the SQL Editor (no Supabase CLI): `20261008000000_initial_schema.sql` (tables, checks, indexes, grants, RLS) and `20261008000100_move_is_member_to_private.sql`. Verified: RLS on all tables, 10 policies, no anon grants.
- Test users (Supabase Auth): `+vlasnik` and `+poslovodja` → Intermezo, `+uljez` → Test kafić (for isolation tests).
- `supabase/seed.sql` (test data) and `supabase/tests/rls_test.sql` (28 RLS/constraint tests, all PASS) are run manually: copy the whole file into SQL Editor → New query, replace the three `v_email_*` placeholders **only in the SQL Editor** (the committed files keep placeholders), nothing selected, Run.
  - `seed.sql` runs once; it refuses to run twice and fails cleanly if an email is missing.
  - `rls_test.sql` changes nothing (savepoints + final ROLLBACK) and returns one result table; every row must be PASS.
- **Run `rls_test.sql` after every new migration.** Update its tests when the schema or RLS changes.
- **Never run `seed.sql` on a database with real client data.** Test data only.
- SQL Editor pitfall: a script with `CREATE TABLE` makes it offer "Run and enable RLS", which appends a statement at the end. Don't create helper tables in test scripts; for migrations always choose to run the query unchanged (our migrations enable RLS themselves).
