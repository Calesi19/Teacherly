# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This App Is

Teacherly is an offline desktop app (Tauri 2 + React 19) for teachers to manage classrooms, students, and family contacts. All data is stored locally in SQLite — no network requests, no backend server.

## Commands

```bash
npm run tauri dev       # Start full dev environment (Rust backend + Vite frontend with hot reload)
npm run tauri build     # Production build → src-tauri/target/release/bundle/
npm run dev             # Frontend only (Vite on port 1420, no Tauri backend)
npm run build           # TypeScript type check + Vite build
```

No test or lint scripts are configured. TypeScript strict mode acts as the primary correctness check.

## Architecture

### Routing

App.tsx uses a discriminated union `Route` type for client-side routing — no router library. Navigation works by calling a setter that changes the current route object. Routes: `classrooms` (default) → `students` → `student-profile` → `family-members`.

### Data Layer

Custom hooks in `src/hooks/` (`useClassrooms`, `useStudents`, `useFamilyMembers`) call SQLite directly via `@tauri-apps/plugin-sql`. The pattern is: load `"sqlite:teacherly.db"`, run raw SQL, set state. No ORM, no caching — every mutation triggers a full refetch.

### Database

Schema migrations live in `src-tauri/src/lib.rs`. Three tables: `classrooms`, `students` (FK → classrooms), `family_members` (FK → students). The DB file lives in the OS app data directory, managed by Tauri.

### Frontend Stack

- **HeroUI v3** — primary component library (`Button`, `Modal`, `Drawer`, `Spinner`, etc.)
- **TailwindCSS v4** — utility styling
- **Lucide React** — icons
- **Framer Motion** — installed but minimal usage

### Project Structure

- `src/pages/` — one file per route
- `src/components/` — reusable UI pieces
- `src/hooks/` — data-fetching hooks (the data layer)
- `src/types/` — TypeScript interfaces matching DB schema
- `src-tauri/src/lib.rs` — Tauri setup, DB migrations, plugin registration

## UI Conventions

### Modals

`Modal.Body` always gets `className="flex flex-col gap-4 pb-px overflow-visible"`. The `pb-px` adds 1px bottom padding required for the modal content to render correctly.

### Destructive Actions

Any delete or remove action **must** open a `ConfirmModal` before executing. Never delete inline on button press. Use the reusable `src/components/ConfirmModal.tsx` component, which accepts `title`, `description`, `confirmLabel`, `onConfirm`, and `onClose` props.

### Soft Deletes

**Never issue `DELETE FROM` SQL statements.** All tables have an `is_deleted INTEGER NOT NULL DEFAULT 0` column. To delete a record, run `UPDATE <table> SET is_deleted = 1 WHERE id = ?`. All `SELECT` queries must include `AND is_deleted = 0` (or `WHERE is_deleted = 0`) to filter out soft-deleted rows. This applies to every table in the schema.
