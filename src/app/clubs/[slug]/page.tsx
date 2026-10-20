import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { profileHref } from "@/lib/profiles";
import { joinClub, removeClubMember, setClubRole } from "@/app/actions/profile";
import Avatar from "@/components/Avatar";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Club" };

export default async function ClubPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const viewer = await getCurrentUser();
  const club = await db.club.findUnique({
    where: { slug },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, username: true, profileVisibility: true } } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!club) notFound();

  const me = club.members.find((m) => m.userId === viewer?.id);
  const isAdmin = me?.role === "ADMIN";
  // Private profiles are only listed to the club's admins and to the person themselves.
  const shown = club.members.filter((m) => m.user.profileVisibility === "PUBLIC" || isAdmin || m.userId === viewer?.id);
  const hidden = club.members.length - shown.length;

  return (
    <div className="container-page max-w-3xl py-8">
      <nav className="mb-4 text-sm text-ink-500"><Link href="/clubs" className="hover:text-brand-700">Clubs</Link></nav>
      <div className="card flex flex-wrap items-center gap-4 p-6">
        <div className="grid h-16 w-16 place-items-center rounded-xl bg-ink-900 text-2xl text-white">🏛</div>
        <div className="flex-1">
          <h1 className="text-3xl font-extrabold tracking-tight">{club.name}</h1>
          <p className="text-ink-500">{club.city && `${club.city} · `}{club.members.length} member{club.members.length === 1 ? "" : "s"}</p>
        </div>
        {viewer && !me && (
          <form action={joinClub.bind(null, club.id)}>
            <SubmitButton pendingText="Joining…">Join club</SubmitButton>
          </form>
        )}
        {me && (
          <form action={removeClubMember.bind(null, club.id, me.id)}>
            <SubmitButton className="btn-ghost text-ink-500" pendingText="…" confirm={`Leave ${club.name}?`}>Leave club</SubmitButton>
          </form>
        )}
        {!viewer && <Link href={`/login?next=/clubs/${club.slug}`} className="btn-primary">Log in to join</Link>}
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-xl font-bold">Members</h2>
        <div className="card divide-y divide-slate-100">
          {shown.map((m) => (
            <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <Avatar name={m.user.name} size="sm" />
              <Link href={profileHref(m.user)} className="flex-1 font-medium hover:text-brand-700">
                {m.user.name}{m.userId === viewer?.id && " (you)"}
                {m.user.profileVisibility === "PRIVATE" && <span className="ml-1 text-xs text-ink-500">🔒</span>}
              </Link>
              {m.role === "ADMIN" && <span className="chip bg-brand-100 text-brand-700">Admin</span>}
              {isAdmin && m.userId !== viewer?.id && (
                <>
                  <form action={setClubRole.bind(null, club.id, m.id, m.role === "ADMIN" ? "MEMBER" : "ADMIN")}>
                    <SubmitButton className="btn-ghost btn-sm" pendingText="…">{m.role === "ADMIN" ? "Remove admin" : "Make admin"}</SubmitButton>
                  </form>
                  <form action={removeClubMember.bind(null, club.id, m.id)}>
                    <SubmitButton className="btn-ghost btn-sm text-red-600" pendingText="…" confirm={`Remove ${m.user.name} from the club?`}>Remove</SubmitButton>
                  </form>
                </>
              )}
            </div>
          ))}
          {hidden > 0 && <p className="px-4 py-3 text-sm text-ink-500">+ {hidden} member{hidden === 1 ? "" : "s"} with a private profile</p>}
        </div>
      </section>
    </div>
  );
}
