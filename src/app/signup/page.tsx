import Link from "next/link";
import { signup } from "@/app/actions/auth";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Sign up" };

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "" } = await searchParams;
  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-2xl font-extrabold">Create your account</h1>
        <p className="mb-6 text-sm text-ink-500">Players and coaches use the same account — your role is set per team.</p>
        <ActionForm action={signup} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="name">Name</label>
            <input id="name" name="name" required autoComplete="name" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" className="input" />
            <p className="mt-1 text-xs text-ink-500">At least 8 characters.</p>
          </div>
          <SubmitButton className="btn-primary w-full" pendingText="Creating account…">Sign up</SubmitButton>
        </ActionForm>
        <p className="mt-4 text-center text-sm text-ink-500">
          Already have an account? <Link href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-700">Log in</Link>
        </p>
      </div>
    </div>
  );
}
