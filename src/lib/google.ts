import "server-only";
import { Google } from "arctic";
import { appUrl } from "./email";

export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export function google() {
  return new Google(process.env.GOOGLE_CLIENT_ID!, process.env.GOOGLE_CLIENT_SECRET!, `${appUrl()}/auth/google/callback`);
}
