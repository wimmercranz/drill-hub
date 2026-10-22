"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { USERNAME_RE } from "@/lib/profiles";
import { slugify } from "@/lib/slug";
import { similarClubs } from "@/lib/clubs";
import type { FormState } from "./auth";

const profileSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(60),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME_RE, "Username: 3–30 characters, lowercase letters, numbers and dashes."),
  bio: z.string().trim().max(300, "Bio can be at most 300 characters."),
  profileVisibility: z.enum(["PUBLIC", "PRIVATE"]),
});

export async function updateProfile(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/settings");
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const taken = await db.user.findUnique({ where: { username: parsed.data.username } });
  if (taken && taken.id !== user.id) return { error: "That username is already taken." };
  await db.user.update({ where: { id: user.id }, data: parsed.data });
  revalidatePath("/", "layout");
  return { success: "Profile saved." };
}

export async function createClub(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/clubs");
  const parsed = z
    .object({
      name: z.string().trim().min(2, "Club name is too short.").max(80),
      city: z.string().trim().max(60),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Avoid duplicate clubs: ask the user to confirm when a very similar club exists.
  const similar = await similarClubs(parsed.data.name, 1);
  if (similar.length && similar[0].score >= 0.99 && formData.get("confirmNew") !== "on") {
    return {
      error: `“${similar[0].name}”${similar[0].city ? ` (${similar[0].city})` : ""} already exists — join it instead, or tick “This is a different club” to create a new one.`,
    };
  }

  const base = slugify(parsed.data.name) || "club";
  let slug = base;
  for (let i = 2; await db.club.findUnique({ where: { slug } }); i++) slug = `${base}-${i}`;

  await db.club.create({
    data: { ...parsed.data, slug, members: { create: { userId: user.id, role: "ADMIN" } } },
  });
  redirect(`/clubs/${slug}`);
}

export async function joinClub(clubId: string) {
  const user = await requireUser("/clubs");
  await db.clubMember.upsert({
    where: { userId_clubId: { userId: user.id, clubId } },
    update: {},
    create: { userId: user.id, clubId },
  });
  revalidatePath("/", "layout");
}

/** Leave a club yourself, or (as a club admin) remove another member. */
export async function removeClubMember(clubId: string, memberId: string) {
  const user = await requireUser("/clubs");
  const target = await db.clubMember.findUnique({ where: { id: memberId } });
  if (!target || target.clubId !== clubId) throw new Error("Member not found");
  if (target.userId !== user.id) {
    const me = await db.clubMember.findUnique({ where: { userId_clubId: { userId: user.id, clubId } } });
    if (me?.role !== "ADMIN") throw new Error("Only club admins can remove members.");
  }
  if (target.role === "ADMIN") {
    const admins = await db.clubMember.count({ where: { clubId, role: "ADMIN" } });
    const members = await db.clubMember.count({ where: { clubId } });
    if (admins <= 1 && members > 1) throw new Error("Make someone else admin before leaving.");
  }
  await db.clubMember.delete({ where: { id: memberId } });
  revalidatePath("/", "layout");
}

export async function setClubRole(clubId: string, memberId: string, role: "ADMIN" | "MEMBER") {
  const user = await requireUser("/clubs");
  const me = await db.clubMember.findUnique({ where: { userId_clubId: { userId: user.id, clubId } } });
  if (me?.role !== "ADMIN") throw new Error("Only club admins can change roles.");
  const target = await db.clubMember.findUnique({ where: { id: memberId } });
  if (!target || target.clubId !== clubId) throw new Error("Member not found");
  if (role === "MEMBER" && (await db.clubMember.count({ where: { clubId, role: "ADMIN" } })) <= 1) {
    throw new Error("A club needs at least one admin.");
  }
  await db.clubMember.update({ where: { id: memberId }, data: { role } });
  revalidatePath("/", "layout");
}

const MAX_AVATAR_BYTES = 300_000;

export async function updateAvatar(dataUrl: string) {
  const user = await requireUser("/settings");
  if (!dataUrl.startsWith("data:image/jpeg;base64,") || dataUrl.length > MAX_AVATAR_BYTES) {
    return { error: "Please choose a smaller image." };
  }
  await db.user.update({ where: { id: user.id }, data: { avatar: dataUrl, avatarUpdatedAt: new Date() } });
  revalidatePath("/", "layout");
  return { success: "Picture updated." };
}

export async function removeAvatar() {
  const user = await requireUser("/settings");
  await db.user.update({ where: { id: user.id }, data: { avatar: null, avatarUpdatedAt: null } });
  revalidatePath("/", "layout");
}

/** GDPR "right to erasure": delete the account and all personal data. */
export async function deleteAccount(_: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser("/settings");
  if (String(formData.get("confirm") ?? "").trim().toUpperCase() !== "DELETE") {
    return { error: "Type DELETE to confirm." };
  }
  const coached = await db.membership.findMany({
    where: { userId: user.id, role: "COACH" },
    include: { team: { include: { memberships: true } } },
  });
  const teamsToDelete: string[] = [];
  for (const m of coached) {
    const otherCoaches = m.team.memberships.filter((x) => x.role === "COACH" && x.userId !== user.id);
    const others = m.team.memberships.filter((x) => x.userId !== user.id);
    if (others.length === 0) teamsToDelete.push(m.teamId);
    else if (otherCoaches.length === 0) {
      return { error: `You're the only coach of ${m.team.name}. Make someone else coach (or remove the other members) first.` };
    }
  }
  await db.$transaction([
    db.team.deleteMany({ where: { id: { in: teamsToDelete } } }),
    // Private and team drills are personal content and go with the account; public drills stay without a name.
    db.drill.deleteMany({ where: { authorId: user.id, visibility: { not: "PUBLIC" } } }),
    db.user.delete({ where: { id: user.id } }),
  ]);
  redirect("/?deleted=1");
}
