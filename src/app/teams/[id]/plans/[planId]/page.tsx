import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getMembership, levelLabel } from "@/lib/drills";
import { practiceHasStarted } from "@/lib/schedule";
import { WEEKDAYS, addMinutes, formatDate, formatTime, toDateInput, toTimeInput } from "@/lib/time";
import { addPlanItem, copyPlanItems, deletePlan, setCancelled, updatePlanDetails } from "@/app/actions/plans";
import { applyTemplate, saveAsTemplate } from "@/app/actions/templates";
import ActionForm from "@/components/ActionForm";
import PlanItems from "@/components/PlanItems";
import PrintButton from "@/components/PrintButton";
import RatePractice from "@/components/RatePractice";
import RatingSummary from "@/components/RatingSummary";
import SubmitButton from "@/components/SubmitButton";
import TimeBar from "@/components/TimeBar";

export const metadata = { title: "Practice" };

export default async function PlanPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
  const { id, planId } = await params;
  const user = await requireUser(`/teams/${id}/plans/${planId}`);
  const membership = await getMembership(user.id, id);
  const plan = await db.practicePlan.findUnique({
    where: { id: planId },
    include: {
      team: { include: { _count: { select: { memberships: true } } } },
      author: { select: { name: true } },
      schedule: true,
      items: { include: { drill: true }, orderBy: { order: "asc" } },
      ratings: { select: { rating: true, userId: true } },
    },
  });
  if (!membership || !plan || plan.teamId !== id) notFound();
  const isCoach = membership.role === "COACH";
  const started = practiceHasStarted(plan, plan.team.timezone);

  // Drills a coach can add: the team library plus the coach's own board.
  const [choices, otherPlans, templates] = isCoach
    ? await Promise.all([
        db.drill.findMany({
          where: { OR: [{ teamDrills: { some: { teamId: id } } }, { saves: { some: { userId: user.id } } }] },
          orderBy: { title: "asc" },
          include: { teamDrills: { where: { teamId: id } } },
        }),
        db.practicePlan.findMany({
          where: { teamId: id, id: { not: plan.id }, items: { some: {} } },
          orderBy: [{ startsAt: "desc" }, { createdAt: "desc" }],
          take: 20,
          include: { _count: { select: { items: true } } },
        }),
        db.practiceTemplate.findMany({
          where: { ownerId: user.id },
          include: { items: { select: { durationMin: true } } },
          orderBy: { title: "asc" },
        }),
      ])
    : [[], [], []];
  const teamChoices = choices.filter((d) => d.teamDrills.length > 0);
  const myChoices = choices.filter((d) => d.teamDrills.length === 0);

  const planned = plan.items.reduce((sum, i) => sum + i.durationMin, 0);
  const myRating = plan.ratings.find((r) => r.userId === user.id)?.rating ?? null;

  return (
    <div className="container-page max-w-4xl py-8">
      <nav className="no-print mb-4 text-sm text-ink-500">
        <Link href={`/teams/${id}`} className="hover:text-brand-700">{plan.team.name}</Link> / Practice
      </nav>

      {plan.cancelled && (
        <p className="mb-4 rounded-lg bg-red-50 px-4 py-3 font-semibold text-red-700">This practice is cancelled.</p>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase text-ink-500">
            {plan.startsAt ? (
              <>
                {formatDate(plan.startsAt, "long")} · {formatTime(plan.startsAt)}
                {plan.durationMin && `–${formatTime(addMinutes(plan.startsAt, plan.durationMin))}`}
              </>
            ) : (
              "No date set"
            )}
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight">{plan.title}</h1>
          <p className="text-ink-500">
            {plan.team.name}
            {plan.location && ` · 📍 ${plan.location}`}
            {plan.schedule && ` · every ${WEEKDAYS[plan.schedule.weekday]}`}
          </p>
        </div>
        <div className="no-print flex flex-wrap gap-2">
          <PrintButton />
          {isCoach && (
            <>
              <form action={setCancelled.bind(null, plan.id, !plan.cancelled)}>
                <SubmitButton className="btn-secondary" pendingText="…" confirm={plan.cancelled ? undefined : "Cancel this practice? You can restore it later."}>
                  {plan.cancelled ? "Restore practice" : "Cancel practice"}
                </SubmitButton>
              </form>
              <form action={deletePlan.bind(null, plan.id)}>
                <SubmitButton className="btn-ghost text-red-600" pendingText="…" confirm="Delete this practice and its plan?">Delete</SubmitButton>
              </form>
            </>
          )}
        </div>
      </div>

      {isCoach && (
        <details className="no-print card mt-4 p-4">
          <summary className="cursor-pointer font-semibold">✏️ Edit or move this practice{plan.schedule && " (or the whole series)"}</summary>
          <ActionForm action={updatePlanDetails.bind(null, plan.id)} className="mt-3 grid gap-3 sm:grid-cols-2">
            <input name="title" defaultValue={plan.title} className="input sm:col-span-2" />
            <label className="text-xs text-ink-500">Date<input name="date" type="date" defaultValue={toDateInput(plan.startsAt)} className="input" /></label>
            <label className="text-xs text-ink-500">Start<input name="time" type="time" defaultValue={toTimeInput(plan.startsAt)} className="input" /></label>
            <label className="text-xs text-ink-500">Available time (min)<input name="durationMin" type="number" min={15} max={480} defaultValue={plan.durationMin ?? ""} className="input" /></label>
            <label className="text-xs text-ink-500">Location<input name="location" defaultValue={plan.location} className="input" /></label>
            <textarea name="notes" defaultValue={plan.notes} rows={3} placeholder="Notes for the practice (equipment, focus, reminders)…" className="input sm:col-span-2" />
            {plan.schedule && (
              <fieldset className="rounded-lg border border-slate-200 p-3 sm:col-span-2">
                <legend className="px-1 text-sm font-semibold">Apply the changes (name, day, time, length, place) to…</legend>
                <label className="flex items-start gap-2 py-1 text-sm">
                  <input type="radio" name="scope" value="one" defaultChecked className="mt-1 accent-brand-600" />
                  <span><strong>Only this practice</strong> <span className="text-ink-500">— e.g. moved because of a holiday</span></span>
                </label>
                <label className="flex items-start gap-2 py-1 text-sm">
                  <input type="radio" name="scope" value="series" className="mt-1 accent-brand-600" />
                  <span>
                    <strong>All upcoming {WEEKDAYS[plan.schedule.weekday]} practices</strong>{" "}
                    <span className="text-ink-500">— the whole weekly series gets the new name, weekday and time. Drills already planned come along; past practices are kept.</span>
                  </span>
                </label>
              </fieldset>
            )}
            <div><SubmitButton>Save</SubmitButton></div>
          </ActionForm>
        </details>
      )}

      {plan.notes && <p className="card mt-4 whitespace-pre-line p-4 text-sm text-ink-700">📝 {plan.notes}</p>}

      <div className="mt-6">
        <TimeBar planned={planned} available={plan.durationMin} />
      </div>

      <div className="mt-4">
        <PlanItems
          planId={plan.id}
          editable={isCoach}
          startTime={plan.startsAt ? formatTime(plan.startsAt) : null}
          items={plan.items.map((i) => ({
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

      {isCoach && (
        <div className="no-print card mt-6 space-y-4 p-4">
          <div>
            <p className="mb-2 font-semibold">Add a drill</p>
            {choices.length === 0 ? (
              <p className="text-sm text-ink-500">
                Add drills to your team library or your board first. <Link href="/drills" className="font-semibold text-brand-700">Browse drills →</Link>
              </p>
            ) : (
              <form action={addPlanItem.bind(null, plan.id)} className="flex flex-wrap gap-2">
                <select name="drillId" className="input min-w-60 flex-1">
                  {teamChoices.length > 0 && (
                    <optgroup label="Team library">
                      {teamChoices.map((d) => <option key={d.id} value={d.id}>{d.title} (~{d.durationMin} min)</option>)}
                    </optgroup>
                  )}
                  {myChoices.length > 0 && (
                    <optgroup label="My Drills">
                      {myChoices.map((d) => <option key={d.id} value={d.id}>{d.title} (~{d.durationMin} min)</option>)}
                    </optgroup>
                  )}
                </select>
                <SubmitButton pendingText="Adding…">+ Add</SubmitButton>
              </form>
            )}
          </div>
          <div className="rounded-lg bg-brand-50 p-3">
            <p className="mb-2 font-semibold">📋 Use a saved practice</p>
            {templates.length === 0 ? (
              <p className="text-sm text-ink-500">
                You have no saved practices yet. Save this one below, or build one under{" "}
                <Link href="/me?tab=practices" className="font-semibold text-brand-700">My Drills → Practices</Link>.
              </p>
            ) : (
              <form action={applyTemplate.bind(null, plan.id)} className="space-y-2">
                <select name="templateId" className="input">
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.items.length} drills · {t.items.reduce((s, i) => s + i.durationMin, 0)} min)
                    </option>
                  ))}
                </select>
                <div className="flex flex-wrap items-center gap-4 text-sm">
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="mode" value="replace" defaultChecked={plan.items.length === 0} className="accent-brand-600" /> Replace the drills
                  </label>
                  <label className="flex items-center gap-1.5">
                    <input type="radio" name="mode" value="append" defaultChecked={plan.items.length > 0} className="accent-brand-600" /> Add after the current drills
                  </label>
                  <SubmitButton className="btn-primary btn-sm ml-auto" pendingText="Adding…" confirm={plan.items.length > 0 ? "Use this saved practice? If you chose “Replace”, the current drills are removed." : undefined}>
                    Use it
                  </SubmitButton>
                </div>
              </form>
            )}
          </div>
          {otherPlans.length > 0 && (
            <div>
              <p className="mb-2 font-semibold">Copy drills from another practice</p>
              <form action={copyPlanItems.bind(null, plan.id)} className="flex flex-wrap gap-2">
                <select name="sourceId" className="input min-w-60 flex-1">
                  {otherPlans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.startsAt ? `${formatDate(p.startsAt)} — ` : ""}{p.title} ({p._count.items} drills)
                    </option>
                  ))}
                </select>
                <SubmitButton className="btn-secondary" pendingText="Copying…">Copy drills</SubmitButton>
              </form>
            </div>
          )}
          {plan.items.length > 0 && (
            <div>
              <p className="mb-2 font-semibold">💾 Save for reuse</p>
              <ActionForm action={saveAsTemplate.bind(null, plan.id)} className="flex flex-wrap gap-2">
                <input name="title" defaultValue={plan.title} className="input min-w-60 flex-1" aria-label="Name of the saved practice" />
                <SubmitButton className="btn-secondary" pendingText="Saving…">Save to My Drills</SubmitButton>
              </ActionForm>
              <p className="mt-1 text-xs text-ink-500">Saving with the name of an existing saved practice updates it.</p>
            </div>
          )}
        </div>
      )}

      {!plan.cancelled && (
        <section className="no-print card mt-6 p-5">
          {started ? (
            <div className="grid gap-6 md:grid-cols-2">
              <RatePractice planId={plan.id} current={myRating} />
              {isCoach && (
                <div>
                  <p className="mb-2 font-bold">Team feedback</p>
                  <RatingSummary ratings={plan.ratings} members={plan.team._count.memberships} />
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-ink-500">⭐ After the practice, everyone on the team can rate it (1–4, anonymously).</p>
          )}
        </section>
      )}
    </div>
  );
}
