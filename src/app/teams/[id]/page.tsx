import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { drillCardInclude } from "@/lib/drills";
import { toggleTeamDrill } from "@/app/actions/drills";
import { regenerateInvite, removeMember, setMemberRole, updateTeamDrillNote } from "@/app/actions/teams";
import { createPlan } from "@/app/actions/plans";
import ActionForm from "@/components/ActionForm";
import CopyButton from "@/components/CopyButton";
import DrillCard, { DrillGrid } from "@/components/DrillCard";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Team" };

export default async function TeamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/teams/${id}`);
  const team = await db.team.findUnique({
    where: { id },
    include: {
      sport: true,
      memberships: { include: { user: { select: { id: true, name: true, email: true } } }, orderBy: [{ role: "asc" }, { createdAt: "asc" }] },
      drills: { include: { drill: { include: drillCardInclude } }, orderBy: { createdAt: "desc" } },
      plans: { include: { items: true }, orderBy: [{ date: "desc" }, { createdAt: "desc" }] },
    },
  });
  const me = team?.memberships.find((m) => m.userId === user.id);
  if (!team || !me) notFound();
  const isCoach = me.role === "COACH";

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;
  const inviteLink = `${origin}/join/${team.inviteCode}`;

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-700">{team.sport.emoji} {team.sport.name} team</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{team.name}</h1>
          <p className="text-ink-500">
            {team.memberships.length} members · {team.drills.length} drills · you are a {isCoach ? "coach" : "player"}
          </p>
        </div>
        {isCoach && (
          <div className="card p-4 text-sm">
            <p className="font-semibold">Invite players</p>
            <div className="mt-2 flex items-center gap-2">
              <code className="rounded bg-slate-100 px-2 py-1 text-base font-bold tracking-widest">{team.inviteCode}</code>
              <CopyButton text={inviteLink} label="Copy invite link" />
              <form action={regenerateInvite.bind(null, team.id)}>
                <SubmitButton className="btn-ghost btn-sm" pendingText="…" confirm="Create a new code? The old link will stop working.">New code</SubmitButton>
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Practice plans */}
      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">Practice plans</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {team.plans.map((p) => (
            <Link key={p.id} href={`/teams/${team.id}/plans/${p.id}`} className="card p-4 transition hover:border-brand-500 hover:shadow-md">
              <p className="text-xs font-semibold uppercase text-ink-500">
                {p.date ? p.date.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }) : "No date"}
              </p>
              <h3 className="mt-1 font-bold">{p.title}</h3>
              <p className="mt-1 text-sm text-ink-500">
                {p.items.length} drills · {p.items.reduce((sum, i) => sum + i.durationMin, 0)} min
              </p>
            </Link>
          ))}
          {isCoach && (
            <div className="card border-dashed p-4">
              <p className="mb-2 font-semibold">New practice plan</p>
              <ActionForm action={createPlan.bind(null, team.id)} className="space-y-2">
                <input name="title" required placeholder="e.g. Tuesday — shooting focus" className="input" />
                <input name="date" type="date" className="input" />
                <SubmitButton className="btn-primary w-full" pendingText="Creating…">Create plan</SubmitButton>
              </ActionForm>
            </div>
          )}
          {!isCoach && team.plans.length === 0 && <p className="text-ink-500">No practice plans yet.</p>}
        </div>
      </section>

      {/* Team library */}
      <section className="mt-12">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-bold">Team drill library <span className="text-ink-500">({team.drills.length})</span></h2>
          {isCoach && <Link href="/drills" className="btn-secondary">+ Collect more drills</Link>}
        </div>
        {team.drills.length === 0 ? (
          <div className="card p-8 text-center text-ink-500">
            {isCoach ? <>Open any drill and click <strong>“Add to {team.name}”</strong> to build your library.</> : "Your coach hasn't added any drills yet."}
          </div>
        ) : (
          <DrillGrid>
            {team.drills.map((td) => (
              <DrillCard
                key={td.id}
                drill={td.drill}
                footer={
                  isCoach ? (
                    <div className="space-y-2">
                      <form action={updateTeamDrillNote.bind(null, td.id)} className="flex gap-1">
                        <input name="note" defaultValue={td.note} placeholder="Note for players…" className="input py-1 text-xs" />
                        <SubmitButton className="btn-ghost btn-sm" pendingText="…">Save</SubmitButton>
                      </form>
                      <form action={toggleTeamDrill.bind(null, team.id, td.drill.id)}>
                        <SubmitButton className="btn-ghost btn-sm text-ink-500" pendingText="…">Remove from team</SubmitButton>
                      </form>
                    </div>
                  ) : td.note ? (
                    <p className="text-xs text-ink-700">📝 {td.note}</p>
                  ) : undefined
                }
              />
            ))}
          </DrillGrid>
        )}
      </section>

      {/* Members */}
      <section className="mt-12">
        <h2 className="mb-4 text-xl font-bold">Members</h2>
        <div className="card divide-y divide-slate-100">
          {team.memberships.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-slate-200 text-sm font-bold">{m.user.name.slice(0, 1).toUpperCase()}</span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">{m.user.name}{m.userId === user.id && " (you)"}</p>
                {isCoach && <p className="truncate text-xs text-ink-500">{m.user.email}</p>}
              </div>
              <span className={`chip ${m.role === "COACH" ? "bg-brand-100 text-brand-700" : ""}`}>{m.role === "COACH" ? "Coach" : "Player"}</span>
              {isCoach && m.userId !== user.id && (
                <>
                  <form action={setMemberRole.bind(null, team.id, m.id, m.role === "COACH" ? "PLAYER" : "COACH")}>
                    <SubmitButton className="btn-ghost btn-sm" pendingText="…">{m.role === "COACH" ? "Make player" : "Make coach"}</SubmitButton>
                  </form>
                  <form action={removeMember.bind(null, team.id, m.id)}>
                    <SubmitButton className="btn-ghost btn-sm text-red-600" pendingText="…" confirm={`Remove ${m.user.name} from the team?`}>Remove</SubmitButton>
                  </form>
                </>
              )}
              {m.userId === user.id && (
                <form action={removeMember.bind(null, team.id, m.id)}>
                  <SubmitButton className="btn-ghost btn-sm text-ink-500" pendingText="…" confirm="Leave this team?">Leave team</SubmitButton>
                </form>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
