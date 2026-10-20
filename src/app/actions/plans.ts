"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getMembership } from "@/lib/drills";
import type { FormState } from "./auth";

async function requireCoach(teamId: string) {
  const user = await requireUser();
  const m = await getMembership(user.id, teamId);
  if (m?.role !== "COACH") throw new Error("Only coaches can edit practice plans.");
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

export async function createPlan(teamId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCoach(teamId);
  const parsed = z
    .object({ title: z.string().trim().min(2, "Give the plan a title.").max(100), date: z.string() })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const plan = await db.practicePlan.create({
    data: {
      teamId,
      authorId: user.id,
      title: parsed.data.title,
      date: parsed.data.date ? new Date(parsed.data.date) : null,
    },
  });
  redirect(`/teams/${teamId}/plans/${plan.id}`);
}

export async function updatePlanDetails(planId: string, formData: FormData) {
  const plan = await planForCoach(planId);
  const title = String(formData.get("title") ?? "").trim() || plan.title;
  const date = String(formData.get("date") ?? "");
  await db.practicePlan.update({
    where: { id: planId },
    data: { title: title.slice(0, 100), date: date ? new Date(date) : null, notes: String(formData.get("notes") ?? "").slice(0, 2000) },
  });
  refresh(plan);
}

export async function deletePlan(planId: string) {
  const plan = await planForCoach(planId);
  await db.practicePlan.delete({ where: { id: planId } });
  revalidatePath(`/teams/${plan.teamId}`);
  redirect(`/teams/${plan.teamId}`);
}

export async function addPlanItem(planId: string, formData: FormData) {
  const plan = await planForCoach(planId);
  const drillId = String(formData.get("drillId") ?? "");
  const drill = await db.drill.findUnique({ where: { id: drillId } });
  if (!drill) return;
  const count = await db.practicePlanItem.count({ where: { planId } });
  await db.practicePlanItem.create({
    data: { planId, drillId, order: count, durationMin: drill.durationMin },
  });
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

export async function movePlanItem(itemId: string, direction: "up" | "down") {
  const item = await db.practicePlanItem.findUniqueOrThrow({ where: { id: itemId } });
  const plan = await planForCoach(item.planId);
  const items = await db.practicePlanItem.findMany({ where: { planId: plan.id }, orderBy: { order: "asc" } });
  const i = items.findIndex((x) => x.id === itemId);
  const j = direction === "up" ? i - 1 : i + 1;
  if (j < 0 || j >= items.length) return;
  [items[i], items[j]] = [items[j], items[i]];
  await db.$transaction(items.map((x, order) => db.practicePlanItem.update({ where: { id: x.id }, data: { order } })));
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
