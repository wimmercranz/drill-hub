import Link from "next/link";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { joinTeam } from "@/app/actions/teams";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Join team" };

export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.toUpperCase();
  const [user, team] = await Promise.all([
    getCurrentUser(),
    db.team.findUnique({ where: { inviteCode: code }, include: { sport: true, _count: { select: { memberships: true } } } }),
  ]);

  if (team && user) {
    const existing = await db.membership.findUnique({ where: { userId_teamId: { userId: user.id, teamId: team.id } } });
    if (existing) redirect(`/teams/${team.id}`);
  }

  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-md p-6 text-center">
        {!team ? (
          <>
            <h1 className="text-2xl font-extrabold">Invite not found</h1>
            <p className="mt-2 text-ink-500">This invite link is invalid or has been replaced. Ask your coach for a new one.</p>
          </>
        ) : (
          <>
            <div className="text-5xl">{team.sport.emoji}</div>
            <h1 className="mt-3 text-2xl font-extrabold">Join {team.name}</h1>
            <p className="mt-1 text-ink-500">{team._count.memberships} members · {team.sport.name}</p>
            {user ? (
              <ActionForm action={joinTeam} className="mt-6">
                <input type="hidden" name="code" value={code} />
                <SubmitButton className="btn-primary w-full" pendingText="Joining…">Join as player</SubmitButton>
              </ActionForm>
            ) : (
              <div className="mt-6 flex gap-2">
                <Link href={`/signup?next=/join/${code}`} className="btn-primary flex-1">Sign up to join</Link>
                <Link href={`/login?next=/join/${code}`} className="btn-secondary flex-1">Log in</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
