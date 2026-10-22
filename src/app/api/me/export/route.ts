import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** GDPR "right of access / data portability": all personal data as a JSON file. */
export async function GET() {
  const session = await getCurrentUser();
  if (!session) return new Response("Not logged in", { status: 401 });
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    select: {
      name: true, email: true, username: true, bio: true, profileVisibility: true, createdAt: true,
      termsAcceptedAt: true, termsVersion: true, googleId: true,
      clubs: { select: { role: true, createdAt: true, club: { select: { name: true, city: true } } } },
      memberships: { select: { role: true, title: true, createdAt: true, team: { select: { name: true } } } },
      boards: { select: { title: true, saves: { select: { drill: { select: { title: true, slug: true } } } } } },
      saves: { select: { createdAt: true, drill: { select: { title: true, slug: true } } } },
      drills: { select: { title: true, summary: true, setup: true, steps: true, coachingPoints: true, variations: true, videoUrl: true, visibility: true, createdAt: true } },
      ratings: { select: { rating: true, createdAt: true, plan: { select: { title: true, startsAt: true } } } },
      plans: { select: { title: true, startsAt: true, notes: true } },
    },
  });
  return new Response(JSON.stringify({ exportedAt: new Date(), ...user }, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="drill-hub-data-${user.username ?? "me"}.json"`,
    },
  });
}
