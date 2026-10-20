import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { createClub } from "@/app/actions/profile";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Clubs" };

export default async function ClubsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const user = await getCurrentUser();
  const clubs = await db.club.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { city: { contains: q } }] } : {},
    include: { _count: { select: { members: true } }, members: user ? { where: { userId: user.id } } : false },
    orderBy: { name: "asc" },
    take: 100,
  });

  return (
    <div className="container-page py-8">
      <h1 className="text-3xl font-extrabold tracking-tight">Clubs</h1>
      <p className="text-ink-500">Find your club and show it on your profile.</p>

      <form className="mt-6 flex max-w-lg gap-2">
        <input name="q" defaultValue={q} placeholder="Search by club name or city…" className="input" />
        <button className="btn-primary">Search</button>
      </form>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {clubs.map((c) => (
          <Link key={c.id} href={`/clubs/${c.slug}`} className="card p-5 transition hover:border-brand-500 hover:shadow-md">
            <div className="flex items-start justify-between gap-2">
              <h2 className="text-lg font-bold">{c.name}</h2>
              {c.members?.length > 0 && <span className="chip bg-brand-100 text-brand-700">Member</span>}
            </div>
            <p className="text-sm text-ink-500">{c.city && `${c.city} · `}{c._count.members} member{c._count.members === 1 ? "" : "s"}</p>
          </Link>
        ))}
        {clubs.length === 0 && <p className="text-ink-500">No clubs found{q && ` for “${q}”`}.</p>}
      </div>

      <div className="card mt-10 max-w-lg p-5">
        <h2 className="font-bold">Can&apos;t find your club?</h2>
        {user ? (
          <>
            <p className="mb-4 text-sm text-ink-500">Create it — you&apos;ll become the club admin.</p>
            <ActionForm action={createClub} className="space-y-3">
              <input name="name" required placeholder="Club name" className="input" />
              <input name="city" placeholder="City (optional)" className="input" />
              <SubmitButton pendingText="Creating…">Create club</SubmitButton>
            </ActionForm>
          </>
        ) : (
          <p className="mt-2 text-sm text-ink-500"><Link href="/login?next=/clubs" className="font-semibold text-brand-700">Log in</Link> to create a club.</p>
        )}
      </div>
    </div>
  );
}
