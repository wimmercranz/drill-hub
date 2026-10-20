import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getMembership, levelLabel } from "@/lib/drills";
import { addPlanItem, deletePlan, movePlanItem, removePlanItem, updatePlanDetails, updatePlanItem } from "@/app/actions/plans";
import PrintButton from "@/components/PrintButton";
import SubmitButton from "@/components/SubmitButton";

export const metadata = { title: "Practice plan" };

export default async function PlanPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params;
  const user = await requireUser(`/teams/${id}/plans/${planId}`);
  const membership = await getMembership(user.id, id);
  const plan = await db.practicePlan.findUnique({
    where: { id: planId },
    include: {
      team: true,
      author: { select: { name: true } },
      items: { include: { drill: true }, orderBy: { order: "asc" } },
    },
  });
  if (!membership || !plan || plan.teamId !== id) notFound();
  const isCoach = membership.role === "COACH";

  // Drills a coach can add: the team library plus the coach's own collection.
  const choices = isCoach
    ? await db.drill.findMany({
        where: { OR: [{ teamDrills: { some: { teamId: id } } }, { saves: { some: { userId: user.id } } }] },
        orderBy: { title: "asc" },
        include: { teamDrills: { where: { teamId: id } } },
      })
    : [];
  const teamChoices = choices.filter((d) => d.teamDrills.length > 0);
  const myChoices = choices.filter((d) => d.teamDrills.length === 0);

  const total = plan.items.reduce((sum, i) => sum + i.durationMin, 0);
  let clock = 0;
  const dateValue = plan.date ? plan.date.toISOString().slice(0, 10) : "";

  return (
    <div className="container-page max-w-4xl py-8">
      <nav className="no-print mb-4 text-sm text-ink-500">
        <Link href={`/teams/${id}`} className="hover:text-brand-700">{plan.team.name}</Link> / Practice plan
      </nav>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-ink-500">
            {plan.date ? plan.date.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }) : "No date set"}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">{plan.title}</h1>
          <p className="text-ink-500">
            {plan.team.name} · {plan.items.length} drills · <strong className="text-ink-900">{total} minutes</strong>
            {plan.author && ` · by ${plan.author.name}`}
          </p>
        </div>
        <div className="no-print flex gap-2">
          <PrintButton />
          {isCoach && (
            <form action={deletePlan.bind(null, plan.id)}>
              <SubmitButton className="btn-ghost text-red-600" pendingText="…" confirm="Delete this practice plan?">Delete</SubmitButton>
            </form>
          )}
        </div>
      </div>

      {plan.notes && !isCoach && <p className="card mt-4 whitespace-pre-line p-4 text-sm text-ink-700">{plan.notes}</p>}

      {isCoach && (
        <details className="no-print card mt-4 p-4">
          <summary className="cursor-pointer font-semibold">Edit title, date & notes</summary>
          <form action={updatePlanDetails.bind(null, plan.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input name="title" defaultValue={plan.title} className="input" />
            <input name="date" type="date" defaultValue={dateValue} className="input" />
            <textarea name="notes" defaultValue={plan.notes} rows={3} placeholder="Notes for the practice (equipment, focus, reminders)…" className="input sm:col-span-2" />
            <div><SubmitButton>Save details</SubmitButton></div>
          </form>
        </details>
      )}
      {isCoach && plan.notes && <p className="mt-4 hidden whitespace-pre-line text-sm print:block">{plan.notes}</p>}

      <ol className="mt-6 space-y-3">
        {plan.items.map((item, i) => {
          const start = clock;
          clock += item.durationMin;
          return (
            <li key={item.id} className="card flex gap-4 p-4">
              <div className="w-16 shrink-0 text-center">
                <div className="text-xs text-ink-500">{start}–{clock} min</div>
                <div className="mt-1 text-2xl font-extrabold text-brand-600">{i + 1}</div>
              </div>
              <div className="min-w-0 flex-1">
                <Link href={`/drills/${item.drill.slug}`} className="font-bold hover:text-brand-700">{item.drill.title}</Link>
                <p className="text-sm text-ink-500">{item.drill.summary}</p>
                <p className="mt-1 text-xs text-ink-500">{levelLabel(item.drill.level)} · {item.drill.minPlayers}+ players{item.drill.equipment && ` · ${item.drill.equipment}`}</p>
                {isCoach ? (
                  <form action={updatePlanItem.bind(null, item.id)} className="no-print mt-3 flex flex-wrap items-center gap-2">
                    <label className="flex items-center gap-1 text-sm">
                      <input name="durationMin" type="number" min={1} max={180} defaultValue={item.durationMin} className="input w-20 py-1" /> min
                    </label>
                    <input name="note" defaultValue={item.note} placeholder="Note (focus, groups…)" className="input min-w-40 flex-1 py-1" />
                    <SubmitButton className="btn-secondary btn-sm" pendingText="…">Save</SubmitButton>
                  </form>
                ) : (
                  <p className="mt-2 text-sm"><strong>{item.durationMin} min</strong>{item.note && ` · ${item.note}`}</p>
                )}
                {isCoach && <p className="mt-2 hidden text-sm print:block"><strong>{item.durationMin} min</strong>{item.note && ` · ${item.note}`}</p>}
              </div>
              {isCoach && (
                <div className="no-print flex shrink-0 flex-col gap-1">
                  <form action={movePlanItem.bind(null, item.id, "up")}>
                    <SubmitButton className="btn-ghost btn-sm" pendingText="…">↑</SubmitButton>
                  </form>
                  <form action={movePlanItem.bind(null, item.id, "down")}>
                    <SubmitButton className="btn-ghost btn-sm" pendingText="…">↓</SubmitButton>
                  </form>
                  <form action={removePlanItem.bind(null, item.id)}>
                    <SubmitButton className="btn-ghost btn-sm text-red-600" pendingText="…">✕</SubmitButton>
                  </form>
                </div>
              )}
            </li>
          );
        })}
        {plan.items.length === 0 && <li className="card p-8 text-center text-ink-500">No drills in this plan yet.</li>}
      </ol>

      {isCoach && (
        <div className="no-print card mt-6 p-4">
          <p className="mb-2 font-semibold">Add a drill</p>
          {choices.length === 0 ? (
            <p className="text-sm text-ink-500">
              Add drills to your team library first. <Link href="/drills" className="font-semibold text-brand-700">Browse drills →</Link>
            </p>
          ) : (
            <form action={addPlanItem.bind(null, plan.id)} className="flex flex-wrap gap-2">
              <select name="drillId" className="input min-w-60 flex-1">
                {teamChoices.length > 0 && (
                  <optgroup label="Team library">
                    {teamChoices.map((d) => <option key={d.id} value={d.id}>{d.title} ({d.durationMin} min)</option>)}
                  </optgroup>
                )}
                {myChoices.length > 0 && (
                  <optgroup label="My Drills">
                    {myChoices.map((d) => <option key={d.id} value={d.id}>{d.title} ({d.durationMin} min)</option>)}
                  </optgroup>
                )}
              </select>
              <SubmitButton pendingText="Adding…">+ Add to plan</SubmitButton>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
