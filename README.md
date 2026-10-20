# Drill Hub 🏀

A website where players and coaches discover sports drills, **collect** the ones they like, share them with their team and build practice plans.

Starting with basketball. The data model is multi-sport from day one, so other sports can be added later.

## What it can do (v0.1)

- **Drill library**: 37 curated basketball drills with embedded YouTube videos, setup, steps, coaching points and variations. Search, filter by skill and level, and sort by popularity.
- **Collect drills**: save any drill to *My Drills*. Coaches can also add it to a team's library.
- **Create drills**: with or without a video (text-only is fine), visible to *everyone*, *my team* or *only me*.
- **Teams**: create a team (you become the coach) and invite players with a code or link. Roles are per team, so you can coach one team and play on another.
- **Practice planner**: coaches put drills in order with times, add notes and print the plan. Players can view it.

## Run it on your computer

You only need to do this once.

1. **Install Node.js** (the engine that runs the app): download the "LTS" version from <https://nodejs.org> and install it.
2. **Install Git** if you don't have it: <https://git-scm.com/downloads>
3. Open a terminal (Mac: *Terminal*; Windows: *PowerShell*) and run:

   ```bash
   git clone https://github.com/wimmercranz/drill-hub.git
   cd drill-hub
   npm install
   cp .env.example .env
   npm run setup
   ```

   (On Windows PowerShell, use `copy .env.example .env` instead of the `cp` line.)

Then, every time you want to start the app:

```bash
npm run dev
```

Open <http://localhost:3000> in your browser. Stop the app with `Ctrl + C`.

### Demo logins

| Email | Password | Role |
|---|---|---|
| `coach@drillhub.test` | `drillhub123` | Coach of "Demo Hawks U14" |
| `player@drillhub.test` | `drillhub123` | Player on "Demo Hawks U14" |

### Useful commands

| Command | What it does |
|---|---|
| `npm run dev` | Start the app for development |
| `npm run db:studio` | Open a spreadsheet-like view of the database in your browser |
| `npm run db:reset` | Wipe the local database and reload the starter drills |
| `git pull` | Get the latest changes from GitHub |

## How it's built

- **Next.js + React + TypeScript**: one project for both the pages and the server logic. It's very widely used, so help is easy to find.
- **Tailwind CSS** for styling.
- **Prisma** for the database. Locally it uses a single file (`prisma/dev.db`). For the public launch it will use a hosted PostgreSQL database.

| Folder | Contents |
|---|---|
| `src/app/` | One folder per page (e.g. `drills/[slug]/page.tsx` is a drill's page) |
| `src/app/actions/` | Server logic for buttons and forms (saving, teams, plans…) |
| `src/components/` | Reusable pieces of UI |
| `prisma/schema.prisma` | Database structure |
| `prisma/seed-data/basketball.ts` | The starter drills (edit this to add or improve drills) |

## About the videos

Videos are **embedded** from YouTube, never downloaded or re-hosted. Every drill credits and links to its original video, and the drill descriptions are our own writing. If a creator has turned off embedding, the drill page links to the video on YouTube instead.

## Roadmap

- [ ] Club admin role: a club with several teams and a shared club library
- [ ] Ratings and comments on drills
- [ ] Assign drills to players as "homework"
- [ ] Court diagram editor for drills without video
- [ ] "Import from YouTube link" that fills in the title and thumbnail automatically
- [ ] More sports (football, handball, volleyball…)
- [ ] Password reset by email
- [ ] Deploy publicly (Vercel + hosted Postgres)
