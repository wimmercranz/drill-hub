# Drillpin 📌

A website where players and coaches discover sports drills, **collect** the ones they like, share them with their team and plan practices.

Starting with basketball. The data model is multi-sport from day one, so other sports can be added later.

## What it can do (v0.4)

- **Drill library:** 37 curated basketball drills with embedded YouTube videos, setup, steps, coaching points and variations. Search, filter, and sort by how often each drill is used. Cards show **✓ Saved** and **In [team]** badges.
- **My Drills board:** collect drills and drag them between your own boards (e.g. "Warm-ups", "Summer program"), like Trello.
- **Create drills:** with or without video, visible to everyone, your team, or only you.
- **Teams:** coaches (head coach, assistant coaches…, all with the same rights) and players. Invite people by e-mail or with a team code.
- **Practice schedule:** set weekly practice times for the season (e.g. Tue & Thu 18:00–19:30). Each practice gets its own plan. Changing the schedule moves all future practices; single practices can be moved or cancelled.
- **Practice planner:** add drills, drag to reorder, see the clock for each drill and a **"75 / 90 min planned"** bar, copy drills from an earlier practice, and print.
- **Saved practices:** under My Drills → Practices, build reusable practices (e.g. "Monthly shooting session"), or save any team practice for reuse. Use them in any team practice with one click (replace or add).
- **Practice poll:** after each practice, everyone can rate it 1–4 **anonymously**; coaches see the average.
- **Profiles & clubs:** profile picture, bio, public/private profile, clubs (with admins).
- **Accounts & privacy:** e-mail/password or Google sign-in, password reset, terms + privacy policy at sign-up, download your data, delete your account.

---

## Put it online (for testing)

The site runs on **Vercel** (hosting) and **Neon** (database). Both have free plans. You do this once (~20 minutes); after that, every change pushed to GitHub goes live automatically.

### 1. Create the database (Neon)
1. Go to <https://neon.tech> and sign up (you can use your GitHub account).
2. Create a project, e.g. **drill-hub**, region **Europe (Frankfurt)**.
3. On the project dashboard, click **Connect**. Turn **off** "Connection pooling", then copy the connection string. It looks like `postgresql://…neon.tech/neondb?sslmode=require`. Keep it for step 2.

### 2. Create the website (Vercel)
1. Go to <https://vercel.com> and sign up **with your GitHub account**.
2. Click **Add New… → Project** and pick **drill-hub** from your GitHub repositories.
3. Before clicking Deploy, open **Environment Variables** and add:

   | Name | Value |
   |---|---|
   | `DATABASE_URL` | the Neon connection string from step 1 |
   | `APP_URL` | your Vercel address for now, e.g. `https://drill-hub-xyz.vercel.app` (changed to `https://drillpin.app` in step 3) |

4. Click **Deploy**. After 2–3 minutes you get your site's address, e.g. `https://drill-hub-xyz.vercel.app`.
5. If the address differs from what you put in `APP_URL`: go to **Settings → Environment Variables**, update `APP_URL`, then **Deployments → ⋯ → Redeploy**.

The database tables and the 37 drills are created automatically during deployment. The live site has no demo accounts: sign up with your own e-mail.

### 3. Connect the domain (drillpin.app)
1. In Vercel, open the project → **Settings → Domains → Add** and type `drillpin.app`. Also add `www.drillpin.app` and choose "redirect to drillpin.app".
   (If you bought the domain in Vercel, the DNS is set up automatically. Otherwise Vercel shows which records to add at your registrar.)
2. **Settings → Environment Variables:** set `APP_URL` to `https://drillpin.app`.
3. **Deployments → ⋯ → Redeploy.**

### 4. Optional: "Continue with Google"
1. Go to <https://console.cloud.google.com>, create a project called **Drillpin**.
2. **APIs & Services → OAuth consent screen:** choose *External*, fill in app name and your e-mail, save. Under *Audience*, add your own and your testers' Google addresses as test users.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID → Web application.** Under *Authorized redirect URIs* add:
   - `https://drillpin.app/auth/google/callback`
   - `http://localhost:3000/auth/google/callback`
4. Copy the **Client ID** and **Client secret** into Vercel as `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`, then redeploy.

### 5. Optional: real e-mails (invitations, password reset)
1. Sign up at <https://resend.com>, go to **Domains → Add domain** and enter `drillpin.app`.
2. Resend shows a few DNS records (TXT/MX). Add them in Vercel under **your team → Domains → drillpin.app → DNS Records**. Wait until Resend says *Verified* (minutes to a few hours).
3. In Resend, create an **API key**.
4. In Vercel, add `RESEND_API_KEY` (the key) and `EMAIL_FROM` = `Drillpin <noreply@drillpin.app>`, then redeploy.

Until this is done, invitations show a **Link** button so you can copy and send the link yourself, and e-mails are listed in Vercel under **Logs**.

---

## Run it on your computer

You need **Node.js** (LTS from <https://nodejs.org>). For the database, use a separate Neon *branch* so your local testing doesn't touch the online data: in Neon, open **Branches → Create branch**, name it `dev`, and copy its connection string (pooling off).

First time, in the Terminal:

```bash
cd Desktop/drill-hub-main      # or wherever the folder is
npm install
cp .env.example .env           # Windows: copy .env.example .env
```

Open the `.env` file in a text editor (e.g. TextEdit) and paste the `dev` branch connection string as `DATABASE_URL`. Then:

```bash
npm run setup
npm run dev
```

Open <http://localhost:3000>. Next time, only `npm run dev` is needed. On your computer there are demo logins (`coach@drillpin.test` / `player@drillpin.test`, password `drillpin123`), created because `SEED_DEMO="true"` is in `.env`. Locally, e-mails (invitations, password resets) are printed in the Terminal window instead of being sent.

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app on your computer |
| `npm run setup` | Create/update the database tables and load the drills |
| `npm run db:studio` | Spreadsheet-like view of the database in your browser |

## How it's built

- **Next.js + React + TypeScript:** pages and server logic in one project.
- **Tailwind CSS** for styling, **dnd-kit** for drag & drop.
- **Prisma + PostgreSQL** for the database.
- **Arctic** for Google sign-in, **Resend** for e-mails.

| Folder | Contents |
|---|---|
| `src/app/` | One folder per page (e.g. `teams/[id]/page.tsx` is a team page) |
| `src/app/actions/` | Server logic for buttons and forms |
| `src/components/` | Reusable pieces of UI (e.g. `DrillBoard.tsx`, `PlanItems.tsx`) |
| `src/lib/` | Helpers (login, schedule, e-mail, time) |
| `prisma/schema.prisma` | Database structure |
| `prisma/seed-data/basketball.ts` | The starter drills |
| `src/app/terms`, `src/app/privacy` | Terms of use and privacy policy (drafts) |

## Daily drill agent

A scheduled task (**"Drillpin: add 5 daily drills"**) runs every morning at 06:07 Swedish time until **12 November 2026**.
A Claude session researches 5 new drills, writes them into `prisma/seed-data/basketball-daily.ts`, runs the quality check
(`npm run check:drills`) and pushes. Vercel then publishes them. The agent's instructions are in
[`docs/drill-agent.md`](docs/drill-agent.md).

To pause or delete it: claude.ai → Code → **Scheduled tasks** (or ask Claude). Each day's drills show up as a commit
"Add daily drills YYYY-MM-DD" on GitHub. To remove a drill you don't like, delete it from that file (or ask Claude).

## About the videos

Videos are **embedded** from YouTube, never downloaded or re-hosted. Every drill credits and links to its original video, and the drill descriptions are our own writing.

## Roadmap

**Done in v0.3:**
- [x] Profiles (public/private) and clubs, with "Did you mean…?" suggestions against duplicate clubs
- [x] Personal drill board with drag & drop columns
- [x] Coaching staff (head/assistant coach titles; all coaches have the same rights)
- [x] Invitation e-mails for players and coaches
- [x] Sign in with Google + email/password, password reset
- [x] Practice schedule with a plan per practice; changing the schedule moves all future practices
- [x] Time feedback while planning (planned vs. available minutes)
- [x] Anonymous 1–4 post-practice poll
- [x] "✓ Saved" / "In [team]" badges on drill cards
- [x] Profile pictures
- [x] Terms of use + privacy policy (drafts), consent at sign-up, download my data, delete my account

**Before going public:**
- [ ] Have the terms and privacy policy reviewed by a lawyer and fill in the [bracketed] parts
- [ ] Sign data processing agreements with Vercel, Neon and Resend (usually a click in their dashboards)
- [x] Own domain name: drillpin.app
- [ ] Verified sending domain for e-mails (Resend)
- [x] No demo data on the live site

**Later:**
- [ ] "Holiday bundles": one-time drill packages for players, e.g. a summer holiday program
- [ ] Club admin tools: link teams to a club, shared club library
- [ ] Comments on drills — *decided: start without comments; if added, keep them limited and use an AI moderation agent to screen for hate speech and illegal content before posting*
- [ ] Assign drills to players as "homework"
- [ ] Court diagram editor for drills without video
- [ ] "Import from YouTube link" that fills in the title and thumbnail automatically
- [ ] More sports (football, handball, volleyball…)
