import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { coachedTeams } from "@/lib/drills";
import { createDrill } from "@/app/actions/drills";
import DrillForm from "@/components/DrillForm";

export const metadata = { title: "New drill" };

export default async function NewDrillPage() {
  const user = await requireUser("/drills/new");
  const [sports, teams] = await Promise.all([
    db.sport.findMany({ where: { active: true }, include: { categories: { orderBy: { order: "asc" } } } }),
    coachedTeams(user.id),
  ]);
  return (
    <div className="container-page max-w-3xl py-8">
      <h1 className="mb-1 text-3xl font-extrabold tracking-tight">Add a drill</h1>
      <p className="mb-6 text-ink-500">Share a drill you love — with or without a video.</p>
      <DrillForm
        action={createDrill}
        sports={sports}
        teams={teams}
        submitLabel="Publish drill"
        defaults={{
          title: "", summary: "", sportId: sports[0]?.id ?? "", categoryIds: [], level: "BEGINNER",
          minPlayers: 1, durationMin: 10, equipment: "", setup: "", steps: "", coachingPoints: "",
          variations: "", videoUrl: "", sourceTitle: "", visibility: "PUBLIC", teamId: "",
        }}
      />
    </div>
  );
}
