import { resetPassword } from "@/app/actions/auth";
import ActionForm from "@/components/ActionForm";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-6 text-2xl font-extrabold">Choose a new password</h1>
        <ActionForm action={resetPassword.bind(null, token)} className="space-y-4">
          <input name="password" type="password" required minLength={8} autoComplete="new-password" placeholder="New password (8+ characters)" className="input" />
          <SubmitButton className="btn-primary w-full" pendingText="Saving…">Save password</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
