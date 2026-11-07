# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Two applications live in this repository

| | Location | Stack | Package manager |
|---|---|---|---|
| **Desktop app** (the original) | repository root (`src/`, `src-tauri/`) | Tauri 2 + React 19 + SQLite | `npm` (`package-lock.json`) |
| **Web app** (separate, parallel build) | [`web/`](./web) | its own pnpm workspace | `pnpm` (`web/pnpm-lock.yaml`) |

**Everything in this file describes the desktop app only.** The root `package.json` scripts do
not touch `web/`, and `web/` has its own README with its own commands. Changing one does not
change the other. There is also a marketing/docs site under `docs/site/` with its own
`package.json`.

## What the desktop app is

Teacherly is an offline desktop app for teachers to manage classes ("groups"), students,
contacts, attendance, assignments and grades, and to export PDF reports. All data lives in a
local SQLite file in the OS app-data directory — there is no backend server and no sync.

## Commands

These are the complete set of scripts in the root `package.json`:

```bash
npm run dev             # Frontend only — Vite on port 1420 (strict), no Rust backend
npm run build           # tsc (type check, noEmit) + vite build
npm run preview         # Serve the built frontend
npm run tauri <cmd>     # Tauri CLI passthrough, e.g. `npm run tauri dev` / `npm run tauri build`
```

- `npm run tauri dev` is the full dev environment (Rust backend + hot-reloading frontend) and
  requires a Rust toolchain; `npm run dev` and `npm run build` do not.
- `npm run tauri build` produces installers in `src-tauri/target/release/bundle/`.
- Anything calling `invoke()` or `@tauri-apps/plugin-sql` only works under `tauri dev`/`tauri build`,
  not under bare `npm run dev`.

### There are no tests

The desktop app has **no test suite and no lint script** — no test runner is installed and no
`test` or `lint` script exists. `tsc --noEmit` (via `npm run build`) is the only automated
correctness check, and `tsconfig.json` enables `strict`, `noUnusedLocals`, `noUnusedParameters`
and `noFallthroughCasesInSwitch`, so unused variables are hard errors. Verify changes with
`npm run build`. (The `web/` app does have tests; they are not these.)

`scripts/seed.mjs` seeds demo data but has no npm script and hardcodes a macOS app-data path —
run it directly with `node scripts/seed.mjs [--reset]` and expect to edit the path on other
platforms.

CI (`.github/workflows/`) covers the desktop release build (`release.yml`), the `web/` app
(`web-ci.yml`) and the docs site (`deploy-site.yml`). No workflow type-checks the desktop
frontend, so do it locally.

## Architecture

### Routing

`src/App.tsx` does client-side routing with a discriminated-union `Route` type — no router
library. Navigation means calling a setter with a new route object. The variants are keyed by a
`page` field (`"groups"` is the default landing route) and most carry the `Group` and/or
`Student` object directly in the route rather than an id:

`groups`, `group`, `group-edit`, `students`, `student-profile`, `student-info`, `contacts`,
`addresses`, `student-services`, `student-accommodations`, `student-observations`, `visitations`,
`notes`, `courses`, `attendance`, `assignments`, `assignment-detail`, `reports`, `settings`,
`terms-of-service`, `privacy-policy`.

Because route objects carry entities, a page that mutates a `Group`/`Student` usually has to push
a fresh route object for the change to be visible downstream.

### Data layer — raw SQL inline, no ORM

There is no repository or service layer. Each consumer opens the database itself via
`@tauri-apps/plugin-sql` and runs raw SQL:

```ts
import Database from "@tauri-apps/plugin-sql";

const DB_URL = "sqlite:teacherly.db";   // re-declared at the top of each file
// ...
const db = await Database.load(DB_URL);
```

Note the duplication: 23 files each declare their own local `const DB_URL = "sqlite:teacherly.db"`,
and `src/appConfig.ts` exports a `DB_URL` constant that **nothing imports**. So the literal
appears 24 times in `src/`, and all of them must match `CURRENT_DB_URL` in
`src-tauri/src/lib.rs`. Reuse the local constant in the file you are editing rather than inlining
the string again.

SQL lives in three places:

- **`src/hooks/`** — the main pattern, 18 hooks (`useGroups`, `useStudents`, `useContacts`,
  `useAttendance`, `useAssignments`, `useNotes`, `useSchedule`, `useAddresses`,
  `useStudentServices`, `useStudentAccommodations`, `useStudentObservations`, `useVisitations`,
  `useDashboardData`, …). Each loads the DB, runs SQL, sets React state. No caching — every
  mutation re-runs the full fetch.
- **Page components** — `src/pages/GroupPage.tsx`, `StudentsPage.tsx` and
  `AssignmentDetailPage.tsx` query directly instead of going through a hook.
- **`src/reports/fetchGroupReportData.ts` / `fetchStudentReportData.ts`** — the report queries.

`src/types/` holds the TypeScript interfaces mirroring table rows. They are hand-maintained and
not generated, so a schema change means editing the migration *and* the matching type.

### Database schema

Migrations are a `Vec<Migration>` in `src-tauri/src/lib.rs`, currently **30 versions**. They are
append-only and run in order by `tauri-plugin-sql` at startup: to change the schema, add a new
`Migration` with the next version number — never edit an existing one, since users' databases
have already applied it.

The 14 live tables:

| Table | Key relationships |
|---|---|
| `groups` | a class/section — the top-level entity (`name`, `grade`, `school_name`, `start_date`, `end_date`) |
| `students` | → `groups` |
| `contacts` | → `students` (guardians/family; was `family_members`, renamed in v7) |
| `student_addresses` | → `students` |
| `student_notes` | → `students` (`tags` is a serialized string, see `src/types/note.ts`) |
| `student_services` | → `students`, **UNIQUE** — one row per student |
| `student_accommodations` | → `students`, **UNIQUE** — one row per student |
| `student_observations` | → `students`, **UNIQUE** — ~36 `obs_*` boolean flags |
| `visitations` | → `students`, → `contacts` |
| `schedule_periods` | → `groups` (`day_of_week`, `start_time`, `end_time`) |
| `canceled_days` | → `groups`, UNIQUE `(group_id, date)` |
| `attendance_records` | → `schedule_periods`, → `students`; UNIQUE `(schedule_period_id, student_id, date)`; `status` CHECK-constrained to `present`/`absent`/`late`/`early_pickup` |
| `assignments` | → `groups`; references its period by **`period_name` text, not a FK** (changed in v11) |
| `assignment_scores` | → `assignments`, → `students`; UNIQUE `(assignment_id, student_id)`; plus `exempt`, `late`, `note` |

Two things that catch people out: the `student_services` / `student_accommodations` /
`student_observations` tables are one-row-per-student, so writes are upserts rather than inserts;
and `assignments.period_name` is a plain string, so renaming a `schedule_periods` row does not
cascade.

`groups.subject` was dropped in v14 — do not reintroduce it. The database file is `teacherly.db`;
`src-tauri/src/lib.rs` also copies a legacy `tizara.db` forward on first launch if present.

### Rust side

`src-tauri/src/lib.rs` is the whole backend: migrations, plugin registration, and only two
commands — `write_pdf` (base64 → file on disk) and `set_complete` (splash-screen gating; the
window stays hidden until both the frontend and backend report ready). Nearly all app logic is in
the frontend.

### PDF reports

`src/reports/` holds the report layout, built with `@react-pdf/renderer`:

- `PdfDocument.tsx` — page shell, shared `StyleSheet`, header/footer.
- `sections/` — one component per report section (roster, grades, attendance, contacts,
  addresses, services, accommodations, observations, notes).
- `fetchGroupReportData.ts` / `fetchStudentReportData.ts` — the SQL behind the reports.

`src/pages/ReportsPage.tsx` composes the sections, renders to a blob via `pdf(doc).toBlob()`,
base64-encodes it, and hands it to the Rust `write_pdf` command with a path from the Tauri dialog
plugin. The PDF `StyleSheet` is a react-pdf stylesheet — Tailwind classes do not apply inside
`src/reports/`.

## UI layer — read this before touching components

### `@heroui/react` and `lucide-react` are aliased to local shims

HeroUI is **not a dependency** and Lucide is not actually rendered. Both module names are
redirected by matching aliases in `vite.config.ts` and `paths` in `tsconfig.json`:

| Import in source | Actually resolves to |
|---|---|
| `@heroui/react` | `src/lib/heroui-compat.tsx` |
| `lucide-react` | `src/lib/lucide-compat.tsx` (re-exports Hugeicons under Lucide names) |
| `@internationalized/date` | `src/lib/internationalized-date-compat.ts` |

So `import { Modal } from "@heroui/react"` is local code built on the shadcn primitives, and
`import { Pencil } from "lucide-react"` renders a Hugeicons glyph. **If a component or icon name
is missing, add it to the shim** — installing the real package would break the alias. Keep both
the Vite alias and the tsconfig path in sync, or the build and the type check will disagree.

### Actual component stack

- `src/components/ui/` — shadcn components (`style: base-vega`, `iconLibrary: hugeicons`, see
  `components.json`) built on **`@base-ui/react`** primitives, not Radix.
- `@hugeicons/react` + `@hugeicons/core-free-icons` — the real icon library.
- **TailwindCSS v4** via `@tailwindcss/vite`; theme tokens are CSS variables in `src/App.css`.
  There is no `tailwind.config.js`.
- Framer Motion is installed and used sparingly.

New UI should use `src/components/ui/` directly. The `@heroui/react` imports in older pages
(`NotesPage`, `ServicesPage`, `ObservationsPage`, `AccommodationsPage`, `StudentInfoPage`,
`VisitationsPage`, `CoursesPage`, and the policy pages) are a migration leftover, not the target
state.

### Modals

Where the HeroUI-shim `Modal` is still used, `Modal.Body` always gets
`className="flex flex-col gap-4 pb-px overflow-visible"` — the `pb-px` is load-bearing for
rendering. New dialogs should use `src/components/ui/dialog.tsx` instead.

### Theming

`src/App.tsx` owns theme state in `localStorage`: light/dark/system, nine color themes
(`pastel` default, `classic`, `warm`, `lavender`, `forest`, `sunset`, `confetti`, `seaside`,
`storybook`) and three font sizes (`regular`, `large`, `extra-large`). The keys (`app-theme`,
`app-color-theme`, `app-font-size`) are declared in `App.tsx` itself. Preferences are applied to
`<html>` as `light`/`dark` classes plus `data-theme`, `data-color-theme` and `data-font-size`
attributes, which the CSS variables in `src/App.css` key off.

Separately, `src/appConfig.ts` holds the `teacherly-*` storage keys (last group, language,
reports folder, recent commands) and `migrateLegacyAppStorage()`, which copies the app's older
`tizara-*` keys forward on startup.

### Internationalization

All user-facing strings go through `useTranslation()` from `src/i18n/LanguageContext.tsx`, backed
by `src/i18n/translations.ts` (English and Spanish). ~44 files use it. **Never hardcode
user-facing copy** — add a key to `translations.ts` for both languages. `src/reports/` reads
`translations` directly since react-pdf sits outside the React context.

## Conventions

### Soft deletes — never `DELETE FROM`

Every table has `is_deleted INTEGER NOT NULL DEFAULT 0`. There are zero `DELETE FROM` statements
in `src/`, and it should stay that way.

```sql
UPDATE <table> SET is_deleted = 1 WHERE id = ?   -- delete
SELECT ... WHERE is_deleted = 0                  -- every read
```

Omitting `is_deleted = 0` from a read is the single easiest bug to introduce here: deleted rows
reappear. Joins need the filter on **each** joined table, and aggregates (grade averages,
attendance counts) need it too or the numbers silently include deleted records.

### Destructive actions always confirm

Any delete or remove must open `ConfirmModal` (`src/components/ConfirmModal.tsx`) first — never
delete on button press. Props:

```ts
isOpen: boolean; onClose: () => void; onConfirm: () => void | Promise<void>;
title: string; description?: string; confirmLabel?: string;
confirmVariant?: "default" | "destructive";  // defaults to "destructive"
loading?: boolean;
```

It awaits `onConfirm` and then calls `onClose` itself, and it blocks dismissal while `loading`.

### After a mutation

Hooks expose refetch-style functions and re-read after writing. Follow that: mutate, then refetch
through the owning hook rather than patching local state, so soft-deleted rows and recomputed
aggregates stay consistent.

## Project structure

```
src/
  App.tsx           # routing, theme, command palette, app shell
  appConfig.ts      # app name, teacherly-* storage keys, legacy-storage migration
  pages/            # one component per route (+ student-profile/ tabs)
  components/       # shared components; components/ui/ = shadcn primitives
  hooks/            # the data layer — raw SQL per hook
  lib/              # *-compat shims, cn(), formatScore()
  reports/          # react-pdf report layout + report queries
  i18n/             # LanguageContext + translations (en/es)
  types/            # hand-written interfaces mirroring table rows
src-tauri/src/lib.rs  # migrations, plugin registration, write_pdf, set_complete
scripts/seed.mjs      # demo-data seeder (macOS path, no npm script)
web/                  # separate web app — own pnpm workspace and README
docs/site/            # marketing/docs site — own package.json
```
