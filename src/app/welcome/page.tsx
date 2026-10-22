import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { acceptTerms } from "@/app/actions/auth";
import ActionForm from "@/components/ActionForm";
import ConsentCheckboxes from "@/components/ConsentCheckboxes";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Welcome" };

export default async function WelcomePage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next = "" } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.termsAcceptedAt) redirect(next || "/me");
  return (
    <div className="container-page flex justify-center py-16">
      <div className="card w-full max-w-sm p-6">
        <h1 className="mb-1 text-2xl font-extrabold">Welcome, {user.name.split(" ")[0]}! 👋</h1>
        <p className="mb-6 text-sm text-ink-500">One last step before you start collecting drills.</p>
        <ActionForm action={acceptTerms} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <ConsentCheckboxes />
          <SubmitButton className="btn-primary w-full">Continue</SubmitButton>
        </ActionForm>
      </div>
    </div>
  );
}
