"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getMembership } from "@/lib/drills";
import { randomCode } from "@/lib/slug";
import type { FormState } from "./auth";

async function newInviteCode() {
  for (;;) {
    const code = randomCode();
    if (!(await db.team.findUnique({ where: { inviteCode: code } }))) return code;
  }
}

async function requireCoach(teamId: string) {
  const user = await requireUser();
  const m = await getMembership(user.id, teamId);
  if (m?.role !== "COACH") throw new Error("Only coaches can do this.");
  return user;
}

export async function createTeam(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const parsed = z
    .object({ name: z.string().trim().min(2, "Team name is too short.").max(80), sportId: z.string().min(1) })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const team = await db.team.create({
    data: {
      ...parsed.data,
      inviteCode: await newInviteCode(),
      memberships: { create: { userId: user.id, role: "COACH" } },
    },
  });
  redirect(`/teams/${team.id}`);
}

export async function joinTeam(_: FormState, formData: FormData): Promise<FormState> {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const user = await requireUser(`/join/${code}`);
  const team = await db.team.findUnique({ where: { inviteCode: code } });
  if (!team) return { error: "No team found with that code." };
  await db.membership.upsert({
    where: { userId_teamId: { userId: user.id, teamId: team.id } },
    update: {},
    create: { userId: user.id, teamId: team.id, role: "PLAYER" },
  });
  redirect(`/teams/${team.id}`);
}

export async function setMemberRole(teamId: string, membershipId: string, role: "COACH" | "PLAYER") {
  const user = await requireCoach(teamId);
  const target = await db.membership.findUnique({ where: { id: membershipId } });
  if (!target || target.teamId !== teamId) throw new Error("Member not found");
  if (target.userId === user.id && role === "PLAYER") {
    const coaches = await db.membership.count({ where: { teamId, role: "COACH" } });
    if (coaches <= 1) throw new Error("A team needs at least one coach.");
  }
  await db.membership.update({ where: { id: membershipId }, data: { role } });
  revalidatePath(`/teams/${teamId}`);
}

export async function removeMember(teamId: string, membershipId: string) {
  const user = await requireUser();
  const target = await db.membership.findUnique({ where: { id: membershipId } });
  if (!target || target.teamId !== teamId) throw new Error("Member not found");
  const leavingSelf = target.userId === user.id;
  if (!leavingSelf) await requireCoach(teamId);
  if (target.role === "COACH") {
    const coaches = await db.membership.count({ where: { teamId, role: "COACH" } });
    if (coaches <= 1) throw new Error("A team needs at least one coach.");
  }
  await db.membership.delete({ where: { id: membershipId } });
  if (leavingSelf) redirect("/teams");
  revalidatePath(`/teams/${teamId}`);
}

export async function regenerateInvite(teamId: string) {
  await requireCoach(teamId);
  await db.team.update({ where: { id: teamId }, data: { inviteCode: await newInviteCode() } });
  revalidatePath(`/teams/${teamId}`);
}

export async function updateTeamDrillNote(teamDrillId: string, formData: FormData) {
  const td = await db.teamDrill.findUniqueOrThrow({ where: { id: teamDrillId } });
  await requireCoach(td.teamId);
  await db.teamDrill.update({
    where: { id: teamDrillId },
    data: { note: String(formData.get("note") ?? "").slice(0, 300) },
  });
  revalidatePath(`/teams/${td.teamId}`);
}
