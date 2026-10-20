import "server-only";
import { db } from "./db";
import { slugify } from "./slug";

export const USERNAME_RE = /^[a-z0-9][a-z0-9-]{2,29}$/;

export async function uniqueUsername(name: string, ignoreUserId?: string) {
  const base = (slugify(name) || "user").slice(0, 24).replace(/-+$/, "");
  let candidate = base.length >= 3 ? base : `${base}-player`;
  for (let i = 2; ; i++) {
    const existing = await db.user.findUnique({ where: { username: candidate } });
    if (!existing || existing.id === ignoreUserId) return candidate;
    candidate = `${base}-${i}`;
  }
}

export function profileHref(user: { id: string; username: string | null }) {
  return `/u/${user.username ?? user.id}`;
}

/**
 * Public profiles are visible to everyone. Private profiles are visible to the
 * owner and to people who share a team with them.
 */
export async function canViewProfile(viewerId: string | null, profile: { id: string; profileVisibility: string }) {
  if (profile.profileVisibility === "PUBLIC" || viewerId === profile.id) return true;
  if (!viewerId) return false;
  const shared = await db.team.count({
    where: {
      AND: [
        { memberships: { some: { userId: viewerId } } },
        { memberships: { some: { userId: profile.id } } },
      ],
    },
  });
  return shared > 0;
}
