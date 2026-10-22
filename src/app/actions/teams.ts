"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getMembership } from "@/lib/drills";
import { randomBytes } from "crypto";
import { randomCode } from "@/lib/slug";
import { appUrl, sendEmail } from "@/lib/email";
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
      memberships: { create: { userId: user.id, role: "COACH", title: "Head coach" } },
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
  await db.membership.update({ where: { id: membershipId }, data: { role, title: role === "PLAYER" ? "" : target.title || "Assistant coach" } });
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

export async function setMemberTitle(teamId: string, membershipId: string, formData: FormData) {
  await requireCoach(teamId);
  const target = await db.membership.findUnique({ where: { id: membershipId } });
  if (!target || target.teamId !== teamId) throw new Error("Member not found");
  await db.membership.update({ where: { id: membershipId }, data: { title: String(formData.get("title") ?? "").trim().slice(0, 40) } });
  revalidatePath(`/teams/${teamId}`);
}

const inviteSchema = z.object({
  emails: z.string(),
  role: z.enum(["PLAYER", "COACH"]),
  title: z.string().trim().max(40).default(""),
});

/** Invite people by e-mail. Each person gets a personal link to join the team. */
export async function inviteByEmail(teamId: string, _: FormState, formData: FormData): Promise<FormState> {
  const user = await requireCoach(teamId);
  const parsed = inviteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: "Please check the form." };
  const emails = [...new Set(parsed.data.emails.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const invalid = emails.filter((e) => !z.string().email().safeParse(e).success);
  if (emails.length === 0) return { error: "Enter at least one e-mail address." };
  if (invalid.length) return { error: `Not valid e-mail address: ${invalid.join(", ")}` };
  if (emails.length > 50) return { error: "You can invite at most 50 people at a time." };

  const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });
  const { role } = parsed.data;
  const title = role === "COACH" ? parsed.data.title || "Assistant coach" : "";
  let sent = 0;
  for (const email of emails) {
    const token = randomBytes(24).toString("base64url");
    await db.teamInvite.create({ data: { token, email, role, title, teamId, invitedById: user.id } });
    const res = await sendEmail({
      to: email,
      subject: `${user.name} invited you to ${team.name} on Drillpin`,
      text: `Hi!\n\n${user.name} has invited you to join ${team.name} on Drillpin as ${role === "COACH" ? title.toLowerCase() || "coach" : "a player"}.\n\nDrillpin is where your team shares drills and practice plans.\n\nJoin here: ${appUrl()}/invite/${token}\n\n— Drillpin`,
    });
    if (res.sent) sent++;
  }
  revalidatePath(`/teams/${teamId}`);
  return {
    success:
      sent === emails.length
        ? `Invitation sent to ${emails.length} ${emails.length === 1 ? "person" : "people"}.`
        : `Created ${emails.length} invitation${emails.length === 1 ? "" : "s"}. E-mail isn't set up yet, so copy the links below and send them yourself.`,
  };
}

export async function revokeInvite(inviteId: string) {
  const invite = await db.teamInvite.findUniqueOrThrow({ where: { id: inviteId } });
  await requireCoach(invite.teamId);
  await db.teamInvite.delete({ where: { id: inviteId } });
  revalidatePath(`/teams/${invite.teamId}`);
}

export async function acceptInvite(token: string) {
  const user = await requireUser(`/invite/${token}`);
  const invite = await db.teamInvite.findUnique({ where: { token } });
  if (!invite || invite.acceptedAt) redirect(`/invite/${token}`);
  const existing = await getMembership(user.id, invite.teamId);
  await db.$transaction([
    existing
      ? db.membership.update({
          where: { id: existing.id },
          // An invite can promote a player to coach, but never demotes anyone.
          data: invite.role === "COACH" ? { role: "COACH", title: invite.title } : {},
        })
      : db.membership.create({ data: { userId: user.id, teamId: invite.teamId, role: invite.role, title: invite.title } }),
    db.teamInvite.update({ where: { id: invite.id }, data: { acceptedAt: new Date() } }),
  ]);
  redirect(`/teams/${invite.teamId}`);
}

/** Permanently delete a team with its practices, schedule, library and invitations. */
export async function deleteTeam(teamId: string, _: FormState, formData: FormData): Promise<FormState> {
  await requireCoach(teamId);
  const team = await db.team.findUniqueOrThrow({ where: { id: teamId } });
  if (String(formData.get("confirm") ?? "").trim() !== team.name) {
    return { error: `Type the team name “${team.name}” exactly to confirm.` };
  }
  await db.team.delete({ where: { id: teamId } });
  revalidatePath("/", "layout");
  redirect("/teams?deleted=1");
}
