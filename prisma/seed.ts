import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { basketballCategories, basketballDrills } from "./seed-data/basketball";
import { slugify } from "../src/lib/slug";

const prisma = new PrismaClient();

const sports = [
  { slug: "basketball", name: "Basketball", emoji: "🏀", active: true },
  { slug: "football", name: "Football (Soccer)", emoji: "⚽", active: false },
  { slug: "handball", name: "Handball", emoji: "🤾", active: false },
  { slug: "volleyball", name: "Volleyball", emoji: "🏐", active: false },
  { slug: "ice-hockey", name: "Ice Hockey", emoji: "🏒", active: false },
];

async function main() {
  console.log("Seeding Drill Hub…");

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

  // Demo accounts so you can try the app straight away.
  const passwordHash = await bcrypt.hash("drillhub123", 10);
  const coach = await prisma.user.upsert({
    where: { email: "coach@drillhub.test" },
    update: {},
    create: { name: "Casey Coach", email: "coach@drillhub.test", passwordHash },
  });
  const player = await prisma.user.upsert({
    where: { email: "player@drillhub.test" },
    update: {},
    create: { name: "Pat Player", email: "player@drillhub.test", passwordHash },
  });

  const team = await prisma.team.upsert({
    where: { inviteCode: "HAWKS1" },
    update: {},
    create: { name: "Demo Hawks U14", inviteCode: "HAWKS1", sportId: basketball.id },
  });
  for (const [user, role] of [[coach, "COACH"], [player, "PLAYER"]] as const) {
    await prisma.membership.upsert({
      where: { userId_teamId: { userId: user.id, teamId: team.id } },
      update: { role },
      create: { userId: user.id, teamId: team.id, role },
    });
  }

  const pick = async (title: string) => prisma.drill.findUniqueOrThrow({ where: { slug: slugify(title) } });
  const teamDrills = ["Dynamic Warm-up", "Three-Man Weave", "Shell Drill", "Five-Spot Shooting", "Circle Box-Out", "3-on-2, 2-on-1 Continuous"];
  for (const title of teamDrills) {
    const drill = await pick(title);
    await prisma.teamDrill.upsert({
      where: { teamId_drillId: { teamId: team.id, drillId: drill.id } },
      update: {},
      create: { teamId: team.id, drillId: drill.id, addedById: coach.id },
    });
  }
  for (const title of ["Mikan Drill", "Two-Ball Dribbling", "Form Shooting"]) {
    const drill = await pick(title);
    await prisma.personalSave.upsert({
      where: { userId_drillId: { userId: player.id, drillId: drill.id } },
      update: {},
      create: { userId: player.id, drillId: drill.id },
    });
  }

  if ((await prisma.practicePlan.count({ where: { teamId: team.id } })) === 0) {
    const items: [string, number, string][] = [
      ["Dynamic Warm-up", 6, ""],
      ["Three-Man Weave", 8, "Focus on no dropped passes"],
      ["Shell Drill", 15, "Start without dribbling"],
      ["Five-Spot Shooting", 10, "Record makes"],
      ["3-on-2, 2-on-1 Continuous", 12, ""],
    ];
    await prisma.practicePlan.create({
      data: {
        title: "Tuesday practice — defense focus",
        teamId: team.id,
        authorId: coach.id,
        notes: "Bring pinnies. Water break after shell drill.",
        items: {
          create: await Promise.all(
            items.map(async ([title, durationMin, note], order) => ({
              order,
              durationMin,
              note,
              drillId: (await pick(title)).id,
            })),
          ),
        },
      },
    });
  }

  console.log("Done. Demo logins: coach@drillhub.test / player@drillhub.test (password: drillhub123)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
