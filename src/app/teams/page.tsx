import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createTeam, joinTeam } from "@/app/actions/teams";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Teams" };

export default async function TeamsPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const user = await requireUser("/teams");
  const [memberships, sports] = await Promise.all([
    db.membership.findMany({
      where: { userId: user.id },
      include: { team: { include: { sport: true, _count: { select: { memberships: true, drills: true, plans: true } } } } },
      orderBy: { createdAt: "asc" },
    }),
    db.sport.findMany({ where: { active: true } }),
  ]);

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Teams</h1>
      <p className="text-ink-500">Share drills and practice plans with your team.</p>
      {deleted && <p className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">The team has been deleted.</p>}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {memberships.map(({ team, role }) => (
          <Link key={team.id} href={`/teams/${team.id}`} className="card p-5 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md">
            <div className="flex items-start justify-between">
              <span className="text-3xl">{team.sport.emoji}</span>
              <span className={`chip ${role === "COACH" ? "bg-brand-100 text-brand-700" : ""}`}>{role === "COACH" ? "Coach" : "Player"}</span>
            </div>
            <h2 className="mt-3 text-lg font-bold">{team.name}</h2>
            <p className="mt-1 text-sm text-ink-500">
              {team._count.memberships} members · {team._count.drills} drills · {team._count.plans} plans
            </p>
          </Link>
        ))}
        {memberships.length === 0 && (
          <div className="card p-6 text-ink-500 sm:col-span-2 lg:col-span-3">You&apos;re not on a team yet. Create one or join with an invite code.</div>
        )}
      </div>

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="font-bold">Create a team</h2>
          <p className="mb-4 text-sm text-ink-500">You&apos;ll be the coach and get an invite code for your players.</p>
          <ActionForm action={createTeam} className="space-y-3">
            <input name="name" required placeholder="Team name, e.g. Hawks U14" className="input" />
            <select name="sportId" className="input">
              {sports.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
            </select>
            <SubmitButton pendingText="Creating…">Create team</SubmitButton>
          </ActionForm>
        </div>
        <div className="card p-5">
          <h2 className="font-bold">Join a team</h2>
          <p className="mb-4 text-sm text-ink-500">Got an invite code from your coach? Enter it here.</p>
          <ActionForm action={joinTeam} className="space-y-3">
            <input name="code" required placeholder="e.g. HAWKS1" className="input uppercase tracking-widest" maxLength={12} />
            <SubmitButton className="btn-secondary" pendingText="Joining…">Join team</SubmitButton>
          </ActionForm>
        </div>
      </div>
    </div>
  );
}
