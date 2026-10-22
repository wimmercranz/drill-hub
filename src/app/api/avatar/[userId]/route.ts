import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { canViewProfile } from "@/lib/profiles";

export async function GET(_: Request, { params }: { params: Promise<{ userId: string }> }) {
  const { userId } = await params;
  const user = await db.user.findUnique({ where: { id: userId }, select: { id: true, avatar: true, profileVisibility: true } });
  const viewer = await getCurrentUser();
  // Private profiles' pictures are only shown to people who can see the profile.
  if (!user?.avatar || !(await canViewProfile(viewer?.id ?? null, user))) {
    return new Response("Not found", { status: 404 });
  }
  const [, base64] = user.avatar.split(",");
  return new Response(Buffer.from(base64, "base64"), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": user.profileVisibility === "PUBLIC" ? "public, max-age=31536000, immutable" : "private, max-age=31536000, immutable",
    },
  });
}
