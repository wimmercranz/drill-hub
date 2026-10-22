import { decodeIdToken } from "arctic";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { createSession } from "@/lib/auth";
import { google } from "@/lib/google";
import { uniqueUsername } from "@/lib/profiles";

type GoogleClaims = { sub: string; email?: string; email_verified?: boolean; name?: string };

export async function GET(request: Request) {
  const url = new URL(request.url);
  const store = await cookies();
  const state = store.get("google_state")?.value;
  const verifier = store.get("google_verifier")?.value;
  const nextCookie = store.get("google_next")?.value ?? "";
  const next = nextCookie.startsWith("/") && !nextCookie.startsWith("//") ? nextCookie : "/me";

  if (!state || !verifier || url.searchParams.get("state") !== state || !url.searchParams.get("code")) {
    redirect("/login?error=google");
  }

  let claims: GoogleClaims;
  try {
    const tokens = await google().validateAuthorizationCode(url.searchParams.get("code")!, verifier);
    claims = decodeIdToken(tokens.idToken()) as GoogleClaims;
  } catch {
    redirect("/login?error=google");
  }
  if (!claims.email || !claims.email_verified) redirect("/login?error=google-email");

  const email = claims.email.toLowerCase();
  let user = await db.user.findUnique({ where: { googleId: claims.sub } });
  if (!user) {
    const byEmail = await db.user.findUnique({ where: { email } });
    if (byEmail) {
      // Same verified e-mail: link Google to the existing account.
      user = await db.user.update({ where: { id: byEmail.id }, data: { googleId: claims.sub } });
    } else {
      const name = claims.name?.trim() || email.split("@")[0];
      user = await db.user.create({
        data: { name, email, googleId: claims.sub, username: await uniqueUsername(name) },
      });
    }
  }
  store.delete("google_state");
  store.delete("google_verifier");
  store.delete("google_next");
  await createSession(user.id);
  // New Google accounts are sent to /welcome by requireUser to accept the terms.
  redirect(user.termsAcceptedAt ? next : `/welcome?next=${encodeURIComponent(next)}`);
}
