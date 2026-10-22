"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getMembership } from "@/lib/drills";
import { practiceHasStarted, removeSchedule, syncSchedule } from "@/lib/schedule";
import { wallClock } from "@/lib/time";
import type { FormState } from "./auth";

async function requireCoach(teamId: string) {
  const user = await requireUser();
  const m = await getMembership(user.id, teamId);
  if (m?.role !== "COACH") throw new Error("Only coaches can edit practices.");
  return user;
}

async function planForCoach(planId: string) {
  const plan = await db.practicePlan.findUniqueOrThrow({ where: { id: planId } });
  await requireCoach(plan.teamId);
  return plan;
}

const refresh = (plan: { id: string; teamId: string }) => {
  revalidatePath(`/teams/${plan.teamId}`);
  revalidatePath(`/teams/${plan.teamId}/plans/${plan.id}`);
};

// ---------- Recurring schedule ----------

const scheduleSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Choose a start time."),
  durationMin: z.coerce.number().int().min(15, "Practice must be at least 15 minutes.").max(480),
  location: z.string().trim().max(100),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose when the season starts."),
  endsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Choose when the season ends."),
});

function parseSchedule(formData: FormData) {
  const parsed = scheduleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const d = parsed.data;
  const startsOn = wallClock(d.startsOn);
  const endsOn = wallClock(d.endsOn);
  if (endsOn < startsOn) return { error: "The season must end after it starts." } as const;
  if (endsOn.getTime() - startsOn.getTime() > 400 * 86_400_000) return { error: "A season can be at most about a year long." } as const;
  return { data: { startTime: d.startTime, durationMin: d.durationMin, location: d.location, startsOn, endsOn } } as const;
}

export async function addSchedule(teamId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireCoach(teamId);
  const weekdays = formData.getAll("weekday").map(Number).filter((n) => n >= 0 && n <= 6);
  if (weekdays.length === 0) return { error: "Choose at least one weekday." };
  const parsed = parseSchedule(formData);
  if ("error" in parsed) return { error: parsed.error };
  for (const weekday of weekdays) {
    const schedule = await db.practiceSchedule.create({ data: { ...parsed.data, weekday, teamId } });
    await syncSchedule(schedule.id);
  }
  revalidatePath(`/teams/${teamId}`);
  return { success: "Schedule saved — practices have been added to the calendar." };
}

export async function updateSchedule(scheduleId: string, _: FormState, formData: FormData): Promise<FormState> {
  const schedule = await db.practiceSchedule.findUniqueOrThrow({ where: { id: scheduleId } });
  await requireCoach(schedule.teamId);
  const parsed = parseSchedule(formData);
  if ("error" in parsed) return { error: parsed.error };
  const weekday = Number(formData.get("weekday"));
  await db.practiceSchedule.update({
    where: { id: scheduleId },
    data: { ...parsed.data, weekday: weekday >= 0 && weekday <= 6 ? weekday : schedule.weekday },
  });
  await syncSchedule(scheduleId);
  revalidatePath(`/teams/${schedule.teamId}`);
  return { success: "Updated — all future practices have moved." };
}

export async function deleteSchedule(scheduleId: string) {
  const schedule = await db.practiceSchedule.findUniqueOrThrow({ where: { id: scheduleId } });
  await requireCoach(schedule.teamId);
  await removeSchedule(scheduleId);
  revalidatePath(`/teams/${schedule.teamId}`);
}

export async function setTeamTimezone(teamId: string, formData: FormData) {
  await requireCoach(teamId);
  const tz = String(formData.get("timezone") ?? "");
  if (!Intl.supportedValuesOf("timeZone").includes(tz)) return;
  await db.team.update({ where: { id: teamId }, data: { timezone: tz } });
  revalidatePath(`/teams/${teamId}`);
}

// ---------- Single practices ----------

const practiceSchema = z.object({
  title: z.string().trim().min(2, "Give the practice a title.").max(100),
  date: z.string(),
  time: z.string(),
  durationMin: z.string(),
  location: z.string().trim().max(100).default(""),
});

function practiceFields(formData: FormData) {
  const parsed = practiceSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message } as const;
  const { title, date, time, durationMin, location } = parsed.data;
  const minutes = Number(durationMin);
  return {
    data: {
      title,
      location,
      startsAt: date ? wallClock(date, time || "00:00") : null,
      durationMin: minutes > 0 ? Math.min(480, Math.round(minutes)) : null,
    },
  } as const;
}

export async function createPlan(teamId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCoach(teamId);
  const fields = practiceFields(formData);
  if ("error" in fields) return { error: fields.error };
  const plan = await db.practicePlan.create({ data: { ...fields.data, teamId, authorId: user.id } });
  redirect(`/teams/${teamId}/plans/${plan.id}`);
}

export async function updatePlanDetails(planId: string, _: FormState, formData: FormData): Promise<FormState> {
  const plan = await planForCoach(planId);
  const fields = practiceFields(formData);
  if ("error" in fields) return { error: fields.error };
  const moved = (fields.data.startsAt?.getTime() ?? null) !== (plan.startsAt?.getTime() ?? null);
  await db.practicePlan.update({
    where: { id: planId },
    data: {
      ...fields.data,
      notes: String(formData.get("notes") ?? "").slice(0, 2000),
      // A practice moved by hand no longer follows the recurring schedule.
      ...(moved ? { scheduleId: null } : {}),
    },
  });
  refresh(plan);
  return { success: moved && plan.scheduleId ? "Saved. This practice was moved, so it no longer follows the weekly schedule." : "Saved." };
}

export async function setCancelled(planId: string, cancelled: boolean) {
  const plan = await planForCoach(planId);
  await db.practicePlan.update({ where: { id: planId }, data: { cancelled } });
  refresh(plan);
}

export async function deletePlan(planId: string) {
  const plan = await planForCoach(planId);
  await db.practicePlan.delete({ where: { id: planId } });
  revalidatePath(`/teams/${plan.teamId}`);
  redirect(`/teams/${plan.teamId}`);
}

/** Copy the drills from another practice into this one (e.g. last week's plan). */
export async function copyPlanItems(planId: string, formData: FormData) {
  const plan = await planForCoach(planId);
  const source = await db.practicePlan.findUnique({ where: { id: String(formData.get("sourceId") ?? "") }, include: { items: true } });
  if (!source || source.teamId !== plan.teamId) return;
  const start = await db.practicePlanItem.count({ where: { planId } });
  await db.practicePlanItem.createMany({
    data: source.items
      .sort((a, b) => a.order - b.order)
      .map((i, n) => ({ planId, drillId: i.drillId, durationMin: i.durationMin, note: i.note, order: start + n })),
  });
  refresh(plan);
}

// ---------- Drills in a practice ----------

export async function addPlanItem(planId: string, formData: FormData) {
  const plan = await planForCoach(planId);
  const drill = await db.drill.findUnique({ where: { id: String(formData.get("drillId") ?? "") } });
  if (!drill) return;
  const count = await db.practicePlanItem.count({ where: { planId } });
  await db.practicePlanItem.create({ data: { planId, drillId: drill.id, order: count, durationMin: drill.durationMin } });
  refresh(plan);
}

export async function updatePlanItem(itemId: string, formData: FormData) {
  const item = await db.practicePlanItem.findUniqueOrThrow({ where: { id: itemId } });
  const plan = await planForCoach(item.planId);
  const duration = Math.max(1, Math.min(180, Number(formData.get("durationMin")) || item.durationMin));
  await db.practicePlanItem.update({
    where: { id: itemId },
    data: { durationMin: duration, note: String(formData.get("note") ?? "").slice(0, 300) },
  });
  refresh(plan);
}

/** Save a new order after drag & drop. */
export async function reorderPlanItems(planId: string, itemIds: string[]) {
  const plan = await planForCoach(planId);
  const items = await db.practicePlanItem.findMany({ where: { planId }, select: { id: true } });
  const valid = new Set(items.map((i) => i.id));
  await db.$transaction(
    itemIds.filter((id) => valid.has(id)).map((id, order) => db.practicePlanItem.update({ where: { id }, data: { order } })),
  );
  refresh(plan);
}

export async function removePlanItem(itemId: string) {
  const item = await db.practicePlanItem.findUniqueOrThrow({ where: { id: itemId } });
  const plan = await planForCoach(item.planId);
  await db.practicePlanItem.delete({ where: { id: itemId } });
  const rest = await db.practicePlanItem.findMany({ where: { planId: plan.id }, orderBy: { order: "asc" } });
  await db.$transaction(rest.map((x, order) => db.practicePlanItem.update({ where: { id: x.id }, data: { order } })));
  refresh(plan);
}

// ---------- Post-practice poll ----------

export async function ratePractice(planId: string, rating: number) {
  const user = await requireUser();
  const plan = await db.practicePlan.findUniqueOrThrow({ where: { id: planId }, include: { team: true } });
  if (!(await getMembership(user.id, plan.teamId))) throw new Error("Not a team member");
  if (plan.cancelled || !practiceHasStarted(plan, plan.team.timezone)) throw new Error("This practice can't be rated yet.");
  if (![1, 2, 3, 4].includes(rating)) throw new Error("Invalid rating");
  await db.practiceRating.upsert({
    where: { planId_userId: { planId, userId: user.id } },
    update: { rating },
    create: { planId, userId: user.id, rating },
  });
  refresh(plan);
}
