import Link from "next/link";
import { db } from "@/lib/db";
import { collectionState, drillCardInclude, usedCount } from "@/lib/drills";
import { getCurrentUser } from "@/lib/auth";
import DrillCard, { DrillGrid } from "@/components/DrillCard";

export default async function Home({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const { deleted } = await searchParams;
  const user = await getCurrentUser();
  const [drills, sports, categories, state] = await Promise.all([
    db.drill.findMany({ where: { visibility: "PUBLIC" }, include: drillCardInclude }),
    db.sport.findMany({ orderBy: { name: "asc" } }),
    db.category.findMany({
      where: { sport: { slug: "basketball" } },
      orderBy: { order: "asc" },
      include: { _count: { select: { drills: { where: { visibility: "PUBLIC" } } } } },
    }),
    collectionState(user?.id ?? null),
  ]);
  const popular = [...drills]
    .sort((a, b) => usedCount(b) - usedCount(a))
    .slice(0, 8);
  const newest = [...drills].sort((a, b) => +b.createdAt - +a.createdAt).slice(0, 4);

  return (
    <>
      {deleted && (
        <p className="bg-emerald-50 py-3 text-center text-sm text-emerald-800">Your account and personal data have been deleted.</p>
      )}
      <section className="relative overflow-hidden bg-ink-900 text-white [contain:paint]">
        <div className="absolute -right-24 -top-24 h-96 w-96 rounded-full bg-brand-600/30 blur-3xl" />
        <div className="container-page relative py-16 sm:py-24">
          <p className="mb-3 text-sm font-semibold uppercase tracking-wider text-brand-500">🏀 Basketball · more sports coming</p>
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight sm:text-5xl">
            Every great practice starts with the right drill.
          </h1>
          <p className="mt-4 max-w-xl text-lg text-slate-300">
            Discover proven drills, collect your favourites, share them with your team and build practice plans in minutes.
          </p>
          <form action="/drills" className="mt-8 flex max-w-lg gap-2">
            <input name="q" placeholder="Search drills — e.g. layups, defense, passing…" className="input flex-1 text-ink-900" />
            <button className="btn-primary">Search</button>
          </form>
          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link href="/drills" className="btn bg-white/10 text-white hover:bg-white/20">Browse all {drills.length} drills →</Link>
            <Link href="/signup" className="btn bg-white/10 text-white hover:bg-white/20">Create your team</Link>
          </div>
        </div>
      </section>

      <section className="container-page py-10">
        <h2 className="mb-4 text-xl font-bold">Browse by skill</h2>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <Link key={c.id} href={`/drills?cat=${c.slug}`} className="card px-4 py-2 text-sm font-semibold hover:border-brand-500 hover:text-brand-700">
              {c.name} <span className="ml-1 text-ink-500">{c._count.drills}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="container-page pb-10">
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold">Most used drills</h2>
          <Link href="/drills?sort=popular" className="text-sm font-semibold text-brand-700">See all →</Link>
        </div>
        <DrillGrid>
          {popular.map((d) => <DrillCard key={d.id} drill={d} state={state} />)}
        </DrillGrid>
      </section>

      <section className="border-y border-slate-200 bg-white py-12">
        <div className="container-page grid gap-8 sm:grid-cols-3">
          {[
            ["1", "Discover", "Browse a curated library of drills with video, step-by-step setup and coaching points."],
            ["2", "Collect", "Save drills to your personal page, or add them to your team's library as a coach."],
            ["3", "Plan", "Put your team's drills into a timed practice plan and share it with your players."],
          ].map(([n, title, text]) => (
            <div key={n}>
              <div className="mb-3 grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-bold text-brand-700">{n}</div>
              <h3 className="font-bold">{title}</h3>
              <p className="mt-1 text-sm text-ink-500">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="container-page py-10">
        <h2 className="mb-4 text-xl font-bold">Recently added</h2>
        <DrillGrid>
          {newest.map((d) => <DrillCard key={d.id} drill={d} state={state} />)}
        </DrillGrid>
      </section>

      <section className="container-page pb-14">
        <div className="card flex flex-wrap items-center gap-3 p-5">
          <span className="font-semibold">Sports:</span>
          {sports.map((s) => (
            <span key={s.id} className={`chip ${s.active ? "bg-brand-100 text-brand-700" : ""}`}>
              {s.emoji} {s.name} {!s.active && "· soon"}
            </span>
          ))}
        </div>
      </section>
    </>
  );
}
