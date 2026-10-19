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
  (app)/index.tsx       My companies: always shown (also with one company), big card per company with debt summary
  (app)/[firmaId]/index.tsx                 Suppliers list
  (app)/[firmaId]/dobavljac/[id].tsx        Supplier: tabs Debts / Paid
src/components/         Reusable UI (Button, TextField, DateField, BottomSheet, MenuSheet, ConfirmSheet, TopBar, Screen, Toast, SupplierSheet, InvoiceSheet, InvoiceRow…)
  DateField.tsx / DateField.web.tsx   Phone: @react-native-community/datetimepicker · Web: browser <input type="date">
src/lib/supabase.ts     Supabase client
src/lib/auth.tsx        Session context (useAuth), signOut
src/lib/errors.ts       Supabase errors → Bosnian messages
src/lib/types.ts        Row types for DB tables
src/lib/format.ts       Money and date helpers
src/lib/useSupplierInvoices.ts   Supplier + invoices, optimistic mark paid / undo
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
- Every schema change goes into a new file in `supabase/migrations/` (name: `YYYYMMDDHHMMSS_description.sql`, 14 digits).
- **Every constraint gets an explicit, clear name** (e.g. `fakture_iznos_nije_negativan`), never an auto name. `src/lib/errors.ts` (`constraintMessages`) maps names to Bosnian messages; PostgREST only puts the name inside the error message, so `constraintName()` reads the quoted name. Add new names there.

## Conventions
- DB tables/columns in Bosnian snake_case (as above); TypeScript identifiers in English camelCase.
- All UI text in Bosnian.
- Money in KM, 2 decimals, formatted with `bs-BA` locale: `1.234,50 KM`.
- Dates stored as ISO `YYYY-MM-DD`, shown as `DD.MM.YYYY.`
- "Overdue" / "due soon" (≤7 days) is computed in the app, never stored.
- Marking paid sets `placeno = true` and `datum_placanja = today` (LOCAL date, `todayIso()`); undo resets both.
- **`datum_placanja` is never editable — not in any form, now or later.** Agreed with the client: an invoice is marked paid only when it is actually paid, so the payment date is always the day of the tap. Don't add a date picker for it, even if it looks like a missing feature.
- Mark paid / undo is **optimistic** (`src/lib/useSupplierInvoices.ts`): shown immediately, saved in the background; saves for the same invoice run in a queue (last action wins); on failure the row returns to the last DB-confirmed state and an error toast is shown; a reload never overwrites an invoice that is still saving. Deleting is NOT optimistic (waits for the DB, after a confirm sheet).
- `authenticated` has UPDATE only on specific columns. The app changes rows only with `.update()` containing just the allowed columns: never `upsert`, never the whole row.
  - `dobavljaci`: `naziv`, `auto_rok_dana`
  - `fakture`: `dobavljac_id`, `broj`, `iznos`, `datum_unosa`, `rok_placanja`, `placeno`, `datum_placanja`
- Amount input: `parseAmount()` accepts `12,50` and `12.50` (one decimal mark, max 2 decimals); thousands separators are rejected on purpose ("Upiši iznos bez tačke za hiljade, npr. 1234,50").
- Invoice number is trimmed when saved. Same number at the same supplier (ignoring case and outer spaces) → warning "Faktura s ovim brojem već postoji. Ipak dodati?", but it is allowed (no unique constraint in the DB).
- The invoice form sends only `broj`, `iznos`, `datum_unosa`, `rok_placanja` (+ `firma_id`, `dobavljac_id` on insert); never `placeno` / `datum_placanja`. Paid invoices can be edited too; their payment date is only displayed.
- Design follows `docs/pracenje-faktura.html`: same tabs, same checkbox-to-pay, same bottom sheets.
- Never put the Supabase `service_role` / secret key in the app. Only the anon/publishable key, via `.env`.
- Keep it simple: no extra libraries without a reason I agree to. Agreed so far: `@react-native-community/datetimepicker` (date picker on phones, step 4.4).

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
- [x] Phase 4 – Screens (login, companies, suppliers, supplier tabs, forms)
- [ ] Phase 5 – Excel export, APK, Netlify deploy, install on both devices
- [ ] Phase 6 – Test month and fixes

**Now working on:** Phase 5 (not started)
Phase 4 steps: 4.1 login ✅ · 4.2 suppliers ✅ · 4.3 supplier screen (tabs, pay checkbox, undo) ✅ · 4.4 invoice form + invoice menu ✅ · 4.5 was not done separately → its items moved to Phase 5 below

**Phase 5 plan:**
- Excel export (backup + for the accountant).
- Netlify deploy of the web build (`npx expo export -p web`, publish dir `dist`, env vars in Netlify).
- APK with EAS Build (`preview` profile), install on the friend's Android phone and on the boss's iPhone (web, added to home screen).
- **EAS Update:** set it up (`expo-updates`, `eas update:configure`, a channel for the APK's build profile, a `runtimeVersion` policy so an update only reaches APKs with the same native code). Code-only changes (no new native libraries) then reach the Android phone without a new APK. A new native library (like `@react-native-community/datetimepicker`) still needs a new APK.
- **During the test month, updates are published manually**, with one command (e.g. `eas update --channel <channel> --message "…"`), and **only after I have tested the change**. Nothing is published automatically.
- **Later:** a separate `production` branch; pushes to it automatically publish the web (Netlify builds from `production`) and an EAS Update. `main` stays for development.
- Carried over from 4.5: dark-mode polish, loading/error states review, Instrument Sans/Serif fonts (decide), **first real Android test** (A3, A7, Android date dialog).
**Notes:**
- Expo project created (`fakturko`), `reset-project` done, web runs in browser.
- `app.json` web output changed to `"single"`.
- Supabase project `fakturko` created (region: Central EU / Frankfurt).
- Supabase libraries installed, `src/lib/supabase.ts` done, `.env` git-ignored, `.env.example` added.
- Step 4.1 done, manually tested on web and Android (Expo Go):
  - Auth: `src/lib/auth.tsx` (`useAuth`, `signOut` = this device only). Root `_layout.tsx` guards routes with `Stack.Protected`; splash stays until the stored session is read.
  - Errors: always show messages from `src/lib/errors.ts` (`authErrorMessage`, `dataErrorMessage`), matched by `error.code` / error type, message text only as fallback.
  - Theme: `useColors()` (follows system light/dark) + `spacing`, `radius`, `fontSize`, `fonts` from `src/constants/theme.ts`. System fonts for now (Instrument fonts: decide in Phase 5).
  - Shared UI: `Button`, `TextField`. Row types in `src/lib/types.ts`.
- Step 4.2 done, manually tested on web and on **iPhone via Expo Go** (no Android device available). **Not yet verified on Android:** A3 (hardware back button closes an open sheet) and A7 (back button on suppliers list returns to "Moje firme"). Check them on the first Android test (at the latest with the APK in Phase 5).
  - Navigation: "Moje firme" is **always** shown, never auto-enter into the only company (later: "Dodaj firmu" there). Suppliers screen always has a back arrow to "Moje firme". "Odjava" is in the `⋯` menu (`AccountMenu`) on both screens.
  - Suppliers sorted alphabetically (`localeCompare(…, "bs")`). Debt per supplier/company is summed in the app from unpaid invoices (`sumAmounts`, exact to the cent).
  - Screens reload on focus (`useFocusEffect`) and on pull-to-refresh, so data entered by the other user shows up.
  - `Button`: if `onPress` returns a Promise, the button locks itself until it settles (no double saves). Use this for every save/delete button.
  - `BottomSheet`: mount only while open (`{open && <Sheet/>}`), so forms start fresh.
  - After `.update()` / `.delete()` always `.select()` and check that a row came back (RLS blocks silently with 0 rows).
  - Supplier with invoices: the form shows "Dobavljač ima N faktura i ne može se obrisati" instead of "Obriši"; DB error 23503 is the backup.
  - Route params are checked with `isUuid`; an invalid id redirects to "Moje firme".
- Step 4.3 done, manually tested on web (incl. slow 3G, offline save error, invoice deleted by another user), iPhone via Expo Go and Safari on iPhone: real supplier screen — summary cards (Dugovanja / Plaćeno, paid total is all-time for now), tabs with counts, `InvoiceRow` (flags "Kasni N dana" / "Dospijeva danas" / "Dospijeva za N dana" ≤7, red border when overdue), pay checkbox + toast "Poništi" (5 s), invoice `⋯` menu (pay/undo, delete with confirm). "Dodaj fakturu" only showed a "Dolazi uskoro" toast until 4.4.
- Step 4.4 done, manually tested on web, iPhone via Expo Go and Safari on iPhone: `InvoiceSheet` (add/edit, auto due date follows entry date until changed by hand; never moves on its own when editing), duplicate-number warning, "Uredi fakturu" in the invoice `⋯` menu, `DateField`. On iOS the two date fields are stacked (inline calendar needs full width). The iOS calendar closes on date pick, focus on another field, opening the other date field, or a tap on empty space in the sheet (`FormFocus`, provided by `BottomSheet`). Android uses the modal system dialog (closes on pick / Odustani / back) — **not yet verified on a real Android device**, like A3/A7.
- GitHub: private repo `nod1xh/fakturko`, branch `main`, remote `origin`.
- Migrations applied manually in the SQL Editor (no Supabase CLI): `20261008000000_initial_schema.sql` (tables, checks, indexes, grants, RLS) and `20261008000100_move_is_member_to_private.sql`. Verified: RLS on all tables, 10 policies, no anon grants.
- `20261014000000_name_constraints.sql` (renames CHECK/FK constraints, found by table + columns): applied, names verified, `rls_test.sql` 28 × PASS (tests 4a, 6a–6d now also check constraint names).
- Test users (Supabase Auth): `+vlasnik` and `+poslovodja` → Intermezo, `+uljez` → Test kafić (for isolation tests).
- `supabase/seed.sql` (test data) and `supabase/tests/rls_test.sql` (28 RLS/constraint tests, all PASS) are run manually: copy the whole file into SQL Editor → New query, replace the three `v_email_*` placeholders **only in the SQL Editor** (the committed files keep placeholders), nothing selected, Run.
  - `seed.sql` runs once; it refuses to run twice and fails cleanly if an email is missing.
  - `rls_test.sql` changes nothing (savepoints + final ROLLBACK) and returns one result table; every row must be PASS.
- **Run `rls_test.sql` after every new migration.** Update its tests when the schema or RLS changes.
- **Never run `seed.sql` on a database with real client data.** Test data only.
- SQL Editor pitfall: a script with `CREATE TABLE` makes it offer "Run and enable RLS", which appends a statement at the end. Don't create helper tables in test scripts; for migrations always choose to run the query unchanged (our migrations enable RLS themselves).
