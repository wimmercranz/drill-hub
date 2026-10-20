import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "./db";

export const LEVELS = [
  { value: "BEGINNER", label: "Beginner" },
  { value: "INTERMEDIATE", label: "Intermediate" },
  { value: "ADVANCED", label: "Advanced" },
] as const;

export const levelLabel = (v: string) => LEVELS.find((l) => l.value === v)?.label ?? v;

export const lines = (text: string) =>
  text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

/** Prisma filter for drills a given user is allowed to see. */
export function visibleTo(userId: string | null): Prisma.DrillWhereInput {
  if (!userId) return { visibility: "PUBLIC" };
  return {
    OR: [
      { visibility: "PUBLIC" },
      { authorId: userId },
      { visibility: "TEAM", team: { memberships: { some: { userId } } } },
    ],
  };
}

export const drillCardInclude = {
  sport: true,
  categories: { orderBy: { order: "asc" } },
  _count: { select: { saves: true, teamDrills: true } },
} satisfies Prisma.DrillInclude;

export type DrillCardData = Prisma.DrillGetPayload<{ include: typeof drillCardInclude }>;

export async function getMembership(userId: string, teamId: string) {
  return db.membership.findUnique({ where: { userId_teamId: { userId, teamId } } });
}

export async function coachedTeams(userId: string) {
  return db.team.findMany({
    where: { memberships: { some: { userId, role: "COACH" } } },
    orderBy: { name: "asc" },
  });
}

/** How many times a drill has been "used": saved to a profile or added to a team library. */
export const usedCount = (d: { _count: { saves: number; teamDrills: number } }) => d._count.saves + d._count.teamDrills;
