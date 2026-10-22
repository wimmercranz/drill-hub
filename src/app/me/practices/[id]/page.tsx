import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { levelLabel, visibleTo } from "@/lib/drills";
import { addTemplateItem, deleteTemplate, updateTemplate } from "@/app/actions/templates";
import ActionForm from "@/components/ActionForm";
import PlanItems from "@/components/PlanItems";
import PrintButton from "@/components/PrintButton";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Saved practice" };

export default async function SavedPracticePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await requireUser(`/me/practices/${id}`);
  const template = await db.practiceTemplate.findUnique({
    where: { id },
    include: { items: { include: { drill: true }, orderBy: { order: "asc" } } },
  });
  if (!template || template.ownerId !== user.id) notFound();

  // Drills to add: my board first, then my teams' libraries, then everything else I can see.
  const drills = await db.drill.findMany({
    where: visibleTo(user.id),
    orderBy: { title: "asc" },
    select: {
      id: true,
      title: true,
      durationMin: true,
      saves: { where: { userId: user.id }, select: { id: true } },
      teamDrills: { where: { team: { memberships: { some: { userId: user.id } } } }, select: { id: true } },
    },
  });
  const mine = drills.filter((d) => d.saves.length > 0);
  const team = drills.filter((d) => d.saves.length === 0 && d.teamDrills.length > 0);
  const rest = drills.filter((d) => d.saves.length === 0 && d.teamDrills.length === 0);
  const total = template.items.reduce((sum, i) => sum + i.durationMin, 0);
  const option = (d: (typeof drills)[number]) => <option key={d.id} value={d.id}>{d.title} (~{d.durationMin} min)</option>;

  return (
    <div className="container-page max-w-4xl py-8">
      <nav className="no-print mb-4 text-sm text-ink-500">
        <Link href="/me?tab=practices" className="hover:text-brand-700">My Drills → Practices</Link>
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-ink-500">Saved practice</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{template.title}</h1>
          <p className="text-ink-500">
            {template.items.length} drill{template.items.length === 1 ? "" : "s"} · <strong className="text-ink-900">{total} min</strong>
          </p>
        </div>
        <div className="no-print flex gap-2">
          <PrintButton />
          <form action={deleteTemplate.bind(null, template.id)}>
            <SubmitButton className="btn-ghost text-red-600" pendingText="…" confirm={`Delete the saved practice “${template.title}”? Team practices that used it are not affected.`}>
              Delete
            </SubmitButton>
          </form>
        </div>
      </div>

      <details className="no-print card mt-4 p-4">
        <summary className="cursor-pointer font-semibold">✏️ Rename or add notes</summary>
        <ActionForm action={updateTemplate.bind(null, template.id)} className="mt-3 space-y-3">
          <input name="title" defaultValue={template.title} className="input" />
          <textarea name="notes" defaultValue={template.notes} rows={3} placeholder="Notes (equipment, focus…) — copied into the practice when you use it" className="input" />
          <SubmitButton>Save</SubmitButton>
        </ActionForm>
      </details>
      {template.notes && <p className="card mt-4 whitespace-pre-line p-4 text-sm text-ink-700">📝 {template.notes}</p>}

      <div className="mt-6">
        <PlanItems
          kind="template"
          planId={template.id}
          editable
          startTime={null}
          items={template.items.map((i) => ({
            id: i.id,
            durationMin: i.durationMin,
            note: i.note,
            drill: {
              slug: i.drill.slug,
              title: i.drill.title,
              summary: i.drill.summary,
              meta: `${levelLabel(i.drill.level)} · ${i.drill.minPlayers}+ players · suggested ${i.drill.durationMin} min${i.drill.equipment ? ` · ${i.drill.equipment}` : ""}`,
            },
          }))}
        />
      </div>

      <div className="no-print card mt-6 p-4">
        <p className="mb-2 font-semibold">Add a drill</p>
        <form action={addTemplateItem.bind(null, template.id)} className="flex flex-wrap gap-2">
          <select name="drillId" className="input min-w-60 flex-1">
            {mine.length > 0 && <optgroup label="My Drills">{mine.map(option)}</optgroup>}
            {team.length > 0 && <optgroup label="My teams' libraries">{team.map(option)}</optgroup>}
            <optgroup label="All drills">{rest.map(option)}</optgroup>
          </select>
          <SubmitButton pendingText="Adding…">+ Add</SubmitButton>
        </form>
      </div>

      <p className="no-print mt-6 text-sm text-ink-500">
        💡 To use it: open a team practice and choose <strong>“Use a saved practice”</strong>.
      </p>
    </div>
  );
}
