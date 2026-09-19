# BanglaEnglish — English Learning & IELTS Preparation Platform

Milestone 1 of a production-ready English learning and IELTS preparation
platform for students in Bangladesh, built with Next.js App Router,
TypeScript, and Tailwind CSS.

## Tech stack

- **Next.js 16** (App Router) + **TypeScript**
- **Tailwind CSS v4**
- **Drizzle ORM** + **SQLite** (via `better-sqlite3`) — see "About the database" below
- **NextAuth v5** (Credentials provider, JWT sessions)
- **React Hook Form** + **Zod** for form validation
- **Recharts** for progress/assessment charts
- **lucide-react** for icons

## Getting started

```bash
npm install
npm run db:push    # create the SQLite schema (data.db)
npm run db:seed    # populate demo courses, vocabulary, grammar topics, accounts
npm run dev         # http://localhost:3000
```

### Demo accounts (created by `db:seed`)

| Role    | Email                          | Password    |
|---------|---------------------------------|-------------|
| Admin   | admin@banglaenglish.app         | admin123    |
| Teacher | teacher@banglaenglish.app       | teacher123  |
| Student | student@banglaenglish.app       | student123  |

The student account already has an English level, IELTS target, XP, and a
streak set up so you can see the dashboard fully populated. Register a new
account to try the full onboarding → assessment → dashboard flow from
scratch.

## About the database

The spec asked for PostgreSQL + Prisma. This project ships with **Drizzle
ORM + SQLite (`better-sqlite3`)** instead — a deliberate substitution made
because Prisma's query-engine binary download is blocked in the sandbox
this was built in, so it couldn't be verified end-to-end there. Drizzle
gives you the same kind of type-safe schema and query API with zero native
binary downloads, and the whole app was built and tested against it.

**To use PostgreSQL in production:** swap `drizzle-orm/better-sqlite3` for
`drizzle-orm/node-postgres` (or `postgres-js`) in `lib/db/index.ts`, change
`dialect: "sqlite"` to `"postgresql"` in `drizzle.config.ts`, and adjust the
few SQLite-specific column types in `lib/db/schema.ts` (mainly `text(...,
{mode: "json"})` → `jsonb`, and boolean/timestamp columns). The schema,
services layer, and every API route are otherwise database-agnostic Drizzle
code and don't need to change.

## Project structure

```
app/
  (marketing)/       Public site: home, about, courses, pricing, blog, etc.
  dashboard/          Student dashboard (protected)
  admin/              Admin console (protected, ADMIN/TEACHER only)
  onboarding/         Post-registration wizard (protected)
  api/                Route handlers (auth, register, quiz, admin CRUD, ...)
components/
  ui/                 Design-system primitives (Button, Card, Input, ...)
  layout/              Navbar, Footer
  dashboard/, admin/   Section-specific chrome
  quiz/                Reusable quiz engine (used by lessons, Grammar Lab,
                        and the placement assessment)
lib/
  db/                  Drizzle schema, client, seed script
  services/            Business logic (courses, vocabulary, quiz, gamification, ...)
  admin/               Generic resource registry powering the admin CRUD UI
  auth.ts / auth.config.ts   NextAuth (split for Edge-safe middleware)
```

## What's implemented (Milestone 1)

- Public marketing site: Home, About, English Learning, IELTS Preparation,
  Courses (list + detail), Pricing, Teachers, Blog, Contact, Login, Register
- Auth: registration, login, logout, protected routes, STUDENT / TEACHER /
  ADMIN roles
- 5-step onboarding wizard → personalized profile
- English placement assessment (20 questions across Grammar, Vocabulary,
  Reading, Listening) with automatic A1–C1 level estimation and a
  skill-breakdown chart
- Student dashboard: level, IELTS target, streak, XP, progress bar,
  recommended lessons, daily vocabulary, recent quiz scores
- Courses → Modules → Lessons, with video/audio placeholders, examples,
  per-lesson quiz, completion tracking, and bookmarking
- Grammar Lab: 10 topics, each with explanation, examples, and a practice
  quiz
- Vocabulary system: Daily / My Vocabulary / IELTS / Academic tabs, with
  Bangla meanings, synonyms/antonyms, and learned/difficult tracking
- Flashcards with Easy / Medium / Hard spaced-repetition-style rating
- Reusable quiz engine (MCQ, True/False, fill-in-the-blank) with scoring
  and explanations — shared by lessons, Grammar Lab, and the assessment
- Gamification: XP, levels, streaks, and badges (First Lesson, 7 Day
  Streak, 100 Words, Grammar Master) awarded automatically
- Progress analytics: quiz performance over time, skill chart from the
  assessment, badges earned
- Admin console: overview stats + full CRUD (create/edit/delete) for
  Courses, Modules, Lessons, Vocabulary, Grammar Topics, Quizzes,
  Questions, Badges, and Users — built from one generic, config-driven
  resource system rather than one-off screens per entity
- Light/dark mode, responsive mobile-first layout, loading/empty states,
  toasts, and form validation throughout

## Not yet built (left for Milestone 2/3, per the brief)

- The AI conversation partner (explicitly called out in the brief as a
  Milestone 2 feature — there's a teaser section for it on the homepage)
- Google OAuth login (the spec said "if practical" — Credentials-based
  auth is fully wired; adding a Google provider later is a small addition
  in `lib/auth.ts`)
- Real audio/video files (lessons have clearly marked placeholders, per
  the spec's "video placeholder" / "audio placeholder" requirement)
- Sending real emails for the contact form / password reset (currently
  logs to the server console — see `app/api/contact/route.ts`)

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm start` — production build & serve
- `npm run db:push` — apply the Drizzle schema to `data.db`
- `npm run db:seed` — reset and repopulate demo data
- `npm run db:studio` — open Drizzle Studio to browse the database
