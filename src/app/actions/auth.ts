"use server";

import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createSession, destroyAllSessions, destroySession, getCurrentUser } from "@/lib/auth";
import { appUrl, sendEmail } from "@/lib/email";
import { TERMS_VERSION } from "@/lib/legal";
import { uniqueUsername } from "@/lib/profiles";

export type FormState = { error?: string; success?: string } | undefined;

const safeNext = (next: FormDataEntryValue | null) => {
  const n = typeof next === "string" ? next : "";
  return n.startsWith("/") && !n.startsWith("//") ? n : "/me";
};

const signupSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name.").max(60),
  email: z.string().trim().toLowerCase().email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters."),
  terms: z.literal("on", "Please accept the terms and privacy policy."),
  age: z.literal("on", "Please confirm your age or parental consent."),
});

export async function signup(_: FormState, formData: FormData): Promise<FormState> {
  const parsed = signupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, email, password } = parsed.data;

  if (await db.user.findUnique({ where: { email } })) {
    return { error: "An account with this email already exists. Try logging in." };
  }
  const user = await db.user.create({
    data: {
      name,
      email,
      username: await uniqueUsername(name),
      passwordHash: await bcrypt.hash(password, 10),
      termsAcceptedAt: new Date(),
      termsVersion: TERMS_VERSION,
    },
  });
  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function login(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.passwordHash) {
    return { error: "This account uses Google sign-in. Use “Continue with Google”, or reset your password to add one." };
  }
  if (!user?.passwordHash || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "Wrong email or password." };
  }
  await createSession(user.id);
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  await destroySession();
  redirect("/");
}

/** Used by Google sign-up: accept the terms before continuing. */
export async function acceptTerms(_: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (formData.get("terms") !== "on") return { error: "Please accept the terms and privacy policy." };
  if (formData.get("age") !== "on") return { error: "Please confirm your age or parental consent." };
  await db.user.update({ where: { id: user.id }, data: { termsAcceptedAt: new Date(), termsVersion: TERMS_VERSION } });
  redirect(safeNext(formData.get("next")));
}

const hashToken = (t: string) => createHash("sha256").update(t).digest("hex");

export async function requestPasswordReset(_: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const user = await db.user.findUnique({ where: { email } });
  if (user) {
    const token = randomBytes(32).toString("hex");
    await db.passwordResetToken.create({
      data: { id: hashToken(token), userId: user.id, expiresAt: new Date(Date.now() + 60 * 60 * 1000) },
    });
    await sendEmail({
      to: user.email,
      subject: "Reset your Drill Hub password",
      text: `Hi ${user.name},\n\nClick the link below to choose a new password. The link is valid for 1 hour.\n\n${appUrl()}/reset-password/${token}\n\nIf you didn't ask for this, you can ignore this e-mail.\n\n— Drill Hub`,
    });
  }
  // Same answer whether or not the account exists, so e-mail addresses can't be probed.
  return { success: "If an account exists for that e-mail, we've sent a reset link. Check your inbox." };
}

export async function resetPassword(token: string, _: FormState, formData: FormData): Promise<FormState> {
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  const record = await db.passwordResetToken.findUnique({ where: { id: hashToken(token) } });
  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired. Please request a new one." };
  }
  await db.$transaction([
    db.user.update({ where: { id: record.userId }, data: { passwordHash: await bcrypt.hash(password, 10) } }),
    db.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
  ]);
  await destroyAllSessions(record.userId);
  await createSession(record.userId);
  redirect("/me");
}
