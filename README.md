# BanglaEnglish — English Learning & IELTS Preparation Platform

An English learning and IELTS preparation platform for students in Bangladesh,
built with Next.js App Router, TypeScript and Tailwind CSS: courses, IELTS
practice and mock tests, AI feedback, human teacher review, live classes,
community, payments in taka, and an admin console. To put it on a server, read
[DEPLOYMENT.md](DEPLOYMENT.md).

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

## Not built yet

- Password reset and email verification (the email layer is ready for them). Google sign-in exists but needs your Google keys (see DEPLOYMENT.md).
- Built-in video: live classes and 1-on-1 sessions use a meeting link (Jitsi or any other).
- Teacher earnings and payouts.
- Object storage for uploads (local disk today; add an S3/R2 `StorageProvider`).
- A nonce-based script Content-Security-Policy (a conservative policy is in place).
- Shared rate limits and cache across several servers (both are in memory, per process).

## AI features and providers

Writing feedback, speaking feedback and the AI tutor all go through one provider interface (`lib/ai/`). Pick the service in `.env.local` with `AI_PROVIDER`:

| `AI_PROVIDER` | Service | Cost | Key variable |
| --- | --- | --- | --- |
| `gemini` | Google Gemini | free tier | `GEMINI_API_KEY` |
| `groq` | Groq (Llama models) | free tier | `GROQ_API_KEY` |
| `openrouter` | OpenRouter (`:free` models) | free tier | `OPENROUTER_API_KEY` |
| `ollama` | Ollama running on your computer | free | none |
| `custom` | any OpenAI-compatible service | varies | `AI_BASE_URL`, `AI_MODEL`, optional `AI_API_KEY` |
| `anthropic` | Claude | paid (the default if `AI_PROVIDER` is unset) | `ANTHROPIC_API_KEY` |
| `mock` | placeholder text, development only | free | none |

- Set `AI_MODEL` to change the model used by the free providers. Free-tier model names change over time, so update it if a provider reports the model is not found.
- To move to Claude later, set `AI_PROVIDER=anthropic` (and keep `ANTHROPIC_API_KEY`).
- With no key set, the AI features show "unavailable" and the rest of the app works normally. `GET /api/ai/health` (signed in) reports which provider is active and whether it responds.
- Free tiers have rate limits, and some providers may use content sent to their free tier to improve their models. That is fine for development and demos; check the provider's terms before using it with real students' essays or recordings' transcripts.
- Scores from any provider are AI estimates, never official IELTS scores.

## Security, email, uploads and notifications (Milestone 3)

- **Roles:** `lib/security/guards.ts` (`requireUser`, `requireRole`, `requirePageRole`). Teachers can manage content but never accounts or roles; administrator-only pages are hidden from them.
- **CSRF and rate limits:** `proxy.ts` rejects cross-site state-changing API calls. `lib/security/rate-limit.ts` limits registration, login guessing, contact, uploads and AI endpoints (in memory, per server process; swap the store for Redis if you run several servers). Behind a reverse proxy set `TRUST_PROXY=true` so client IPs are read correctly.
- **Audit and error logs:** admin changes, uploads, role changes and announcements are recorded (secrets are stripped) and unexpected errors are saved with keys masked. Read them at `/admin/audit-logs` and `/admin/error-logs`.
- **Email:** `lib/email/`. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` and `EMAIL_FROM` to send real email (works with any SMTP service). With no SMTP settings, emails are stored and shown at `/admin/email-outbox` instead of being sent. `SUPPORT_EMAIL` receives contact-form messages (defaults to the first admin).
- **Uploads:** `lib/storage/` behind a `StorageProvider` interface (local disk today; add an S3/R2 provider later). Files go to `UPLOAD_DIR` (default `./uploads`, keep it on a persistent volume and out of git). The real file type is checked from its bytes; SVG, HTML and executables are refused; files are served through `/api/files/<id>` with access checks and range support.
- **Notifications:** in-app bell and centre for every student, optional email copies (each student can turn email off), and admin announcements at `/admin/notifications`.
- `APP_URL` sets the site address used in email links. `RATE_LIMIT_DISABLED=true` switches limits off for automated tests (ignored in production).

## Plans, pricing and access (Milestone 3)

- **Four plans** (FREE, BASIC, PREMIUM, PRO) live in the database and are edited at `/admin/plans`: names, prices in taka, the features each plan unlocks, marketing bullets and daily limits. The public `/pricing` page and every locked screen read from there.
- **Enforcement:** `lib/services/plans.ts` (`getEntitlements`, `hasFeature`, `canAccessCourse`) plus `lib/plans/gate.ts` (`requireFeature`, `denyUnlessFeature` return HTTP 402; pages show `UpgradeWall`). Feature keys are in `lib/plans/features.ts`. Teachers and admins can open everything.
- **Free-plan limits** (new vocabulary words and quizzes per day) reset at midnight in Dhaka.
- **Courses** have a "cheapest plan that includes it" setting in the course admin.
- **Subscriptions:** `/admin/subscriptions` grants, extends and ends plans. Plans end on their own; students get a reminder three days before and a notice when it ends. Until online payments are switched on, the Upgrade buttons lead to the contact form pre-filled with the plan (`lib/plans/checkout.ts`).
- Existing installs: every account without a subscription is on the Free plan. Grant the plans your current students should keep from `/admin/subscriptions`.

## Payments and coupons (Milestone 3)

Payments never complete on the student's say-so. A plan starts only when an admin approves a reported payment, or when a payment provider's own verified callback confirms it.

- **Manual payments (work today, no merchant account needed):** the student picks bKash, Nagad, Rocket or bank transfer, sends the money to an account you set up under **Admin → Payment accounts**, then reports the transaction ID and their number. You check it against your statement at **Admin → Payments** and approve or reject (with a reason). A wallet transaction ID can be used only once. Unreported payments close after 24 hours. **The seeded demo accounts are fake: replace them before you go live.**
- **Statuses:** PENDING → PROCESSING → COMPLETED, or FAILED. A completed payment can become REFUNDED (this ends the plan; you return the money yourself). Only these moves are allowed, so a repeated or forged callback can't revive a failed payment.
- **Cards and gateways:** `lib/payments/` has a `PaymentProvider` interface. `sslcommerz` (cards) turns on when `SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASSWORD` are set (`SSLCOMMERZ_SANDBOX=false` for live). It was built from the public API description and tested against a stand-in server: run a sandbox payment before going live. Its callback is only trusted after SSLCommerz's validation API confirms it.
- **Signed callbacks:** any gateway or bridge can report payments to `POST /api/webhooks/payments/signed` with `x-timestamp` (unix seconds) and `x-signature` = hex HMAC-SHA256 of `<timestamp>.<raw body>` using `PAYMENT_WEBHOOK_SECRET` (16+ characters). Body: `{"eventId","type":"payment.succeeded|payment.failed|payment.refunded","reference":"<transaction id>","amount","currency"}`. Requests older than 5 minutes are refused, each `eventId` is applied once, and the amount and currency must match.
- **Coupons** (**Admin → Coupons**): percentage or fixed discount, optional cap, minimum purchase, start and end dates, total and per-student limits, plan-specific and course-specific (works only when checkout starts from that course). A coupon is held while a payment is open and released if it fails or is cancelled. A 100% coupon activates the plan at once and is recorded as "Free with coupon".
- Buying a lower plan than the one you have is blocked; paying for the same plan adds days; a higher plan replaces the current one straight away.
- Environment variables are read on the server only and are never sent to the browser.

## Teacher area (Milestone 3)

Teachers have their own console at `/teacher` (administrators are sent to `/admin` instead, and teachers who open `/admin` are sent to `/teacher`).

- **Own content only:** a teacher creates courses, modules, lessons, lesson quizzes and quiz questions, and can only see or change those in **their own courses** (`lib/services/teacher-content.ts`, API under `/api/teacher/*`). The generic `/api/admin/*` routes refuse teachers for this content, so it can't be used to reach another teacher's work. Teachers can't set which plan a course needs (it starts at Basic; an admin can change it), and lesson XP is capped at 100.
- **Shared library:** IELTS questions, reading passages, listening tests and sections, writing and speaking prompts, mock tests, vocabulary and grammar topics belong to the platform, so any teacher can add to them (as before). Uploads (video, audio, images, PDFs) work from every content form.
- **Batches:** a teacher makes batches (name, optional course, capacity, dates) and adds existing student accounts by email; the student is notified. Adding by email is rate-limited because it reveals whether an address is a student account.
- **Students:** a teacher's students are the members of their batches plus the students enrolled in their courses. They see those students' course progress, quiz results and assignment grades, and nobody else's (other ids give a 404).
- **Assignments:** for a batch or for everyone enrolled in a course, with instructions, an optional attachment, a due date (whole days in Dhaka time) and a maximum score. Publishing notifies the audience once. Students hand in text and an optional link (students can't upload files) and can edit until it is graded. The teacher scores and comments; the student is notified (with an email copy). Once work is submitted, the audience and maximum score are locked.
- **Analytics:** course enrolment, completion and quiz averages, assignment submission rates and average scores, and how many students studied recently. Scores here are the teacher's own grades; IELTS bands elsewhere on the platform are estimates.
- Teacher earnings or revenue share are not built: there is no teacher payout model yet. Writing and speaking review (with AI feedback beside the teacher's) and live classes are the next phases and will appear in this console.

## Human writing and speaking review (Milestone 3)

Both features are on the **Pro** plan (`TEACHER_FEEDBACK` and `ONE_ON_ONE`, editable in Admin → Plans). The seeded demo student is on Pro so they can be tried. Everything a teacher scores is labelled as the teacher's own estimate, never an official IELTS result.

- **Writing review:** on a submitted essay's result page a Pro student can ask a teacher to review it (with an optional note; at most 3 open requests at a time, one live review per essay). Requests wait in a shared queue at `/teacher/reviews`. A teacher picks one up (only one teacher can win a request), reads the question and essay beside the AI feedback, and writes a band estimate, feedback on task response, coherence, vocabulary and grammar, and overall comments. Teachers see the essay text only after picking a request up. They can put an unfinished review back in the queue (their draft is discarded). The student sees the teacher's feedback above the AI feedback on the same page, gets a notification and an email, and can withdraw a request nobody has picked up. A finished review can be corrected by the same teacher.
- **1-on-1 speaking:** teachers publish time slots at `/teacher/sessions` (typed in Bangladesh time; 15, 20, 30 or 45 minutes; a meeting link is required; a teacher's slots can't overlap). Pro students book an open slot at `/dashboard/speaking-sessions` (at least 2 hours ahead, at most 2 upcoming sessions, no overlapping bookings). Booking is atomic, so two students clicking the same slot can't both get it. A student can cancel up to 2 hours before the start (the slot reopens); a teacher can cancel any open or booked session (the student is told, with the reason). The teacher can start a session from 10 minutes before it begins, keeps private notes, scores fluency, lexical resource, grammar and pronunciation plus an overall band (a suggested average is offered, rounded the IELTS way), and writes feedback for the student. A teacher can mark a no-show 10 minutes after the start. Students never see the private notes, and only the booking student sees the meeting link.
- **Live video is not built in:** a session is a meeting link (Zoom, Meet...). There is no reminder yet; session reminders arrive with live classes.
- A teacher's students now also include students whose writing they reviewed or whom they taught in a session.
- Cancelled requests and sessions stay Pro-only to create, but any student can cancel their own, even after their plan lapses, and can always read past feedback.

## Live classes (Milestone 3)

- Teachers schedule classes at `/teacher/classes` for a batch or for everyone enrolled in a course (times typed in Bangladesh time, 15 minutes to 4 hours). A teacher can't double-book themselves. Students see their classes at `/dashboard/classes` (Pro plan feature `LIVE_CLASSES`).
- **Meetings** go through a `MeetingProvider` interface (`lib/meetings/provider.ts`): `MANUAL` (paste a Zoom/Meet link) or `JITSI` (a room is made from the class id on `JITSI_BASE_URL`, default meet.jit.si). Add another provider by implementing the interface.
- **Joining** opens 10 minutes before the start until 30 minutes after the end; joining more than 10 minutes late is recorded as LATE. The link is only sent to the audience, inside that window. Teachers mark attendance afterwards, add materials (links or uploads) and a recording link.
- **Reminders** (24 hours and 1 hour before) are claimed atomically so each is sent once. They go out when people use the site, and on time if you call the cron endpoint (see DEPLOYMENT.md, "Scheduled jobs").

## Community and speaking rooms (Milestone 3)

- **Community** at `/dashboard/community`: posts and questions in the categories English, IELTS, Speaking, Writing, Study Abroad and Career (editable in Admin → Community categories), with tags, comments, likes, accepted answers, search and sorting. Teachers show a "Verified teacher" badge, administrators "Moderator". Names appear as "First L." Content is shown as text only, so markup can't run.
- **Moderation:** any member can report a post or comment; three different reporters hide it automatically until an admin reviews it at `/admin/community` (hide, restore, dismiss, delete), pin posts, or ban a member from posting. Posts that look like spam (repeated links, shouting) are refused.
- **Speaking rooms** at `/dashboard/rooms`: scheduled practice sessions of type Beginner, Intermediate, Advanced, IELTS Speaking, Debate or Job Interview, with a capacity. Joining is atomic (two students can't take the last seat), the meeting link is shown only to members inside the time window, and if the host leaves the room is cancelled and members are told.

## Referrals, challenges, leaderboards and certificates (Milestone 3)

- **Referrals** (`/dashboard/referrals`): each student has a private link (`/r/<code>`). A click is remembered in a cookie; when the friend registers and **later completes their first paid plan** the referrer gets 7 free days (up to 12 rewards). No reward for staff accounts, free coupons or self-referrals. Admins see the funnel at `/admin/referrals`.
- **Challenges** (`/dashboard/challenges`): daily and weekly goals worked out from real activity (lessons, quizzes, words, practice, essays, speaking), with points awarded once each. **Leaderboards** are private by default: names show as "Anonymous learner" until the student chooses to show their name or hide themselves.
- **Certificates** (`/dashboard/certificates`): issued automatically when a course is completed, with a long unguessable code. Anyone can check one at `/verify/<code>` (not indexed by search engines, rate limited). Admins can revoke or restore a certificate at `/admin/certificates`; a revoked certificate says so on the public page.

## Study abroad, resources and search (Milestone 3)

- **Study abroad** (`/study-abroad`): Canada, Australia, the UK, the USA, Ireland, Germany and New Zealand, each with universities, IELTS and general English requirements, application checklist, scholarships, visa links, costs and intakes. **This is general guidance, not legal or immigration advice**; every figure and link is editable in **Admin → Study countries**, and you should review them before launch.
- **Resources** (`/resources`): guides, links and videos, free or premium (locked ones hide their address). **Blog** posts can be drafted and published from the admin.
- **Search** (`/search`): courses, lessons, vocabulary, IELTS questions, blog posts and community posts, with type filters and Bangla-aware matching. Answers and explanations are never searched, so search can't be used to look up answers.

## Admin analytics (Milestone 3)

`/admin/analytics` (administrators only): total, active, new and premium students, enrolments, net revenue (payments minus refunds, in taka), mock tests, AI sessions, writing submissions, AI speaking sessions and teacher activity, each compared with the previous period (7, 30 or 90 days, Bangladesh time). Charts show daily and monthly users, revenue, enrolments, popular courses and learning activity; every chart has a "View as a table" version, and CSV exports are available (formula-safe, audited). Figures are cached for a minute. "Active" means the student did something that day.

## SEO and speed (Milestone 3)

- **Search engines:** `/sitemap.xml` (published courses, blog posts and countries, generated from the database) and `/robots.txt` (private areas, APIs and share links are excluded); page titles, descriptions, canonical addresses and Open Graph/Twitter tags on public pages; structured data (Organization and WebSite on the home page, Course, BlogPosting with breadcrumbs, and Article for country guides); clean readable URLs (`/courses/<slug>`, `/blog/<slug>`, `/study-abroad/<country>`). Login, search and certificate-check pages are not indexed. Set `APP_URL` to your real domain so these use it. There is no preview image yet, so shared links show text only.
- **Honest numbers:** the home page shows real counts (students, courses, lessons, teachers), not invented statistics. Contact details on `/contact` come from `SUPPORT_EMAIL`, `SUPPORT_PHONE` and `SUPPORT_ADDRESS`; anything you leave blank is hidden.
- **Speed:** pages render on the server; database indexes on every frequently filtered column; the blog is paginated; images below the fold load lazily; audio and practice media are cacheable; responses are compressed; the analytics and public statistics are cached briefly.

## Testing

There is no committed test suite yet. Behaviour was verified in each phase with throw-away scripts that ran the real services against a fresh seed and drove the site in a browser (desktop and 390 px phone width). The scenarios, if you want to repeat them by hand or turn them into a suite:

1. Register, log in, onboarding; role redirects and blocked pages for each role.
2. Enrol, complete lessons, take quizzes; certificate issue and public verification.
3. IELTS listening, reading, writing, speaking and a full mock test; AI tutor and feedback (or the "unavailable" message).
4. Plans and feature locks; subscription end and reminders.
5. Manual payment: report, approve, reject, refund; coupons (limits, per-student, plan and course rules); the signed webhook (bad signature, replay, wrong amount).
6. Referral click, registration, first purchase reward; challenges and leaderboard privacy.
7. Teacher: own content only, batches, assignments, review queue, 1-on-1 slots, classes and attendance.
8. Community post, comment, report, auto-hide, ban; rooms (capacity, host leaving).
9. Search and study-abroad content; analytics numbers and CSV exports.
10. Every API route called anonymously and as the wrong role.

## Scripts

- `npm run dev` — start the dev server
- `npm run build` / `npm start` — production build & serve
- `npm run db:push` — apply the Drizzle schema to `data.db`
- `npm run db:seed` — reset and repopulate demo data (**erases everything**; refuses to run in production unless `ALLOW_PRODUCTION_SEED=yes`)
- `npm run admin:create` — create the first administrator on a live install (`ADMIN_EMAIL`, `ADMIN_NAME`, `ADMIN_PASSWORD`)
- `npm run db:studio` — open Drizzle Studio to browse the database
