import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { drillCardInclude, visibleTo } from "@/lib/drills";
import { profileHref } from "@/lib/profiles";
import { thumbnailUrl } from "@/lib/video";
import TeamAvatar from "@/components/TeamAvatar";
import DrillBoard, { type BoardCard, type BoardColumn } from "@/components/DrillBoard";
import DrillCard, { DrillGrid } from "@/components/DrillCard";
import { createTemplate } from "@/app/actions/templates";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "My Drills" };

const TABS = [
  ["board", "Board"],
  ["practices", "Practices"],
  ["created", "Created by me"],
] as const;

export default async function MePage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { tab = "board" } = await searchParams;
  const user = await requireUser("/me");
  const [boards, saves, created, memberships, templates] = await Promise.all([
    db.board.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } }),
    db.personalSave.findMany({
      where: { userId: user.id, drill: visibleTo(user.id) },
      include: { drill: { select: { id: true, slug: true, title: true, videoUrl: true, durationMin: true, level: true } } },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
    }),
    db.drill.findMany({ where: { authorId: user.id }, include: drillCardInclude, orderBy: { createdAt: "desc" } }),
    db.membership.findMany({ where: { userId: user.id }, include: { team: { include: { sport: true } } } }),
    db.practiceTemplate.findMany({
      where: { ownerId: user.id },
      include: { items: { select: { durationMin: true } } },
      orderBy: { updatedAt: "desc" },
    }),
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
              <TeamAvatar team={m.team} size="xs" />
              <span className="font-semibold">{m.team.name}</span>
              <span className="chip">{m.title || (m.role === "COACH" ? "Coach" : "Player")}</span>
            </Link>
          ))}
        </div>
      )}

      <nav className="mt-6 flex gap-1 border-b border-slate-200">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/me?tab=${key}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-900"}`}
          >
            {label}
            {key === "practices" && templates.length > 0 && <span className="ml-1 text-ink-500">({templates.length})</span>}
          </Link>
        ))}
      </nav>

      {tab === "practices" ? (
        <section className="mt-6">
          <p className="mb-4 max-w-2xl text-sm text-ink-500">
            Saved practices are sets of drills you run again and again — e.g. “Monthly shooting session”. Build one here, or save any
            team practice with <strong>“Save for reuse”</strong>. Then use it in any of your teams&apos; practices with one click.
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((t) => (
              <Link key={t.id} href={`/me/practices/${t.id}`} className="card p-5 transition hover:-translate-y-0.5 hover:border-brand-500 hover:shadow-md">
                <div className="text-2xl">📋</div>
                <h2 className="mt-2 text-lg font-bold">{t.title}</h2>
                <p className="text-sm text-ink-500">
                  {t.items.length} drill{t.items.length === 1 ? "" : "s"} · {t.items.reduce((sum, i) => sum + i.durationMin, 0)} min
                </p>
              </Link>
            ))}
            <div className="card border-dashed p-5">
              <p className="mb-2 font-semibold">+ New saved practice</p>
              <ActionForm action={createTemplate} className="space-y-2">
                <input name="title" required placeholder="e.g. Monthly shooting session" className="input" />
                <SubmitButton className="btn-primary w-full" pendingText="Creating…">Create</SubmitButton>
              </ActionForm>
            </div>
          </div>
        </section>
      ) : tab === "created" ? (
        <section className="mt-6">
          <div className="mb-4 flex items-center justify-between">
            <p className="text-ink-500">{created.length} drill{created.length === 1 ? "" : "s"} you created</p>
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
      ) : (
        <section className="mt-6">
          {saves.length === 0 && boards.length === 0 && (
            <div className="card mb-4 p-8 text-center text-ink-500">
              You haven&apos;t collected any drills yet. <Link href="/drills" className="font-semibold text-brand-700">Browse the library →</Link>
              <p className="mt-2 text-sm">Tip: create boards like “Warm-ups” or “Summer program” and drag drills into them.</p>
            </div>
          )}
          <DrillBoard columns={columns} />
        </section>
      )}
    </div>
  );
}
