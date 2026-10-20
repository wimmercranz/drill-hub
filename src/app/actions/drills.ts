"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getMembership } from "@/lib/drills";
import { slugify } from "@/lib/slug";
import { isSupportedVideoUrl } from "@/lib/video";
import type { FormState } from "./auth";

const drillSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters.").max(100),
  summary: z.string().trim().min(10, "Add a short summary (at least 10 characters).").max(400),
  sportId: z.string().min(1),
  categoryIds: z.array(z.string()).min(1, "Choose at least one category."),
  level: z.enum(["BEGINNER", "INTERMEDIATE", "ADVANCED"]),
  minPlayers: z.coerce.number().int().min(1).max(50),
  durationMin: z.coerce.number().int().min(1).max(180),
  equipment: z.string().trim().max(200),
  setup: z.string().trim().max(2000),
  steps: z.string().trim().max(5000),
  coachingPoints: z.string().trim().max(3000),
  variations: z.string().trim().max(3000),
  videoUrl: z
    .string()
    .trim()
    .refine((v) => v === "" || isSupportedVideoUrl(v), "Video link must be a YouTube or Vimeo URL."),
  sourceTitle: z.string().trim().max(200),
  visibility: z.enum(["PUBLIC", "TEAM", "PRIVATE"]),
  teamId: z.string(),
});

function parseDrill(formData: FormData) {
  return drillSchema.safeParse({
    ...Object.fromEntries(formData),
    categoryIds: formData.getAll("categoryIds"),
  });
}

async function uniqueSlug(title: string, ignoreId?: string) {
  const base = slugify(title) || "drill";
  let slug = base;
  for (let i = 2; ; i++) {
    const existing = await db.drill.findUnique({ where: { slug } });
    if (!existing || existing.id === ignoreId) return slug;
    slug = `${base}-${i}`;
  }
}

async function checkTeamVisibility(userId: string, visibility: string, teamId: string) {
  if (visibility !== "TEAM") return null;
  if (!teamId) return "Choose which team can see this drill.";
  const m = await getMembership(userId, teamId);
  if (m?.role !== "COACH") return "Only coaches can create team drills.";
  return null;
}

export async function createDrill(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = parseDrill(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const teamError = await checkTeamVisibility(user.id, d.visibility, d.teamId);
  if (teamError) return { error: teamError };

  const drill = await db.drill.create({
    data: {
      slug: await uniqueSlug(d.title),
      title: d.title,
      summary: d.summary,
      sportId: d.sportId,
      level: d.level,
      minPlayers: d.minPlayers,
      durationMin: d.durationMin,
      equipment: d.equipment,
      setup: d.setup,
      steps: d.steps,
      coachingPoints: d.coachingPoints,
      variations: d.variations,
      videoUrl: d.videoUrl || null,
      sourceTitle: d.sourceTitle || null,
      sourceUrl: d.videoUrl || null,
      visibility: d.visibility,
      teamId: d.visibility === "TEAM" ? d.teamId : null,
      authorId: user.id,
      categories: { connect: d.categoryIds.map((id) => ({ id })) },
    },
  });
  // Authors automatically collect their own drills.
  await db.personalSave.create({ data: { userId: user.id, drillId: drill.id } });
  redirect(`/drills/${drill.slug}`);
}

export async function updateDrill(drillId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const existing = await db.drill.findUnique({ where: { id: drillId } });
  if (!existing || existing.authorId !== user.id) return { error: "You can only edit your own drills." };
  const parsed = parseDrill(formData);
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const d = parsed.data;
  const teamError = await checkTeamVisibility(user.id, d.visibility, d.teamId);
  if (teamError) return { error: teamError };

  const drill = await db.drill.update({
    where: { id: drillId },
    data: {
      slug: existing.title === d.title ? existing.slug : await uniqueSlug(d.title, drillId),
      title: d.title,
      summary: d.summary,
      sportId: d.sportId,
      level: d.level,
      minPlayers: d.minPlayers,
      durationMin: d.durationMin,
      equipment: d.equipment,
      setup: d.setup,
      steps: d.steps,
      coachingPoints: d.coachingPoints,
      variations: d.variations,
      videoUrl: d.videoUrl || null,
      sourceTitle: d.sourceTitle || null,
      sourceUrl: d.videoUrl || null,
      visibility: d.visibility,
      teamId: d.visibility === "TEAM" ? d.teamId : null,
      categories: { set: d.categoryIds.map((id) => ({ id })) },
    },
  });
  revalidatePath("/", "layout");
  redirect(`/drills/${drill.slug}`);
}

export async function deleteDrill(drillId: string) {
  const user = await requireUser();
  const existing = await db.drill.findUnique({ where: { id: drillId } });
  if (!existing || existing.authorId !== user.id) throw new Error("Not allowed");
  await db.drill.delete({ where: { id: drillId } });
  revalidatePath("/", "layout");
  redirect("/me");
}

export async function toggleSave(drillId: string, slug: string) {
  const user = await requireUser(`/drills/${slug}`);
  const where = { userId_drillId: { userId: user.id, drillId } };
  if (await db.personalSave.findUnique({ where })) {
    await db.personalSave.delete({ where });
  } else {
    await db.personalSave.create({ data: { userId: user.id, drillId } });
  }
  revalidatePath("/", "layout");
}

export async function toggleTeamDrill(teamId: string, drillId: string) {
  const user = await requireUser();
  const m = await getMembership(user.id, teamId);
  if (m?.role !== "COACH") throw new Error("Only coaches can change the team library.");
  const where = { teamId_drillId: { teamId, drillId } };
  if (await db.teamDrill.findUnique({ where })) {
    await db.teamDrill.delete({ where });
  } else {
    await db.teamDrill.create({ data: { teamId, drillId, addedById: user.id } });
  }
  revalidatePath("/", "layout");
}
