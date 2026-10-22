import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { drillCardInclude, visibleTo } from "@/lib/drills";
import { profileHref } from "@/lib/profiles";
import { thumbnailUrl } from "@/lib/video";
import DrillBoard, { type BoardCard, type BoardColumn } from "@/components/DrillBoard";
import DrillCard, { DrillGrid } from "@/components/DrillCard";

export const metadata = { title: "My Drills" };

export default async function MePage() {
  const user = await requireUser("/me");
  const [boards, saves, created, memberships] = await Promise.all([
    db.board.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } }),
    db.personalSave.findMany({
      where: { userId: user.id, drill: visibleTo(user.id) },
      include: { drill: { select: { id: true, slug: true, title: true, videoUrl: true, durationMin: true, level: true } } },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    }),
    db.drill.findMany({ where: { authorId: user.id }, include: drillCardInclude, orderBy: { createdAt: "desc" } }),
    db.membership.findMany({ where: { userId: user.id }, include: { team: { include: { sport: true } } } }),
  ]);

  const toCard = (s: (typeof saves)[number]): BoardCard => ({
    saveId: s.id,
    drillId: s.drill.id,
    slug: s.drill.slug,
    title: s.drill.title,
    thumbnail: thumbnailUrl(s.drill.videoUrl),
    durationMin: s.drill.durationMin,
    level: s.drill.level,
  });
  const columns: BoardColumn[] = [
    { id: null, title: "Unsorted", cards: saves.filter((s) => !s.boardId).map(toCard) },
    ...boards.map((b) => ({ id: b.id, title: b.title, cards: saves.filter((s) => s.boardId === b.id).map(toCard) })),
  ];

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">My Drills</h1>
          <p className="text-ink-500">
            {saves.length} saved drill{saves.length === 1 ? "" : "s"} · drag them between boards to organise ·{" "}
            <Link href={profileHref(user)} className="font-semibold text-brand-700">My profile</Link>
          </p>
        </div>
        <Link href="/drills" className="btn-primary">+ Find drills</Link>
      </div>

      {memberships.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {memberships.map((m) => (
            <Link key={m.id} href={`/teams/${m.teamId}`} className="card flex items-center gap-2 px-3 py-1.5 text-sm hover:border-brand-500">
              <span>{m.team.sport.emoji}</span>
              <span className="font-semibold">{m.team.name}</span>
              <span className="chip">{m.title || (m.role === "COACH" ? "Coach" : "Player")}</span>
            </Link>
          ))}
        </div>
      )}

      <section className="mt-6">
        {saves.length === 0 && boards.length === 0 ? (
          <div className="card p-8 text-center text-ink-500">
            You haven&apos;t collected any drills yet. <Link href="/drills" className="font-semibold text-brand-700">Browse the library →</Link>
            <p className="mt-2 text-sm">Tip: create boards like “Warm-ups” or “Summer program” and drag drills into them.</p>
          </div>
        ) : null}
        <DrillBoard columns={columns} />
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
