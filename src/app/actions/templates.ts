"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getMembership } from "@/lib/drills";
import { isAutoTitle } from "@/lib/schedule";
import type { FormState } from "./auth";

const cleanTitle = (v: FormDataEntryValue | null) => String(v ?? "").trim().slice(0, 100);

/** The saved practice, if it belongs to the logged-in user. */
async function myTemplate(templateId: string) {
  const user = await requireUser("/me?tab=practices");
  const template = await db.practiceTemplate.findUnique({ where: { id: templateId } });
  if (!template || template.ownerId !== user.id) throw new Error("Saved practice not found");
  return template;
}

const refresh = (templateId?: string) => {
  revalidatePath("/me");
  if (templateId) revalidatePath(`/me/practices/${templateId}`);
};

async function uniqueTitle(ownerId: string, title: string, ignoreId?: string) {
  const clash = await db.practiceTemplate.findUnique({ where: { ownerId_title: { ownerId, title } } });
  return !clash || clash.id === ignoreId;
}

// ---------- On My Drills ----------

export async function createTemplate(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/me?tab=practices");
  const title = cleanTitle(formData.get("title"));
  if (title.length < 2) return { error: "Give the practice a name." };
  if (!(await uniqueTitle(user.id, title))) return { error: "You already have a saved practice with that name." };
  const template = await db.practiceTemplate.create({ data: { title, ownerId: user.id } });
  redirect(`/me/practices/${template.id}`);
}

export async function updateTemplate(templateId: string, _: FormState, formData: FormData): Promise<FormState> {
  const template = await myTemplate(templateId);
  const title = cleanTitle(formData.get("title"));
  if (title.length < 2) return { error: "Name is too short." };
  if (!(await uniqueTitle(template.ownerId, title, templateId))) return { error: "You already have a saved practice with that name." };
  await db.practiceTemplate.update({ where: { id: templateId }, data: { title, notes: String(formData.get("notes") ?? "").slice(0, 2000) } });
  refresh(templateId);
  return { success: "Saved." };
}

export async function deleteTemplate(templateId: string) {
  await myTemplate(templateId);
  await db.practiceTemplate.delete({ where: { id: templateId } });
  refresh();
  redirect("/me?tab=practices");
}

export async function addTemplateItem(templateId: string, formData: FormData) {
  await myTemplate(templateId);
  const drill = await db.drill.findUnique({ where: { id: String(formData.get("drillId") ?? "") } });
  if (!drill) return;
  const count = await db.practiceTemplateItem.count({ where: { templateId } });
  await db.practiceTemplateItem.create({ data: { templateId, drillId: drill.id, order: count, durationMin: drill.durationMin } });
  refresh(templateId);
}

/** From a drill page: add the drill to one of my saved practices. */
export async function addDrillToTemplate(drillId: string, slug: string, formData: FormData) {
  const templateId = String(formData.get("templateId") ?? "");
  await myTemplate(templateId);
  const drill = await db.drill.findUniqueOrThrow({ where: { id: drillId } });
  const count = await db.practiceTemplateItem.count({ where: { templateId } });
  await db.practiceTemplateItem.create({ data: { templateId, drillId, order: count, durationMin: drill.durationMin } });
  refresh(templateId);
  revalidatePath(`/drills/${slug}`);
}

export async function updateTemplateItem(itemId: string, formData: FormData) {
  const item = await db.practiceTemplateItem.findUniqueOrThrow({ where: { id: itemId } });
  await myTemplate(item.templateId);
  await db.practiceTemplateItem.update({
    where: { id: itemId },
    data: {
      durationMin: Math.max(1, Math.min(180, Number(formData.get("durationMin")) || item.durationMin)),
      note: String(formData.get("note") ?? "").slice(0, 300),
    },
  });
  refresh(item.templateId);
}

export async function reorderTemplateItems(templateId: string, itemIds: string[]) {
  await myTemplate(templateId);
  const items = await db.practiceTemplateItem.findMany({ where: { templateId }, select: { id: true } });
  const valid = new Set(items.map((i) => i.id));
  await db.$transaction(
    itemIds.filter((id) => valid.has(id)).map((id, order) => db.practiceTemplateItem.update({ where: { id }, data: { order } })),
  );
  refresh(templateId);
}

export async function removeTemplateItem(itemId: string) {
  const item = await db.practiceTemplateItem.findUniqueOrThrow({ where: { id: itemId } });
  await myTemplate(item.templateId);
  await db.practiceTemplateItem.delete({ where: { id: itemId } });
  refresh(item.templateId);
}

// ---------- From / to a team practice ----------

async function planForCoach(planId: string) {
  const user = await requireUser();
  const plan = await db.practicePlan.findUniqueOrThrow({ where: { id: planId }, include: { items: { orderBy: { order: "asc" } } } });
  const m = await getMembership(user.id, plan.teamId);
  if (m?.role !== "COACH") throw new Error("Only coaches can edit practices.");
  return { user, plan };
}

/** Save a team practice's drills to My Drills → Practices. Saving under an existing name updates it. */
export async function saveAsTemplate(planId: string, _: FormState, formData: FormData): Promise<FormState> {
  const { user, plan } = await planForCoach(planId);
  const title = cleanTitle(formData.get("title"));
  if (title.length < 2) return { error: "Give the saved practice a name." };
  if (plan.items.length === 0) return { error: "Add some drills first — there's nothing to save yet." };

  const items = plan.items.map((i, order) => ({ order, drillId: i.drillId, durationMin: i.durationMin, note: i.note }));
  const existing = await db.practiceTemplate.findUnique({ where: { ownerId_title: { ownerId: user.id, title } } });
  if (existing) {
    await db.$transaction([
      db.practiceTemplateItem.deleteMany({ where: { templateId: existing.id } }),
      db.practiceTemplate.update({ where: { id: existing.id }, data: { notes: plan.notes, items: { create: items } } }),
    ]);
  } else {
    await db.practiceTemplate.create({ data: { title, notes: plan.notes, ownerId: user.id, items: { create: items } } });
  }
  refresh();
  return { success: existing ? `Updated your saved practice “${title}”.` : `Saved as “${title}” under My Drills → Practices.` };
}

/** Put a saved practice's drills into a team practice — added at the end, or replacing what's there. */
export async function applyTemplate(planId: string, formData: FormData) {
  const { user, plan } = await planForCoach(planId);
  const template = await db.practiceTemplate.findUnique({
    where: { id: String(formData.get("templateId") ?? "") },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!template || template.ownerId !== user.id) return;
  const replace = formData.get("mode") === "replace";
  const start = replace ? 0 : plan.items.length;

  await db.$transaction([
    ...(replace ? [db.practicePlanItem.deleteMany({ where: { planId } })] : []),
    db.practicePlanItem.createMany({
      data: template.items.map((i, n) => ({ planId, drillId: i.drillId, durationMin: i.durationMin, note: i.note, order: start + n })),
    }),
    // A practice with an automatic name ("Tuesday practice") takes the saved practice's name when replaced.
    ...(replace && isAutoTitle(plan.title) ? [db.practicePlan.update({ where: { id: planId }, data: { title: template.title } })] : []),
    ...(!plan.notes && template.notes ? [db.practicePlan.update({ where: { id: planId }, data: { notes: template.notes } })] : []),
  ]);
  revalidatePath(`/teams/${plan.teamId}`);
  revalidatePath(`/teams/${plan.teamId}/plans/${planId}`);
}
