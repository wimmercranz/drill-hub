"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { USERNAME_RE } from "@/lib/profiles";
import { slugify } from "@/lib/slug";
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
