import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { logout } from "@/app/actions/auth";

export default async function Header() {
  const user = await getCurrentUser();
  return (
    <header className="no-print sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="container-page flex h-14 items-center gap-1 sm:gap-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-extrabold tracking-tight">
          <span className="grid h-8 w-8 place-items-center rounded-lg bg-brand-600 text-white">DH</span>
          <span className="hidden sm:inline">Drill Hub</span>
        </Link>
        <nav className="flex items-center text-sm font-medium sm:gap-1">
          <Link href="/drills" className="btn-ghost">Drills</Link>
          {user && <Link href="/me" className="btn-ghost">My Drills</Link>}
          {user && <Link href="/teams" className="btn-ghost">Teams</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Link href="/drills/new" className="btn-primary hidden sm:inline-flex">+ New drill</Link>
              <span className="hidden text-sm text-ink-500 md:inline">{user.name}</span>
              <form action={logout}>
                <button className="btn-ghost">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="btn-ghost">Log in</Link>
              <Link href="/signup" className="btn-primary">Sign up</Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
