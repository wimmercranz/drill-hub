import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { acceptInvite } from "@/app/actions/teams";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Team invitation" };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [user, invite] = await Promise.all([
    getCurrentUser(),
    db.teamInvite.findUnique({
      where: { token },
      include: { team: { include: { sport: true, _count: { select: { memberships: true } } } }, invitedBy: { select: { name: true } } },
    }),
  ]);

  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-md p-6 text-center">
        {!invite || invite.acceptedAt ? (
          <>
            <h1 className="text-2xl font-extrabold">Invitation not valid</h1>
            <p className="mt-2 text-ink-500">This invitation has already been used or was withdrawn. Ask your coach for a new one.</p>
            {invite?.acceptedAt && user && <Link href={`/teams/${invite.teamId}`} className="btn-primary mt-6">Go to the team</Link>}
          </>
        ) : (
          <>
            <div className="text-5xl">{invite.team.sport.emoji}</div>
            <h1 className="mt-3 text-2xl font-extrabold">Join {invite.team.name}</h1>
            <p className="mt-1 text-ink-500">
              {invite.invitedBy ? `${invite.invitedBy.name} invited you` : "You're invited"} to join as{" "}
              <strong>{invite.role === "COACH" ? (invite.title || "coach").toLowerCase() : "a player"}</strong>.
            </p>
            {user ? (
              <form action={acceptInvite.bind(null, token)} className="mt-6">
                <SubmitButton className="btn-primary w-full" pendingText="Joining…">Accept invitation</SubmitButton>
              </form>
            ) : (
              <div className="mt-6 flex gap-2">
                <Link href={`/signup?next=/invite/${token}`} className="btn-primary flex-1">Sign up to join</Link>
                <Link href={`/login?next=/invite/${token}`} className="btn-secondary flex-1">Log in</Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
