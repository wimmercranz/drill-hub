import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { basketballCategories, basketballDrills } from "./seed-data/basketball";
import { slugify } from "../src/lib/slug";
import { TERMS_VERSION } from "../src/lib/legal";
import { WEEKDAYS, nowIn, occurrences, toDateInput, wallClock } from "../src/lib/time";

const prisma = new PrismaClient();

const sports = [
  { slug: "basketball", name: "Basketball", emoji: "🏀", active: true },
  { slug: "football", name: "Football (Soccer)", emoji: "⚽", active: false },
  { slug: "handball", name: "Handball", emoji: "🤾", active: false },
  { slug: "volleyball", name: "Volleyball", emoji: "🏐", active: false },
  { slug: "ice-hockey", name: "Ice Hockey", emoji: "🏒", active: false },
];

async function main() {
  console.log("Seeding Drillpin…");

  for (const s of sports) {
    await prisma.sport.upsert({ where: { slug: s.slug }, update: s, create: s });
  }
  const basketball = await prisma.sport.findUniqueOrThrow({ where: { slug: "basketball" } });

  for (const [i, c] of basketballCategories.entries()) {
    await prisma.category.upsert({
      where: { sportId_slug: { sportId: basketball.id, slug: c.slug } },
      update: { name: c.name, order: i },
      create: { ...c, order: i, sportId: basketball.id },
    });
  }
  const categories = await prisma.category.findMany({ where: { sportId: basketball.id } });
  const catId = (slug: string) => {
    const c = categories.find((c) => c.slug === slug);
    if (!c) throw new Error(`Unknown category ${slug}`);
    return { id: c.id };
  };

  for (const d of basketballDrills) {
    const slug = slugify(d.title);
    const data = {
      title: d.title,
      summary: d.summary,
      setup: d.setup,
      steps: d.steps.join("\n"),
      coachingPoints: d.coachingPoints.join("\n"),
      variations: (d.variations ?? []).join("\n"),
      level: d.level,
      minPlayers: d.minPlayers,
      durationMin: d.durationMin,
      equipment: d.equipment,
      videoUrl: d.videoId ? `https://www.youtube.com/watch?v=${d.videoId}` : null,
      sourceTitle: d.sourceTitle ?? null,
      sourceUrl: d.videoId ? `https://www.youtube.com/watch?v=${d.videoId}` : null,
      visibility: "PUBLIC",
      sportId: basketball.id,
    };
    await prisma.drill.upsert({
      where: { slug },
      update: { ...data, categories: { set: d.categories.map(catId) } },
      create: { ...data, slug, categories: { connect: d.categories.map(catId) } },
    });
  }
  console.log(`  ${basketballDrills.length} basketball drills`);

  // Demo data is only created when SEED_DEMO=true (on your own computer, see .env.example).
  // Everywhere else (e.g. the live site) any old demo data is removed.
  if (process.env.SEED_DEMO !== "true") {
    const demoEmails = ["coach", "player"].flatMap((w) => [`${w}@drillpin.test`, `${w}@drillhub.test`]);
    const removed = await prisma.$transaction([
      prisma.team.deleteMany({ where: { inviteCode: "HAWKS1" } }),
      prisma.club.deleteMany({ where: { slug: "demo-basketball-club" } }),
      prisma.user.deleteMany({ where: { email: { in: demoEmails } } }),
    ]);
    const [teams, clubs, users] = removed.map((r) => r.count);
    console.log(`Done (no demo data${users + teams + clubs ? `; removed ${users} demo users, ${teams} demo team, ${clubs} demo club` : ""}).`);
    return;
  }

  // Demo accounts so you can try the app straight away.
  const passwordHash = await bcrypt.hash("drillpin123", 10);
  // The service used to be called "Drill Hub": move the old demo accounts over to the new addresses.
  for (const who of ["coach", "player"]) {
    await prisma.user.updateMany({ where: { email: `${who}@drillhub.test` }, data: { email: `${who}@drillpin.test`, passwordHash } });
  }
  const consent = { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION };
  const coach = await prisma.user.upsert({
    where: { email: "coach@drillpin.test" },
    update: {},
    create: {
      name: "Casey Coach",
      email: "coach@drillpin.test",
      username: "casey-coach",
      bio: "Youth coach · U14 Hawks · Big believer in defense first.",
      profileVisibility: "PUBLIC",
      passwordHash,
      ...consent,
    },
  });
  const player = await prisma.user.upsert({
    where: { email: "player@drillpin.test" },
    update: {},
    create: { name: "Pat Player", email: "player@drillpin.test", username: "pat-player", passwordHash, ...consent },
  });

  const club = await prisma.club.upsert({
    where: { slug: "demo-basketball-club" },
    update: {},
    create: { slug: "demo-basketball-club", name: "Demo Basketball Club", city: "Stockholm" },
  });
  for (const [user, role] of [[coach, "ADMIN"], [player, "MEMBER"]] as const) {
    await prisma.clubMember.upsert({
      where: { userId_clubId: { userId: user.id, clubId: club.id } },
      update: {},
      create: { userId: user.id, clubId: club.id, role },
    });
  }

  const existingTeam = await prisma.team.findUnique({ where: { inviteCode: "HAWKS1" } });
  if (existingTeam) {
    console.log("Demo team already exists — skipping the rest of the demo data.");
    return;
  }
  const team = await prisma.team.create({ data: { name: "Demo Hawks U14", inviteCode: "HAWKS1", sportId: basketball.id } });
  await prisma.membership.createMany({
    data: [
      { userId: coach.id, teamId: team.id, role: "COACH", title: "Head coach" },
      { userId: player.id, teamId: team.id, role: "PLAYER" },
    ],
  });

  const pick = async (title: string) => prisma.drill.findUniqueOrThrow({ where: { slug: slugify(title) } });
  const teamDrills = ["Dynamic Warm-up", "Three-Man Weave", "Shell Drill", "Five-Spot Shooting", "Circle Box-Out", "3-on-2, 2-on-1 Continuous"];
  for (const title of teamDrills) {
    await prisma.teamDrill.create({ data: { teamId: team.id, drillId: (await pick(title)).id, addedById: coach.id } });
  }

  // Pat's board: two columns plus an unsorted drill.
  const warmups = await prisma.board.create({ data: { userId: player.id, title: "Warm-ups", order: 0 } });
  const summer = await prisma.board.create({ data: { userId: player.id, title: "Summer program", order: 1 } });
  const boardDrills: [string, string | null][] = [
    ["Mikan Drill", warmups.id],
    ["Form Shooting", warmups.id],
    ["Two-Ball Dribbling", summer.id],
    ["Beat the Pro", summer.id],
    ["Euro Step Finishing", null],
  ];
  for (const [i, [title, boardId]] of boardDrills.entries()) {
    await prisma.personalSave.create({ data: { userId: player.id, drillId: (await pick(title)).id, boardId, position: i } });
  }

  // Weekly practices: Tuesdays and Thursdays 18:00–19:30, from 4 weeks ago to 10 weeks ahead.
  const today = new Date();
  const from = wallClock(toDateInput(new Date(today.getTime() - 28 * 86_400_000)));
  const to = wallClock(toDateInput(new Date(today.getTime() + 70 * 86_400_000)));
  for (const weekday of [2, 4]) {
    const schedule = await prisma.practiceSchedule.create({
      data: { teamId: team.id, weekday, startTime: "18:00", durationMin: 90, location: "Main gym", startsOn: from, endsOn: to },
    });
    await prisma.practicePlan.createMany({
      data: occurrences(weekday, "18:00", from, to).map((startsAt) => ({
        title: `${WEEKDAYS[weekday]} practice`,
        startsAt,
        durationMin: 90,
        location: "Main gym",
        teamId: team.id,
        scheduleId: schedule.id,
      })),
    });
  }

  const plans = await prisma.practicePlan.findMany({ where: { teamId: team.id }, orderBy: { startsAt: "asc" } });
  const now = nowIn(team.timezone);
  const lastPast = plans.filter((p) => p.startsAt! < now).at(-1);
  const nextUp = plans.find((p) => p.startsAt! > now);
  const items: [string, number, string][] = [
    ["Dynamic Warm-up", 6, ""],
    ["Three-Man Weave", 8, "Focus on no dropped passes"],
    ["Shell Drill", 15, "Start without dribbling"],
    ["Five-Spot Shooting", 10, "Record makes"],
    ["3-on-2, 2-on-1 Continuous", 12, ""],
  ];
  for (const plan of [lastPast, nextUp]) {
    if (!plan) continue;
    await prisma.practicePlan.update({
      where: { id: plan.id },
      data: {
        title: plan === nextUp ? `${plan.title} — defense focus` : plan.title,
        authorId: coach.id,
        notes: plan === nextUp ? "Bring pinnies. Water break after shell drill." : "",
        items: {
          create: await Promise.all(
            items.map(async ([title, durationMin, note], order) => ({ order, durationMin, note, drillId: (await pick(title)).id })),
          ),
        },
      },
    });
  }
  await prisma.practiceTemplate.create({
    data: {
      title: "Monthly shooting session",
      notes: "Bring all balls. Count makes in every drill.",
      ownerId: coach.id,
      items: {
        create: await Promise.all(
          ([["Dynamic Warm-up", 6], ["Form Shooting", 8], ["Five-Spot Shooting", 12], ["Hot Shot", 8], ["Free Throw Golf", 10]] as const).map(
            async ([title, durationMin], order) => ({ order, durationMin, drillId: (await pick(title)).id }),
          ),
        ),
      },
    },
  });

  if (lastPast) {
    await prisma.practiceRating.createMany({
      data: [
        { planId: lastPast.id, userId: player.id, rating: 3 },
        { planId: lastPast.id, userId: coach.id, rating: 4 },
      ],
    });
  }

  console.log("Done. Demo logins: coach@drillpin.test / player@drillpin.test (password: drillpin123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
