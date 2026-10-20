import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { drillCardInclude, visibleTo } from "@/lib/drills";
import { canViewProfile } from "@/lib/profiles";
import Avatar from "@/components/Avatar";
import DrillCard, { DrillGrid } from "@/components/DrillCard";

export const metadata = { title: "Profile" };

export default async function ProfilePage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  const viewer = await getCurrentUser();
  const profile = await db.user.findFirst({
    where: { OR: [{ username: handle.toLowerCase() }, { id: handle }] },
    select: { id: true, name: true, username: true, bio: true, profileVisibility: true, createdAt: true },
  });
  if (!profile) notFound();
  const isMe = viewer?.id === profile.id;

  if (!(await canViewProfile(viewer?.id ?? null, profile))) {
    return (
      <div className="container-page flex justify-center py-16">
        <div className="card w-full max-w-md p-8 text-center">
          <div className="flex justify-center"><Avatar name={profile.name} size="lg" /></div>
          <h1 className="mt-4 text-2xl font-extrabold">{profile.name}</h1>
          <p className="mt-2 text-ink-500">🔒 This profile is private.</p>
        </div>
      </div>
    );
  }

  const drillFilter = visibleTo(viewer?.id ?? null);
  const [clubs, memberships, saves, created] = await Promise.all([
    db.clubMember.findMany({ where: { userId: profile.id }, include: { club: true } }),
    db.membership.findMany({ where: { userId: profile.id }, include: { team: { include: { sport: true } } } }),
    db.personalSave.findMany({
      where: { userId: profile.id, drill: drillFilter },
      include: { drill: { include: drillCardInclude } },
      orderBy: { createdAt: "desc" },
    }),
    db.drill.findMany({ where: { AND: [{ authorId: profile.id }, drillFilter] }, include: drillCardInclude, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="container-page py-8">
      <div className="card flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
        <Avatar name={profile.name} size="lg" />
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{profile.name}</h1>
          <p className="text-sm text-ink-500">
            {profile.username && `@${profile.username} · `}
            {profile.profileVisibility === "PUBLIC" ? "🌍 Public profile" : "🔒 Private profile"}
          </p>
          {profile.bio && <p className="mt-2 max-w-2xl text-ink-700">{profile.bio}</p>}
          <div className="mt-3 flex flex-wrap gap-2">
            {clubs.map((c) => (
              <Link key={c.id} href={`/clubs/${c.club.slug}`} className="chip bg-ink-900 text-white hover:bg-ink-700">🏛 {c.club.name}</Link>
            ))}
            {memberships.map((m) => (
              <span key={m.id} className="chip">{m.team.sport.emoji} {m.team.name} · {m.role === "COACH" ? "Coach" : "Player"}</span>
            ))}
          </div>
        </div>
        <div className="flex gap-6 text-center sm:flex-col sm:gap-2">
          <div><div className="text-2xl font-extrabold">{saves.length}</div><div className="text-xs text-ink-500">collected</div></div>
          <div><div className="text-2xl font-extrabold">{created.length}</div><div className="text-xs text-ink-500">created</div></div>
        </div>
        {isMe && <Link href="/settings" className="btn-secondary self-start">Edit profile</Link>}
      </div>

      <section className="mt-10">
        <h2 className="mb-4 text-xl font-bold">Collected drills</h2>
        {saves.length === 0 ? (
          <p className="text-ink-500">No drills collected yet.</p>
        ) : (
          <DrillGrid>{saves.map((s) => <DrillCard key={s.id} drill={s.drill} />)}</DrillGrid>
        )}
      </section>

      {created.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 text-xl font-bold">Drills by {profile.name.split(" ")[0]}</h2>
          <DrillGrid>{created.map((d) => <DrillCard key={d.id} drill={d} />)}</DrillGrid>
        </section>
      )}
    </div>
  );
}
