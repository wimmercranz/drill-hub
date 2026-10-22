import { generateCodeVerifier, generateState } from "arctic";
import { cookies } from "next/headers";
import { google, googleConfigured } from "@/lib/google";

export async function GET(request: Request) {
  if (!googleConfigured()) return new Response("Google sign-in is not configured.", { status: 404 });
  const next = new URL(request.url).searchParams.get("next") ?? "";
  const state = generateState();
  const verifier = generateCodeVerifier();
  const url = google().createAuthorizationURL(state, verifier, ["openid", "profile", "email"]);
  url.searchParams.set("prompt", "select_account");

  const store = await cookies();
  const opts = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, maxAge: 600, path: "/" };
  store.set("google_state", state, opts);
  store.set("google_verifier", verifier, opts);
  store.set("google_next", next, opts);
  return Response.redirect(url);
}
