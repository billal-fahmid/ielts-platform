# Deploying BanglaEnglish

This guide takes a server (or VPS) from nothing to a running site. The app is a single Node.js process with a SQLite file and an uploads folder, so it needs a host with a **persistent disk** (a VPS, Fly.io or Railway volume, a Render disk). Hosts with a read-only or throw-away filesystem (Vercel, Netlify functions) will lose data.

## 1. What you need

- Node.js 20 or newer, and a domain with HTTPS (a reverse proxy such as Caddy or nginx).
- A persistent folder for the database and one for uploads, both included in your backups.
- Optional: an SMTP account (email), an SSLCommerz account (cards), an AI key (Gemini has a free tier).

## 2. Configure

Copy `.env.example` to `.env.local` on the server (or set the same names in your host's dashboard) and fill it in. The required ones:

| Name | Why |
|---|---|
| `AUTH_SECRET` | Signs login sessions. Long and random; changing it logs everyone out. |
| `APP_URL`, `NEXTAUTH_URL` | The public address. Used in emails, payment callbacks, the sitemap and canonical links. |
| `DATABASE_PATH` | Absolute path of the SQLite file on the persistent disk. |
| `UPLOAD_DIR` | Absolute path for uploaded files. |
| `TRUST_PROXY=true` | Set when a proxy is in front, so rate limits see real visitor IPs. Never set it when the app is reachable directly, because visitors could fake their address. |

Secrets are read on the server only. Never commit `.env.local` (it is git-ignored). If a key has ever been pasted into a chat, an issue or a screenshot, **create a new one** and revoke the old one.

## 3. Build and start

```bash
npm ci
npm run build
npm run db:push          # creates or updates the tables
npm start                # listens on port 3000 (PORT=... to change)
```

Run it under a process manager so it restarts after crashes and reboots (`pm2 start npm --name banglaenglish -- start`, or a systemd unit).

**First run only** (an empty database):

```bash
ALLOW_PRODUCTION_SEED=yes NODE_ENV=production npm run db:seed   # starter courses, IELTS material, plans, community categories, study-abroad guides
ADMIN_EMAIL=you@example.com ADMIN_NAME="Your Name" ADMIN_PASSWORD='a-long-passphrase' npm run admin:create
```

Then sign in, and in the admin console:

1. **Users:** delete the demo accounts (`admin@`, `teacher@`, `student@banglaenglish.app`). They use well-known passwords.
2. **Payment accounts:** replace the demo bKash/Nagad/Rocket/bank details with your real ones.
3. **Live classes and 1-on-1 slots:** the demo class and slots use example links; delete them.
4. **Plans:** check names, prices and features. **Study abroad and Resources:** review the starter text and links (they are general guides, not legal or visa advice) and edit them to match what you can stand behind.

> `npm run db:seed` erases **every** table. In production it refuses to run unless `ALLOW_PRODUCTION_SEED=yes`. Never set that on a site with real students.
> `npm run db:push` applies schema changes without asking about data loss. **Back up the database first** on every upgrade.

## 4. Reverse proxy and HTTPS

Caddy (automatic certificates):

```
your-domain.com {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000
}
```

nginx: proxy to `127.0.0.1:3000`, pass `Host`, `X-Forwarded-For` and `X-Forwarded-Proto`, and allow uploads (`client_max_body_size 60m;`). The app sends its own security headers and HSTS in production.

## 5. Scheduled jobs

Class reminders go out as people use the site. To send them on time even when nobody is online, set `CRON_SECRET` (16+ characters) and call the endpoint every 5 minutes:

```bash
*/5 * * * * curl -fsS -X POST -H "x-cron-secret: $CRON_SECRET" https://your-domain.com/api/webhooks/cron/reminders
```

Without `CRON_SECRET` the endpoint answers 404 (switched off).

## 5b. Sign in with Google (optional)

1. In Google Cloud Console create a project, configure the OAuth consent screen (External, add your domain), then **Credentials → Create credentials → OAuth client ID → Web application**.
2. Add the authorised redirect URI `https://your-domain.com/api/auth/callback/google` (and `http://localhost:3000/api/auth/callback/google` for local testing).
3. Put the client ID and secret in `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` and restart. The "Continue with Google" button then appears on the login and register pages; with no keys it stays hidden.

How accounts are matched (and why it is safe):

- A Google account is remembered by its Google id. New Google users become students (email marked verified) and go through onboarding; a friend's referral link is honoured. They have no usable password.
- If the Google email matches an existing **student**, the two are linked. Password sign-ups are not email-verified, so the person who chose that password may not own the address (someone could have registered it first). Google has just proved the real owner is present, so on the first link the old password is **reset**, **every existing login session of that account is ended**, the address is marked verified and the owner is notified. Anyone who registered the address first is locked out. An already-verified account is linked without any change.
- A **teacher or administrator** email is never linked by email address; those people log in with their password. Emails Google has not verified are refused.
- Login sessions carry a version number (`users.sessionVersion`). Raising it signs that account out everywhere at once, and a deleted account's sessions stop working immediately. Sessions issued before this feature keep working.

## 6. Email

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM` (any provider works). With `SMTP_HOST` empty, emails are stored in **Admin → Email outbox** instead of being sent, which is fine for a trial but means students get no email. Send a test by asking a friend to register a contact-form message, and check it arrives and isn't marked as spam (set up SPF and DKIM for your sending domain).

## 7. Payments

- **Manual payments** (bKash, Nagad, Rocket, bank) work with no keys. An admin approves each report after checking the statement.
- **Cards through SSLCommerz:** set `SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASSWORD` with `SSLCOMMERZ_SANDBOX=true`. In the SSLCommerz merchant panel allow your domain; each payment sends its own IPN to `https://your-domain.com/api/webhooks/payments/sslcommerz`. **Complete a sandbox payment, a failed payment and a cancelled payment end to end before switching `SSLCOMMERZ_SANDBOX=false`.** The integration was written from SSLCommerz's public documentation and tested against a stand-in server, not against their live sandbox.
- **Other gateways or a bridge:** send signed callbacks to `POST /api/webhooks/payments/signed` (see the Payments section of the README) with `PAYMENT_WEBHOOK_SECRET`.

## 8. Backups

The database is one SQLite file in WAL mode. Copy it safely while the app runs:

```bash
sqlite3 /var/data/banglaenglish.db ".backup '/var/backups/banglaenglish-$(date +%F).db'"
```

Run that daily, copy the result and the `UPLOAD_DIR` folder off the server, and **test a restore** at least once. Keep at least 7 daily and 4 weekly copies.

## 9. Before you announce the site

Walk through this list on the live address (it mirrors the automated checks in the README's "Testing"):

- [ ] Register, log in and log out; a wrong password is refused with a clear message.
- [ ] Student, teacher and admin each land on their own dashboard and are turned away from the others' pages.
- [ ] Enrol in a course, finish a lesson, take a quiz; a certificate appears when the course is complete and its public `/verify/...` page works.
- [ ] Take an IELTS listening, reading, writing and speaking practice, and a mock test; bands are labelled as estimates.
- [ ] AI tutor and AI feedback answer (or clearly say they are unavailable).
- [ ] Buy a plan with a manual payment; the admin approves; the plan activates. A rejected payment does not activate anything. A coupon works once per student.
- [ ] A referral link registers a friend, and the reward appears only after their first paid plan.
- [ ] Notification bell and an email arrive; the community feed, a speaking room and a live class join link work.
- [ ] Open the site on a phone over mobile data: pages load quickly and nothing scrolls sideways.
- [ ] `https://your-domain.com/robots.txt` and `/sitemap.xml` load and list only public pages; view-source on a course page shows its title, description and structured data.
- [ ] **Admin → Error logs** is empty (or understood) after the walk-through.

## 10. Known limits

- Rate limits and the small cache are held in memory, per process. Run **one** app process, or move them to Redis before scaling out.
- SQLite is a single-writer database: it comfortably serves thousands of students on one server, but if you outgrow it, README → "About the database" explains moving to PostgreSQL.
- Live classes and 1-on-1 sessions use a meeting link (Jitsi or any link); there is no built-in video.
- Teacher earnings and payouts are not built.
- Uploads are stored on local disk. Add an S3/R2 `StorageProvider` if you need object storage.
