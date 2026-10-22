import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

/** Team picture — only shown to logged-in users (a team photo can show people, e.g. young players). */
export async function GET(_: Request, { params }: { params: Promise<{ teamId: string }> }) {
  const { teamId } = await params;
  const team = await db.team.findUnique({ where: { id: teamId }, select: { avatar: true } });
  const viewer = await getCurrentUser();
  if (!team?.avatar || !viewer) return new Response("Not found", { status: 404 });
  const [, base64] = team.avatar.split(",");
  return new Response(Buffer.from(base64, "base64"), {
    headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, max-age=31536000, immutable" },
  });
}
