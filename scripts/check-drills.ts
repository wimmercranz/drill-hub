/**
 * Quality check for the drill library in prisma/seed-data.
 * Run with: npm run check:drills
 * The daily drill agent must run this (and get "All good") before pushing.
 */
import { basketballCategories, basketballDrills, type SeedDrill } from "../prisma/seed-data/basketball";
import { dailyBasketballDrills } from "../prisma/seed-data/basketball-daily";
import { slugify } from "../src/lib/slug";

const errors: string[] = [];
const all: [string, SeedDrill][] = [
  ...basketballDrills.map((d) => ["basketball.ts", d] as [string, SeedDrill]),
  ...dailyBasketballDrills.map((d) => ["basketball-daily.ts", d] as [string, SeedDrill]),
];
const categories = new Set(basketballCategories.map((c) => c.slug));
const slugs = new Map<string, string>();
const videos = new Map<string, string>();
const norm = (t: string) => slugify(t).replace(/-(drill|drills|game)$/, "");

for (const [file, d] of all) {
  const where = `${file} → "${d.title}"`;
  const err = (m: string) => errors.push(`${where}: ${m}`);
  if (!d.title || d.title.length < 3 || d.title.length > 100) err("title must be 3–100 characters");
  const key = norm(d.title);
  if (slugs.has(key)) err(`duplicate of "${slugs.get(key)}"`);
  slugs.set(key, d.title);
  if (!d.summary || d.summary.length < 30 || d.summary.length > 400) err("summary must be 30–400 characters");
  if (!d.setup || d.setup.length < 15) err("setup is missing or too short");
  if (!Array.isArray(d.steps) || d.steps.length < 3) err("needs at least 3 steps");
  if (!Array.isArray(d.coachingPoints) || d.coachingPoints.length < 2) err("needs at least 2 coaching points");
  if (!d.categories?.length) err("needs at least one category");
  for (const c of d.categories ?? []) if (!categories.has(c)) err(`unknown category "${c}" (allowed: ${[...categories].join(", ")})`);
  if (!["BEGINNER", "INTERMEDIATE", "ADVANCED"].includes(d.level)) err(`invalid level "${d.level}"`);
  if (!(d.minPlayers >= 1 && d.minPlayers <= 30)) err("minPlayers must be 1–30");
  if (!(d.durationMin >= 2 && d.durationMin <= 60)) err("durationMin must be 2–60");
  if (!d.equipment) err("equipment is missing");
  if (d.videoId !== undefined) {
    if (!/^[A-Za-z0-9_-]{11}$/.test(d.videoId)) err(`videoId "${d.videoId}" is not a valid 11-character YouTube id`);
    if (videos.has(d.videoId)) err(`video already used by "${videos.get(d.videoId)}"`);
    videos.set(d.videoId, d.title);
    if (!d.sourceTitle) err("sourceTitle (credit) is required when there is a video");
  }
}

if (errors.length) {
  console.error(`✗ ${errors.length} problem(s):\n` + errors.map((e) => `  - ${e}`).join("\n"));
  process.exit(1);
}
console.log(`✓ All good: ${all.length} drills (${dailyBasketballDrills.length} added by the daily agent).`);
const counts = [...categories].map((c) => [c, all.filter(([, d]) => d.categories.includes(c)).length] as const).sort((a, b) => a[1] - b[1]);
console.log("Drills per category (fewest first): " + counts.map(([c, n]) => `${c} ${n}`).join(", "));
