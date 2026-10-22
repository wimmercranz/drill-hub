import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/auth";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-2xl font-extrabold">Forgot your password?</h1>
        <p className="mb-6 text-sm text-ink-500">Enter your e-mail and we&apos;ll send you a link to choose a new one.</p>
        <ActionForm action={requestPasswordReset} className="space-y-4">
          <input name="email" type="email" required autoComplete="email" placeholder="you@example.com" className="input" />
          <SubmitButton className="btn-primary w-full" pendingText="Sending…">Send reset link</SubmitButton>
        </ActionForm>
        <p className="mt-4 text-center text-sm"><Link href="/login" className="font-semibold text-brand-700">Back to log in</Link></p>
      </div>
    </div>
  );
}
