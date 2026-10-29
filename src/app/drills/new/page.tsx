import Link from "next/link";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { coachedTeams, getMembership } from "@/lib/drills";
import { createDrill } from "@/app/actions/drills";
import DrillForm from "@/components/DrillForm";

export const metadata = { title: "New drill" };

export default async function NewDrillPage({ searchParams }: { searchParams: Promise<{ plan?: string; practice?: string }> }) {
  const { plan: planId, practice: templateId } = await searchParams;
  const query = planId ? `?plan=${planId}` : templateId ? `?practice=${templateId}` : "";
  const user = await requireUser(`/drills/new${query}`);
  const [sports, teams] = await Promise.all([
    db.sport.findMany({ where: { active: true }, include: { categories: { orderBy: { order: "asc" } } } }),
    coachedTeams(user.id),
  ]);

  // Opened from a practice planner: the new drill is added to that practice and we go back there.
  let from: { title: string; href: string; hidden: Record<string, string> } | null = null;
  if (planId) {
    const plan = await db.practicePlan.findUnique({ where: { id: planId } });
    if (plan && (await getMembership(user.id, plan.teamId))?.role === "COACH") {
      from = { title: plan.title, href: `/teams/${plan.teamId}/plans/${plan.id}`, hidden: { addToPlan: plan.id } };
    }
  } else if (templateId) {
    const template = await db.practiceTemplate.findUnique({ where: { id: templateId } });
    if (template && template.ownerId === user.id) {
      from = { title: template.title, href: `/me/practices/${template.id}`, hidden: { addToPractice: template.id } };
    }
  }

  return (
    <div className="container-page max-w-3xl py-8">
      {from && (
        <nav className="mb-4 text-sm text-ink-500">
          <Link href={from.href} className="hover:text-brand-700">← Back to {from.title}</Link>
        </nav>
      )}
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Add a drill</h1>
      <p className="mb-6 text-ink-500">
        {from
          ? <>Your new drill is added to <strong className="text-ink-900">{from.title}</strong>, and you go straight back there.</>
          : "Share a drill you love — with or without a video."}
      </p>
      <DrillForm
        action={createDrill}
        sports={sports}
        teams={teams}
        submitLabel={from ? "Publish and add to practice" : "Publish drill"}
        hidden={from?.hidden}
        defaults={{
          title: "", summary: "", sportId: sports[0]?.id ?? "", categoryIds: [], level: "BEGINNER",
          minPlayers: 1, durationMin: 10, equipment: "", setup: "", steps: "", coachingPoints: "",
          variations: "", videoUrl: "", sourceTitle: "", visibility: "PUBLIC", teamId: "",
        }}
      />
    </div>
  );
}
