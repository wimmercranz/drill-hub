import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { drillCardInclude, visibleTo } from "@/lib/drills";
import { toggleSave } from "@/app/actions/drills";
import DrillCard, { DrillGrid } from "@/components/DrillCard";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "My Drills" };

export default async function MePage() {
  const user = await requireUser("/me");
  const [saves, created, memberships] = await Promise.all([
    db.personalSave.findMany({
      where: { userId: user.id, drill: visibleTo(user.id) },
      include: { drill: { include: drillCardInclude } },
      orderBy: { createdAt: "desc" },
    }),
    db.drill.findMany({ where: { authorId: user.id }, include: drillCardInclude, orderBy: { createdAt: "desc" } }),
    db.membership.findMany({ where: { userId: user.id }, include: { team: { include: { sport: true } } } }),
  ]);

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Hi {user.name.split(" ")[0]} 👋</h1>
      <p className="text-ink-500">
        Your personal drill collection ·{" "}
        <Link href="/settings" className="font-semibold text-brand-700">Profile & clubs settings</Link>
      </p>

      {memberships.length > 0 && (
        <div className="mt-6 flex flex-wrap gap-2">
          {memberships.map((m) => (
            <Link key={m.id} href={`/teams/${m.teamId}`} className="card flex items-center gap-2 px-4 py-2 text-sm hover:border-brand-500">
              <span>{m.team.sport.emoji}</span>
              <span className="font-semibold">{m.team.name}</span>
              <span className="chip">{m.role === "COACH" ? "Coach" : "Player"}</span>
            </Link>
          ))}
        </div>
      )}

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">My Drills <span className="text-ink-500">({saves.length})</span></h2>
        {saves.length === 0 ? (
          <div className="card p-8 text-center text-ink-500">
            You haven&apos;t collected any drills yet. <Link href="/drills" className="font-semibold text-brand-700">Browse the library →</Link>
          </div>
        ) : (
          <DrillGrid>
            {saves.map((s) => (
              <DrillCard
                key={s.id}
                drill={s.drill}
                footer={
                  <form action={toggleSave.bind(null, s.drill.id, s.drill.slug)}>
                    <SubmitButton className="btn-ghost btn-sm text-ink-500" pendingText="…">Remove</SubmitButton>
                  </form>
                }
              />
            ))}
          </DrillGrid>
        )}
      </section>

      <section className="mt-12">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-bold">Drills I created <span className="text-ink-500">({created.length})</span></h2>
          <Link href="/drills/new" className="btn-secondary">+ New drill</Link>
        </div>
        {created.length === 0 ? (
          <div className="card p-8 text-center text-ink-500">Got a drill that isn&apos;t here yet? Add it — text only is fine.</div>
        ) : (
          <DrillGrid>
            {created.map((d) => <DrillCard key={d.id} drill={d} />)}
          </DrillGrid>
        )}
      </section>
    </div>
  );
}
