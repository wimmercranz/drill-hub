# Daily drill agent

A scheduled Claude session runs this once a day to keep the Drillpin library growing.
It adds **5 new basketball drills** to `prisma/seed-data/basketball-daily.ts`. When it pushes to
`main`, Vercel deploys and the build loads the new drills into the live database.

**Stop date: 2026-11-12.** After that date the agent must not add drills; it only reports that
the run period is over, so the owner can delete the scheduled task.

## Steps for the agent

1. **Get the code.** Use the repository `wimmercranz/drill-hub` (attach it with the add_repo tool if it isn't in
   the session yet). Run `git pull origin main` and `npm install`.
2. **Check the date.** If today is after the stop date, stop here and report that.
3. **See what exists.** Read `prisma/seed-data/basketball.ts` and `prisma/seed-data/basketball-daily.ts`.
   Run `npm run check:drills`. It prints the number of drills per category, fewest first.
4. **Pick 5 new drills.**
   - They must be real, well-known basketball drills that coaches actually use, and must not duplicate or closely
     resemble an existing drill.
   - Favour the categories with the fewest drills, and mix levels (beginner, intermediate, advanced).
   - Use only the existing category slugs.
5. **Find a video for each drill** with WebSearch (`allowed_domains: ["youtube.com"]`).
   - Only use a video id that appears in a search result URL. **Never guess or make up a video id.** YouTube itself
     is not reachable from the session, so the search result is the evidence.
   - Prefer established coaching channels (e.g. Jr. NBA, USA Basketball, Breakthrough Basketball, IMG Academy,
     ILoveBasketballTV, TeachHoops, Hawks Basketball Academy) and normal videos over Shorts.
   - Never reuse a video already in the library (the check script catches this).
   - Put the video's title exactly as shown in the search result in `sourceTitle`.
   - If no good video exists, the drill may be text-only (leave out `videoId` and `sourceTitle`). At most 1 text-only
     drill per day.
6. **Write each drill in our own words.** Never copy text from the video description or websites.
   - **summary:** 1–2 sentences on what the drill is and why it helps.
   - **setup:** where players and equipment start.
   - **steps:** 3–6 short, clear steps.
   - **coachingPoints:** 2–4 points.
   - **variations:** 0–2.
   - Also fill in **level**, **minPlayers**, **durationMin** and **equipment**.
   - Keep it safe and age-appropriate. Use plain English that a volunteer youth coach understands.
7. **Append** the 5 drills at the end of the array in `basketball-daily.ts`, under a comment `// Added YYYY-MM-DD`.
   Do not edit any other file.
8. **Verify.** `npm run check:drills` must say "All good", and `npx tsc --noEmit` must show no errors.
   Fix and re-run until both pass.
9. **Publish.** Commit with the message `Add daily drills YYYY-MM-DD: <title 1>, <title 2>, …` and push to `main`
   (`git push -u origin main`; on network errors retry up to 4 times with 2s/4s/8s/16s waits).
   If the push is rejected because `main` moved, `git pull --rebase origin main`, re-run the checks, and push again.
10. **Report.** List the 5 drills added (title, category, level, video title) in the final message.
