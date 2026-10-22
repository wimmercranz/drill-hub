import Link from "next/link";
import { login } from "@/app/actions/auth";
import ActionForm from "@/components/ActionForm";
import GoogleButton from "@/components/GoogleButton";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Log in" };

const errors: Record<string, string> = {
  google: "Google sign-in didn't work. Please try again.",
  "google-email": "Your Google account has no verified e-mail address.",
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "", error } = await searchParams;
  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-2xl font-extrabold">Welcome back</h1>
        <p className="mb-6 text-sm text-ink-500">Log in to collect drills and manage your teams.</p>
        {error && errors[error] && <p className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{errors[error]}</p>}
        <GoogleButton next={next} />
        <ActionForm action={login} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div>
            <label className="label" htmlFor="email">Email</label>
            <input id="email" name="email" type="email" required autoComplete="email" className="input" />
          </div>
          <div>
            <div className="flex items-baseline justify-between">
              <label className="label" htmlFor="password">Password</label>
              <Link href="/forgot-password" className="text-xs font-semibold text-brand-700">Forgot password?</Link>
            </div>
            <input id="password" name="password" type="password" required autoComplete="current-password" className="input" />
          </div>
          <SubmitButton className="btn-primary w-full" pendingText="Logging in…">Log in</SubmitButton>
        </ActionForm>
        <p className="mt-4 text-center text-sm text-ink-500">
          New here? <Link href={`/signup${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-700">Create an account</Link>
        </p>
        {process.env.NODE_ENV !== "production" && (
          <p className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-ink-500">
            Demo: <code>coach@drillhub.test</code> or <code>player@drillhub.test</code>, password <code>drillhub123</code>
          </p>
        )}
      </div>
    </div>
  );
}
