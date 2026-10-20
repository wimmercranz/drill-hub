import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { coachedTeams } from "@/lib/drills";
import { updateDrill } from "@/app/actions/drills";
import DrillForm from "@/components/DrillForm";

export const metadata = { title: "Edit drill" };

export default async function EditDrillPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireUser(`/drills/${slug}/edit`);
  const drill = await db.drill.findUnique({ where: { slug }, include: { categories: true } });
  if (!drill || drill.authorId !== user.id) notFound();
  const [sports, teams] = await Promise.all([
    db.sport.findMany({ where: { active: true }, include: { categories: { orderBy: { order: "asc" } } } }),
    coachedTeams(user.id),
  ]);
  return (
    <div className="container-page max-w-3xl py-8">
      <h1 className="mb-6 text-3xl font-extrabold tracking-tight">Edit drill</h1>
      <DrillForm
        action={updateDrill.bind(null, drill.id)}
        sports={sports}
        teams={teams}
        submitLabel="Save changes"
        defaults={{
          ...drill,
          categoryIds: drill.categories.map((c) => c.id),
          videoUrl: drill.videoUrl ?? "",
          sourceTitle: drill.sourceTitle ?? "",
          teamId: drill.teamId ?? "",
        }}
      />
    </div>
  );
}
