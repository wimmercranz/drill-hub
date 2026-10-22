import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { profileHref } from "@/lib/profiles";
import { deleteAccount, removeClubMember, updateProfile } from "@/app/actions/profile";
import { logout } from "@/app/actions/auth";
import Avatar from "@/components/Avatar";
import AvatarUpload from "@/components/AvatarUpload";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Profile settings" };

export default async function SettingsPage() {
  const session = await requireUser("/settings");
  const user = await db.user.findUniqueOrThrow({
    where: { id: session.id },
    include: { clubs: { include: { club: true }, orderBy: { createdAt: "asc" } } },
  });

  return (
    <div className="container-page max-w-2xl py-8">
      <div className="mb-6 flex items-end justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Profile settings</h1>
        <div className="flex items-center gap-3">
          <Link href={profileHref(user)} className="text-sm font-semibold text-brand-700">View my profile →</Link>
          <form action={logout}>
            <button className="btn-secondary btn-sm">Log out</button>
          </form>
        </div>
      </div>

      <div className="card mb-6 flex items-center gap-4 p-5">
        <Avatar user={user} size="lg" />
        <div>
          <p className="mb-2 font-bold">Profile picture</p>
          <AvatarUpload hasAvatar={!!user.avatarUpdatedAt} />
        </div>
      </div>

      <ActionForm action={updateProfile} className="card space-y-4 p-5">
        <div>
          <label className="label" htmlFor="name">Name</label>
          <input id="name" name="name" required defaultValue={user.name} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="username">Username</label>
          <div className="flex items-center rounded-lg border border-slate-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-200">
            <span className="pl-3 text-sm text-ink-500">/u/</span>
            <input id="username" name="username" required defaultValue={user.username ?? ""} className="w-full bg-transparent px-1 py-2 text-sm outline-none" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="bio">About me</label>
          <textarea id="bio" name="bio" rows={3} maxLength={300} defaultValue={user.bio} className="input" placeholder="e.g. Point guard · U16 coach · loves a good shell drill" />
        </div>
        <fieldset>
          <legend className="label">Profile visibility</legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {[
              ["PUBLIC", "🌍 Public", "Anyone can see your profile, clubs and collected drills."],
              ["PRIVATE", "🔒 Private", "Only you and your teammates can see your profile."],
            ].map(([value, label, help]) => (
              <label key={value} className="flex cursor-pointer gap-3 rounded-lg border border-slate-300 p-3 has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50">
                <input type="radio" name="profileVisibility" value={value} defaultChecked={user.profileVisibility === value} className="mt-1 accent-brand-600" />
                <span>
                  <span className="font-semibold">{label}</span>
                  <span className="block text-sm text-ink-500">{help}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>
        <SubmitButton>Save profile</SubmitButton>
      </ActionForm>

      <section className="card mt-6 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-bold">My clubs</h2>
          <Link href="/clubs" className="btn-secondary btn-sm">Find or create a club</Link>
        </div>
        {user.clubs.length === 0 ? (
          <p className="text-sm text-ink-500">You&apos;re not associated with a club yet.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {user.clubs.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-2">
                <Link href={`/clubs/${m.club.slug}`} className="flex-1 font-medium hover:text-brand-700">
                  {m.club.name} {m.club.city && <span className="text-sm text-ink-500">· {m.club.city}</span>}
                </Link>
                {m.role === "ADMIN" && <span className="chip bg-brand-100 text-brand-700">Admin</span>}
                <form action={removeClubMember.bind(null, m.clubId, m.id)}>
                  <SubmitButton className="btn-ghost btn-sm text-ink-500" pendingText="…" confirm={`Leave ${m.club.name}?`}>Leave</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card mt-6 p-5">
        <h2 className="font-bold">Your data</h2>
        <p className="mt-1 text-sm text-ink-500">
          Read how we handle your data in the <Link href="/privacy" className="font-semibold text-brand-700">privacy policy</Link>.
          {user.termsAcceptedAt && ` You accepted the terms on ${user.termsAcceptedAt.toLocaleDateString("en-GB")}.`}
        </p>
        <a href="/api/me/export" className="btn-secondary mt-3">⬇ Download my data</a>

        <details className="mt-6 rounded-lg border border-red-200 p-4">
          <summary className="cursor-pointer font-semibold text-red-700">Delete my account</summary>
          <p className="mt-2 text-sm text-ink-700">
            This permanently deletes your account, profile, boards, ratings and private drills. Public drills you created stay in the
            library without your name. This can&apos;t be undone.
          </p>
          <ActionForm action={deleteAccount} className="mt-3 flex flex-wrap gap-2">
            <input name="confirm" placeholder="Type DELETE" className="input max-w-40" autoComplete="off" />
            <SubmitButton className="btn bg-red-600 text-white hover:bg-red-700" pendingText="Deleting…">Delete account</SubmitButton>
          </ActionForm>
        </details>
      </section>
    </div>
  );
}
