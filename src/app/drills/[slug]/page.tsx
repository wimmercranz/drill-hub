import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { coachedTeams, collectionState, drillCardInclude, levelLabel, lines, usedCount, visibleTo } from "@/lib/drills";
import { embedUrl } from "@/lib/video";
import { profileHref } from "@/lib/profiles";
import { deleteDrill, moveSaveToBoard, toggleSave, toggleTeamDrill } from "@/app/actions/drills";
import DrillCard from "@/components/DrillCard";
import SubmitButton from "@/components/SubmitButton";

type Props = { params: Promise<{ slug: string }> };

async function loadDrill(slug: string, userId: string | null) {
  return db.drill.findFirst({
    where: { AND: [{ slug }, visibleTo(userId)] },
    include: {
      ...drillCardInclude,
      author: { select: { id: true, name: true, username: true } },
      team: { select: { id: true, name: true } },
    },
  });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const user = await getCurrentUser();
  const drill = await loadDrill((await params).slug, user?.id ?? null);
  return { title: drill?.title ?? "Drill", description: drill?.summary };
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="mb-3 text-lg font-bold">{title}</h2>
      {children}
    </section>
  );
}

export default async function DrillPage({ params }: Props) {
  const { slug } = await params;
  const user = await getCurrentUser();
  const drill = await loadDrill(slug, user?.id ?? null);
  if (!drill) notFound();

  const [saved, teams, teamLinks, related, state, boards] = await Promise.all([
    user ? db.personalSave.findUnique({ where: { userId_drillId: { userId: user.id, drillId: drill.id } } }) : null,
    user ? coachedTeams(user.id) : [],
    user ? db.teamDrill.findMany({ where: { drillId: drill.id, team: { memberships: { some: { userId: user.id } } } } }) : [],
    db.drill.findMany({
      where: {
        AND: [
          visibleTo(user?.id ?? null),
          { id: { not: drill.id } },
          { categories: { some: { id: { in: drill.categories.map((c) => c.id) } } } },
        ],
      },
      include: drillCardInclude,
      take: 3,
    }),
    collectionState(user?.id ?? null),
    user ? db.board.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } }) : [],
  ]);

  const embed = embedUrl(drill.videoUrl);
  const steps = lines(drill.steps);
  const points = lines(drill.coachingPoints);
  const variations = lines(drill.variations);
  const used = usedCount(drill);
  const isAuthor = !!user && drill.authorId === user.id;

  return (
    <div className="container-page py-8">
      <nav className="mb-4 text-sm text-ink-500">
        <Link href="/drills" className="hover:text-brand-700">Drills</Link>
        {drill.categories[0] && (
          <>
            {" / "}
            <Link href={`/drills?cat=${drill.categories[0].slug}`} className="hover:text-brand-700">{drill.categories[0].name}</Link>
          </>
        )}
      </nav>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <article>
          <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{drill.title}</h1>
          <p className="mt-2 text-lg text-ink-700">{drill.summary}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <span className="chip">{drill.sport.emoji} {drill.sport.name}</span>
            <span className="chip">📶 {levelLabel(drill.level)}</span>
            <span className="chip">⏱ {drill.durationMin} min</span>
            <span className="chip">👥 {drill.minPlayers}+ players</span>
            {drill.equipment && <span className="chip">🎒 {drill.equipment}</span>}
            {drill.categories.map((c) => (
              <Link key={c.id} href={`/drills?cat=${c.slug}`} className="chip bg-brand-50 text-brand-700 hover:bg-brand-100">{c.name}</Link>
            ))}
          </div>

          {embed && (
            <div className="mt-6">
              <div className="aspect-video overflow-hidden rounded-xl bg-black shadow">
                <iframe
                  src={embed}
                  title={drill.sourceTitle ?? drill.title}
                  className="h-full w-full"
                  allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
              {drill.sourceUrl && (
                <p className="mt-2 text-xs text-ink-500">
                  Video: <a href={drill.sourceUrl} target="_blank" rel="noopener noreferrer" className="font-medium text-brand-700 underline">
                    {drill.sourceTitle ?? "Watch on the original site"}
                  </a>{" "}
                  — embedded from its creator. If it doesn&apos;t play here, open it on YouTube.
                </p>
              )}
            </div>
          )}

          {drill.setup && (
            <Section title="Setup">
              <p className="text-ink-700">{drill.setup}</p>
            </Section>
          )}
          {steps.length > 0 && (
            <Section title="How it works">
              <ol className="space-y-3">
                {steps.map((s, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand-600 text-sm font-bold text-white">{i + 1}</span>
                    <span className="pt-0.5 text-ink-700">{s}</span>
                  </li>
                ))}
              </ol>
            </Section>
          )}
          {points.length > 0 && (
            <Section title="Coaching points">
              <ul className="space-y-2">
                {points.map((p, i) => (
                  <li key={i} className="flex gap-2 text-ink-700"><span className="text-brand-600">✔</span>{p}</li>
                ))}
              </ul>
            </Section>
          )}
          {variations.length > 0 && (
            <Section title="Variations">
              <ul className="list-disc space-y-1 pl-5 text-ink-700">
                {variations.map((v, i) => <li key={i}>{v}</li>)}
              </ul>
            </Section>
          )}
        </article>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div className="card p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-brand-50 text-2xl font-extrabold text-brand-700">{used}</div>
              <div>
                <h2 className="font-bold">Used {used} time{used === 1 ? "" : "s"}</h2>
                <p className="text-xs text-ink-500">
                  {drill._count.saves} personal collection{drill._count.saves === 1 ? "" : "s"} · {drill._count.teamDrills} team librar{drill._count.teamDrills === 1 ? "y" : "ies"}
                </p>
              </div>
            </div>
            {user ? (
              <div className="space-y-2">
                <form action={toggleSave.bind(null, drill.id, drill.slug)}>
                  <SubmitButton className={saved ? "btn-secondary w-full" : "btn-primary w-full"} pendingText="…">
                    {saved ? "✓ In My Drills (remove)" : "★ Save to My Drills"}
                  </SubmitButton>
                </form>
                {saved && boards.length > 0 && (
                  <form action={moveSaveToBoard.bind(null, drill.id)} className="flex gap-1">
                    <select name="boardId" defaultValue={saved.boardId ?? ""} className="input py-1.5" aria-label="Board">
                      <option value="">Board: Unsorted</option>
                      {boards.map((b) => <option key={b.id} value={b.id}>Board: {b.title}</option>)}
                    </select>
                    <SubmitButton className="btn-secondary btn-sm" pendingText="…">Move</SubmitButton>
                  </form>
                )}
                {teams.map((t) => {
                  const inTeam = teamLinks.some((l) => l.teamId === t.id);
                  return (
                    <form key={t.id} action={toggleTeamDrill.bind(null, t.id, drill.id)}>
                      <SubmitButton className="btn-secondary w-full" pendingText="…">
                        {inTeam ? `✓ In ${t.name} (remove)` : `+ Add to ${t.name}`}
                      </SubmitButton>
                    </form>
                  );
                })}
                {teams.length === 0 && (
                  <p className="pt-2 text-xs text-ink-500">
                    Coaching a team? <Link href="/teams" className="font-semibold text-brand-700">Create one</Link> to build a shared library.
                  </p>
                )}
              </div>
            ) : (
              <Link href={`/login?next=/drills/${drill.slug}`} className="btn-primary w-full">Log in to collect</Link>
            )}
          </div>

          <div className="card p-5 text-sm text-ink-700">
            <p>
              {drill.author ? <>Added by <Link href={profileHref(drill.author)} className="font-semibold hover:text-brand-700">{drill.author.name}</Link></> : <>Curated by <strong>Drillpin</strong></>}
            </p>
            {drill.team && <p className="mt-1">Visible to team <strong>{drill.team.name}</strong></p>}
            {drill.visibility === "PRIVATE" && <p className="mt-1">🔒 Only you can see this drill</p>}
            {isAuthor && (
              <div className="mt-4 flex gap-2">
                <Link href={`/drills/${drill.slug}/edit`} className="btn-secondary flex-1">Edit</Link>
                <form action={deleteDrill.bind(null, drill.id)} className="flex-1">
                  <SubmitButton className="btn-ghost w-full text-red-600" pendingText="Deleting…" confirm="Delete this drill permanently?">Delete</SubmitButton>
                </form>
              </div>
            )}
          </div>
        </aside>
      </div>

      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-4 text-xl font-bold">Related drills</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((d) => <DrillCard key={d.id} drill={d} state={state} />)}
          </div>
        </section>
      )}
    </div>
  );
}
