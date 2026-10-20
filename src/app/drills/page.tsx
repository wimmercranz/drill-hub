import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { LEVELS, drillCardInclude, visibleTo } from "@/lib/drills";
import DrillCard, { DrillGrid } from "@/components/DrillCard";

export const metadata = { title: "Drills" };

type Search = { q?: string; cat?: string; level?: string; sort?: string; video?: string };

export default async function DrillsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const { q = "", cat = "", level = "", sort = "popular", video = "" } = await searchParams;
  const user = await getCurrentUser();

  const filters: Prisma.DrillWhereInput[] = [visibleTo(user?.id ?? null), { sport: { slug: "basketball" } }];
  if (q) {
    filters.push({
      OR: [{ title: { contains: q } }, { summary: { contains: q } }, { equipment: { contains: q } }],
    });
  }
  if (cat) filters.push({ categories: { some: { slug: cat } } });
  if (level) filters.push({ level });
  if (video === "yes") filters.push({ videoUrl: { not: null } });
  if (video === "no") filters.push({ videoUrl: null });

  const [drills, categories] = await Promise.all([
    db.drill.findMany({ where: { AND: filters }, include: drillCardInclude }),
    db.category.findMany({ where: { sport: { slug: "basketball" } }, orderBy: { order: "asc" } }),
  ]);

  const score = (d: (typeof drills)[number]) => d._count.saves + d._count.teamDrills;
  drills.sort((a, b) =>
    sort === "new" ? +b.createdAt - +a.createdAt
    : sort === "az" ? a.title.localeCompare(b.title)
    : sort === "short" ? a.durationMin - b.durationMin
    : score(b) - score(a) || a.title.localeCompare(b.title),
  );

  const activeCat = categories.find((c) => c.slug === cat);
  const hasFilters = q || cat || level || video;

  return (
    <div className="container-page py-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight">{activeCat ? `${activeCat.name} drills` : "Drill library"}</h1>
          <p className="text-ink-500">{drills.length} drill{drills.length === 1 ? "" : "s"} · 🏀 Basketball</p>
        </div>
        {user && <Link href="/drills/new" className="btn-primary">+ Add your own drill</Link>}
      </div>

      <form className="card mb-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        <input name="q" defaultValue={q} placeholder="Search drills…" className="input" />
        <select name="cat" defaultValue={cat} className="input">
          <option value="">All skills</option>
          {categories.map((c) => <option key={c.id} value={c.slug}>{c.name}</option>)}
        </select>
        <select name="level" defaultValue={level} className="input">
          <option value="">All levels</option>
          {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
        </select>
        <select name="video" defaultValue={video} className="input">
          <option value="">Video & text</option>
          <option value="yes">With video</option>
          <option value="no">Text only</option>
        </select>
        <select name="sort" defaultValue={sort} className="input">
          <option value="popular">Most collected</option>
          <option value="new">Newest</option>
          <option value="short">Shortest</option>
          <option value="az">A–Z</option>
        </select>
        <div className="flex gap-2">
          <button className="btn-primary flex-1">Filter</button>
          {hasFilters && <Link href="/drills" className="btn-ghost">Clear</Link>}
        </div>
      </form>

      {drills.length === 0 ? (
        <div className="card p-10 text-center text-ink-500">
          No drills match your filters. <Link href="/drills" className="font-semibold text-brand-700">Clear filters</Link>
        </div>
      ) : (
        <DrillGrid>
          {drills.map((d) => <DrillCard key={d.id} drill={d} />)}
        </DrillGrid>
      )}
    </div>
  );
}
