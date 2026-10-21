# Drill Hub 🏀

A website where players and coaches discover sports drills, **collect** the ones they like, share them with their team and build practice plans.

Starting with basketball. The data model is multi-sport from day one, so other sports can be added later.

## What it can do (v0.2)

- **Drill library**: 37 curated basketball drills with embedded YouTube videos, setup, steps, coaching points and variations. Search, filter by skill and level, and sort by how often each drill is used.
- **Collect drills**: save any drill to *My Drills*. Coaches can also add it to a team's library.
- **"Used" counter**: every drill shows how many times it has been added to a profile or team library.
- **Create drills**: with or without a video (text-only is fine), visible to *everyone*, *my team* or *only me*.
- **Teams**: create a team (you become the coach) and invite players with a code or link. Roles are per team, so you can coach one team and play on another.
- **Profiles**: every account has a profile page (`/u/username`) with a bio, clubs, teams and collected drills. It's **public** or **private** (private = only you and your teammates can see it, and new accounts start private).
- **Clubs**: find, join or create your club and it shows on your profile. Whoever creates a club becomes its admin and can manage members.
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
| `git pull` then `npm install` and `npm run setup` | Get the latest changes from GitHub and update your database |

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

- [x] Profiles (public/private) and clubs

**Next up (from testing feedback):**
- [ ] Club admins + duplicate protection: "Did you mean…?" suggestions for similar club names when creating a club
- [ ] Coaching staff: head coach + assistant coaches per team — *decided: all coaches get the same rights, so the team keeps working if the head coach leaves*
- [ ] Invitation e-mails for players and coaches
- [ ] Sign in with Google / Apple (and similar)
- [ ] Practice schedule: set practice times (e.g. every Tue & Thu 18:00–19:30) and get an empty plan slot for each practice — *decided: usually fixed per semester; changing the schedule updates all future practices (past ones stay as they were)*
- [ ] Time feedback while planning: planned minutes vs. available practice time
- [ ] Quick post-practice poll: "How would you rate this practice?" (1–4), with results for coaches — *decided: answers are anonymous*
- [ ] Show "✓ Saved" / "In [team]" badges on drill cards so you can see what you already collected

**Later:**
- [ ] Club admin tools: link teams to a club, shared club library
- [ ] Ratings and comments on drills
- [ ] Assign drills to players as "homework"
- [ ] Court diagram editor for drills without video
- [ ] "Import from YouTube link" that fills in the title and thumbnail automatically
- [ ] More sports (football, handball, volleyball…)
- [ ] Password reset by email
- [ ] Deploy publicly (Vercel + hosted Postgres)
