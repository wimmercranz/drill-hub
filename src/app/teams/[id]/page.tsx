import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { collectionState, drillCardInclude } from "@/lib/drills";
import { emailConfigured } from "@/lib/email";
import { profileHref } from "@/lib/profiles";
import { WEEKDAYS, addMinutes, formatDate, formatTime, nowIn, toDateInput } from "@/lib/time";
import { toggleTeamDrill } from "@/app/actions/drills";
import { addSchedule, createPlan, deleteSchedule, setTeamTimezone, updateSchedule } from "@/app/actions/plans";
import { inviteByEmail, regenerateInvite, removeMember, revokeInvite, setMemberRole, setMemberTitle, updateTeamDrillNote } from "@/app/actions/teams";
import ActionForm from "@/components/ActionForm";
import Avatar from "@/components/Avatar";
import CopyButton from "@/components/CopyButton";
import DrillCard, { DrillGrid } from "@/components/DrillCard";
import { RatingBadge } from "@/components/RatingSummary";
import SubmitButton from "@/components/SubmitButton";
import TimeBar from "@/components/TimeBar";

export const metadata = { title: "Team" };

const TABS = [
  ["practices", "Practices"],
  ["library", "Drill library"],
  ["members", "Members"],
] as const;

export default async function TeamPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string; past?: string }>;
}) {
  const { id } = await params;
  const { tab = "practices", past } = await searchParams;
  const user = await requireUser(`/teams/${id}`);
  const team = await db.team.findUnique({
    where: { id },
    include: {
      sport: true,
      memberships: {
        include: { user: { select: { id: true, name: true, email: true, username: true, avatarUpdatedAt: true } } },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }],
      },
      _count: { select: { drills: true } },
    },
  });
  const me = team?.memberships.find((m) => m.userId === user.id);
  if (!team || !me) notFound();
  const isCoach = me.role === "COACH";
  const now = nowIn(team.timezone);

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") ?? "http"}://${h.get("host")}`;

  return (
    <div className="container-page py-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-brand-700">{team.sport.emoji} {team.sport.name} team</p>
          <h1 className="text-3xl font-extrabold tracking-tight">{team.name}</h1>
          <p className="text-ink-500">
            {team.memberships.length} members · {team._count.drills} drills · you are {me.title ? me.title.toLowerCase() : isCoach ? "a coach" : "a player"}
          </p>
        </div>
      </div>

      <nav className="mt-6 flex gap-1 border-b border-slate-200">
        {TABS.map(([key, label]) => (
          <Link
            key={key}
            href={`/teams/${id}?tab=${key}`}
            className={`-mb-px border-b-2 px-4 py-2 text-sm font-semibold ${tab === key ? "border-brand-600 text-brand-700" : "border-transparent text-ink-500 hover:text-ink-900"}`}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="mt-8">
        {tab === "library" ? (
          <LibraryTab teamId={id} teamName={team.name} isCoach={isCoach} userId={user.id} />
        ) : tab === "members" ? (
          <MembersTab team={team} userId={user.id} isCoach={isCoach} origin={origin} />
        ) : (
          <PracticesTab teamId={id} timezone={team.timezone} isCoach={isCoach} now={now} showPast={past === "all"} />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Practices

async function PracticesTab({ teamId, timezone, isCoach, now, showPast }: { teamId: string; timezone: string; isCoach: boolean; now: Date; showPast: boolean }) {
  const include = { items: { select: { durationMin: true } }, ratings: { select: { rating: true } } };
  const [upcoming, past, unscheduled, schedules] = await Promise.all([
    db.practicePlan.findMany({ where: { teamId, startsAt: { gte: addMinutes(now, -180) } }, include, orderBy: { startsAt: "asc" }, take: 8 }),
    db.practicePlan.findMany({ where: { teamId, startsAt: { lt: addMinutes(now, -180) } }, include, orderBy: { startsAt: "desc" }, take: showPast ? 200 : 5 }),
    db.practicePlan.findMany({ where: { teamId, startsAt: null }, include, orderBy: { createdAt: "desc" } }),
    db.practiceSchedule.findMany({ where: { teamId }, orderBy: [{ weekday: "asc" }, { startTime: "asc" }] }),
  ]);
  const today = toDateInput(now);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-10">
        <section>
          <h2 className="mb-3 text-xl font-bold">Upcoming practices</h2>
          {upcoming.length === 0 ? (
            <div className="card p-6 text-ink-500">
              No upcoming practices. {isCoach && "Set up your weekly practice times on the right, or add a single practice."}
            </div>
          ) : (
            <div className="space-y-3">{upcoming.map((p) => <PracticeRow key={p.id} plan={p} teamId={teamId} now={now} />)}</div>
          )}
        </section>

        {unscheduled.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-bold">Plans without a date</h2>
            <div className="space-y-3">{unscheduled.map((p) => <PracticeRow key={p.id} plan={p} teamId={teamId} now={now} />)}</div>
          </section>
        )}

        {past.length > 0 && (
          <section>
            <h2 className="mb-3 text-xl font-bold">Past practices</h2>
            <div className="space-y-3">{past.map((p) => <PracticeRow key={p.id} plan={p} teamId={teamId} now={now} />)}</div>
            {!showPast && past.length === 5 && (
              <Link href={`/teams/${teamId}?tab=practices&past=all`} className="mt-3 inline-block text-sm font-semibold text-brand-700">Show all past practices →</Link>
            )}
          </section>
        )}
      </div>

      {isCoach && (
        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="font-bold">Weekly practice times</h2>
            <p className="mb-3 text-sm text-ink-500">Each practice gets its own plan. Changing a time moves all future practices.</p>
            {schedules.map((s) => (
              <details key={s.id} className="mb-2 rounded-lg border border-slate-200 p-3">
                <summary className="cursor-pointer text-sm">
                  <strong>{WEEKDAYS[s.weekday]}s</strong> {s.startTime} · {s.durationMin} min{s.location && ` · ${s.location}`}
                  <span className="block text-xs text-ink-500">{formatDate(s.startsOn)} – {formatDate(s.endsOn)}</span>
                </summary>
                <ActionForm action={updateSchedule.bind(null, s.id)} className="mt-3 space-y-2">
                  <select name="weekday" defaultValue={s.weekday} className="input">
                    {WEEKDAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}
                  </select>
                  <ScheduleFields defaults={s} />
                  <SubmitButton className="btn-primary w-full">Save — move future practices</SubmitButton>
                </ActionForm>
                <form action={deleteSchedule.bind(null, s.id)} className="mt-2">
                  <SubmitButton className="btn-ghost btn-sm w-full text-red-600" confirm="Remove this weekly time? Future practices without drills are removed; past practices are kept.">
                    Remove weekly time
                  </SubmitButton>
                </form>
              </details>
            ))}
            <details open={schedules.length === 0} className="rounded-lg border border-dashed border-slate-300 p-3">
              <summary className="cursor-pointer text-sm font-semibold">+ Add practice times</summary>
              <ActionForm action={addSchedule.bind(null, teamId)} className="mt-3 space-y-2">
                <div className="flex flex-wrap gap-1">
                  {WEEKDAYS.map((d, i) => (
                    <label key={d} className="cursor-pointer rounded-full border border-slate-300 px-2.5 py-1 text-xs has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
                      <input type="checkbox" name="weekday" value={i} className="sr-only" /> {d.slice(0, 3)}
                    </label>
                  ))}
                </div>
                <ScheduleFields defaults={{ startTime: "18:00", durationMin: 90, location: "", startsOn: null, endsOn: null }} today={today} />
                <SubmitButton className="btn-primary w-full">Create practices</SubmitButton>
              </ActionForm>
            </details>
            <form action={setTeamTimezone.bind(null, teamId)} className="mt-3 flex items-center gap-2 text-xs text-ink-500">
              <span>Time zone</span>
              <select name="timezone" defaultValue={timezone} className="input flex-1 py-1 text-xs">
                {Intl.supportedValuesOf("timeZone").map((tz) => <option key={tz}>{tz}</option>)}
              </select>
              <SubmitButton className="btn-ghost btn-sm" pendingText="…">Set</SubmitButton>
            </form>
          </section>

          <section className="card p-5">
            <h2 className="font-bold">Single practice or camp</h2>
            <p className="mb-3 text-sm text-ink-500">For extra sessions outside the weekly schedule.</p>
            <ActionForm action={createPlan.bind(null, teamId)} className="space-y-2">
              <input name="title" required placeholder="e.g. Extra shooting session" className="input" />
              <div className="grid grid-cols-2 gap-2">
                <input name="date" type="date" defaultValue={today} className="input" />
                <input name="time" type="time" defaultValue="18:00" className="input" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input name="durationMin" type="number" min={15} max={480} defaultValue={90} className="input" aria-label="Minutes" />
                <input name="location" placeholder="Location" className="input" />
              </div>
              <SubmitButton className="btn-secondary w-full" pendingText="Creating…">Create practice</SubmitButton>
            </ActionForm>
          </section>
        </aside>
      )}
    </div>
  );
}

function ScheduleFields({
  defaults,
  today,
}: {
  defaults: { startTime: string; durationMin: number; location: string; startsOn: Date | null; endsOn: Date | null };
  today?: string;
}) {
  const end = today ? toDateInput(new Date(new Date(today).getTime() + 120 * 86_400_000)) : "";
  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-ink-500">Starts<input name="startTime" type="time" required defaultValue={defaults.startTime} className="input" /></label>
        <label className="text-xs text-ink-500">Minutes<input name="durationMin" type="number" min={15} max={480} required defaultValue={defaults.durationMin} className="input" /></label>
      </div>
      <input name="location" placeholder="Location, e.g. Main gym" defaultValue={defaults.location} className="input" />
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-ink-500">Season from<input name="startsOn" type="date" required defaultValue={defaults.startsOn ? toDateInput(defaults.startsOn) : today} className="input" /></label>
        <label className="text-xs text-ink-500">to<input name="endsOn" type="date" required defaultValue={defaults.endsOn ? toDateInput(defaults.endsOn) : end} className="input" /></label>
      </div>
    </>
  );
}

type PlanRow = {
  id: string;
  title: string;
  startsAt: Date | null;
  durationMin: number | null;
  location: string;
  cancelled: boolean;
  items: { durationMin: number }[];
  ratings: { rating: number }[];
};

function PracticeRow({ plan, teamId, now }: { plan: PlanRow; teamId: string; now: Date }) {
  const planned = plan.items.reduce((s, i) => s + i.durationMin, 0);
  const isPast = plan.startsAt && plan.startsAt < now;
  return (
    <Link
      href={`/teams/${teamId}/plans/${plan.id}`}
      className={`card flex flex-wrap items-center gap-4 p-4 transition hover:border-brand-500 hover:shadow-md ${plan.cancelled ? "opacity-60" : ""}`}
    >
      <div className="w-16 shrink-0 text-center">
        {plan.startsAt ? (
          <>
            <div className="text-xs font-semibold uppercase text-brand-700">{plan.startsAt.toLocaleDateString("en-GB", { weekday: "short", timeZone: "UTC" })}</div>
            <div className="text-2xl font-extrabold leading-none">{plan.startsAt.getUTCDate()}</div>
            <div className="text-xs text-ink-500">{plan.startsAt.toLocaleDateString("en-GB", { month: "short", timeZone: "UTC" })}</div>
          </>
        ) : (
          <div className="text-2xl">📋</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className={`font-bold ${plan.cancelled ? "line-through" : ""}`}>{plan.title}</p>
        <p className="text-sm text-ink-500">
          {plan.startsAt && formatTime(plan.startsAt)}
          {plan.startsAt && plan.durationMin && `–${formatTime(addMinutes(plan.startsAt, plan.durationMin))}`}
          {plan.location && ` · ${plan.location}`}
          {plan.cancelled && " · Cancelled"}
        </p>
        {!plan.cancelled && (
          <div className="mt-2 max-w-xs">
            {plan.items.length === 0 ? (
              <span className="text-xs font-semibold text-amber-700">No drills planned yet</span>
            ) : (
              <TimeBar planned={planned} available={plan.durationMin} compact />
            )}
          </div>
        )}
      </div>
      {isPast && <RatingBadge ratings={plan.ratings} />}
      <span className="text-ink-500">›</span>
    </Link>
  );
}

// ---------------------------------------------------------------- Library

async function LibraryTab({ teamId, teamName, isCoach, userId }: { teamId: string; teamName: string; isCoach: boolean; userId: string }) {
  const [drills, state] = await Promise.all([
    db.teamDrill.findMany({ where: { teamId }, include: { drill: { include: drillCardInclude } }, orderBy: { createdAt: "desc" } }),
    collectionState(userId),
  ]);
  return (
    <section>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xl font-bold">Team drill library <span className="text-ink-500">({drills.length})</span></h2>
        {isCoach && <Link href="/drills" className="btn-secondary">+ Collect more drills</Link>}
      </div>
      {drills.length === 0 ? (
        <div className="card p-8 text-center text-ink-500">
          {isCoach ? <>Open any drill and click <strong>“Add to {teamName}”</strong> to build your library.</> : "Your coaches haven't added any drills yet."}
        </div>
      ) : (
        <DrillGrid>
          {drills.map((td) => (
            <DrillCard
              key={td.id}
              drill={td.drill}
              state={state}
              footer={
                isCoach ? (
                  <div className="space-y-2">
                    <form action={updateTeamDrillNote.bind(null, td.id)} className="flex gap-1">
                      <input name="note" defaultValue={td.note} placeholder="Note for players…" className="input py-1 text-xs" />
                      <SubmitButton className="btn-ghost btn-sm" pendingText="…">Save</SubmitButton>
                    </form>
                    <form action={toggleTeamDrill.bind(null, teamId, td.drill.id)}>
                      <SubmitButton className="btn-ghost btn-sm text-ink-500" pendingText="…">Remove from team</SubmitButton>
                    </form>
                  </div>
                ) : td.note ? (
                  <p className="text-xs text-ink-700">📝 {td.note}</p>
                ) : undefined
              }
            />
          ))}
        </DrillGrid>
      )}
    </section>
  );
}

// ---------------------------------------------------------------- Members

type TeamWithMembers = {
  id: string;
  name: string;
  inviteCode: string;
  memberships: {
    id: string;
    userId: string;
    role: string;
    title: string;
    user: { id: string; name: string; email: string; username: string | null; avatarUpdatedAt: Date | null };
  }[];
};

async function MembersTab({ team, userId, isCoach, origin }: { team: TeamWithMembers; userId: string; isCoach: boolean; origin: string }) {
  const invites = isCoach
    ? await db.teamInvite.findMany({ where: { teamId: team.id, acceptedAt: null }, orderBy: { createdAt: "desc" } })
    : [];
  const coaches = team.memberships.filter((m) => m.role === "COACH");
  const players = team.memberships.filter((m) => m.role !== "COACH");

  const memberRow = (m: TeamWithMembers["memberships"][number]) => (
    <div key={m.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
      <Avatar user={m.user} size="sm" />
      <div className="min-w-0 flex-1">
        <Link href={profileHref(m.user)} className="font-medium hover:text-brand-700">{m.user.name}{m.userId === userId && " (you)"}</Link>
        {isCoach && <p className="truncate text-xs text-ink-500">{m.user.email}</p>}
      </div>
      {isCoach && m.role === "COACH" ? (
        <form action={setMemberTitle.bind(null, team.id, m.id)} className="flex gap-1">
          <input name="title" defaultValue={m.title} list="coach-titles" placeholder="Title" className="input w-36 py-1 text-xs" />
          <SubmitButton className="btn-ghost btn-sm" pendingText="…">Save</SubmitButton>
        </form>
      ) : (
        <span className={`chip ${m.role === "COACH" ? "bg-brand-100 text-brand-700" : ""}`}>{m.title || (m.role === "COACH" ? "Coach" : "Player")}</span>
      )}
      {isCoach && m.userId !== userId && (
        <>
          <form action={setMemberRole.bind(null, team.id, m.id, m.role === "COACH" ? "PLAYER" : "COACH")}>
            <SubmitButton className="btn-ghost btn-sm" pendingText="…">{m.role === "COACH" ? "Make player" : "Make coach"}</SubmitButton>
          </form>
          <form action={removeMember.bind(null, team.id, m.id)}>
            <SubmitButton className="btn-ghost btn-sm text-red-600" pendingText="…" confirm={`Remove ${m.user.name} from the team?`}>Remove</SubmitButton>
          </form>
        </>
      )}
      {m.userId === userId && (
        <form action={removeMember.bind(null, team.id, m.id)}>
          <SubmitButton className="btn-ghost btn-sm text-ink-500" pendingText="…" confirm="Leave this team?">Leave team</SubmitButton>
        </form>
      )}
    </div>
  );

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-8">
        <datalist id="coach-titles">
          <option value="Head coach" />
          <option value="Assistant coach" />
          <option value="Team manager" />
          <option value="Physio" />
        </datalist>
        <section>
          <h2 className="mb-1 text-xl font-bold">Coaching staff <span className="text-ink-500">({coaches.length})</span></h2>
          <p className="mb-3 text-sm text-ink-500">All coaches can edit practices, the drill library and members.</p>
          <div className="card divide-y divide-slate-100">{coaches.map(memberRow)}</div>
        </section>
        <section>
          <h2 className="mb-3 text-xl font-bold">Players <span className="text-ink-500">({players.length})</span></h2>
          <div className="card divide-y divide-slate-100">
            {players.map(memberRow)}
            {players.length === 0 && <p className="p-4 text-sm text-ink-500">No players yet — invite them!</p>}
          </div>
        </section>
      </div>

      {isCoach && (
        <aside className="space-y-6">
          <section className="card p-5">
            <h2 className="font-bold">Invite by e-mail</h2>
            <p className="mb-3 text-sm text-ink-500">Each person gets a personal link. Separate several addresses with commas or new lines.</p>
            <ActionForm action={inviteByEmail.bind(null, team.id)} className="space-y-2">
              <textarea name="emails" rows={3} required placeholder="anna@example.com, ben@example.com" className="input" />
              <div className="grid grid-cols-2 gap-2">
                <select name="role" className="input">
                  <option value="PLAYER">as players</option>
                  <option value="COACH">as coaches</option>
                </select>
                <input name="title" list="coach-titles" placeholder="Coach title" className="input" />
              </div>
              <SubmitButton className="btn-primary w-full" pendingText="Sending…">Send invitations</SubmitButton>
            </ActionForm>
            {!emailConfigured() && <p className="mt-2 text-xs text-ink-500">E-mail sending isn&apos;t set up yet — copy the links below and send them yourself.</p>}
            {invites.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="mb-2 text-sm font-semibold">Waiting for answer ({invites.length})</p>
                <ul className="space-y-2">
                  {invites.map((inv) => (
                    <li key={inv.id} className="flex items-center gap-2 text-sm">
                      <span className="min-w-0 flex-1 truncate" title={inv.email}>
                        {inv.email} <span className="text-xs text-ink-500">· {inv.role === "COACH" ? inv.title || "Coach" : "Player"}</span>
                      </span>
                      <CopyButton text={`${origin}/invite/${inv.token}`} label="Link" />
                      <form action={revokeInvite.bind(null, inv.id)}>
                        <SubmitButton className="btn-ghost btn-sm text-ink-500" pendingText="…">✕</SubmitButton>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <section className="card p-5 text-sm">
            <h2 className="font-bold">Or share the team code</h2>
            <p className="mb-2 text-ink-500">Anyone with the code joins as a player.</p>
            <div className="flex flex-wrap items-center gap-2">
              <code className="rounded bg-slate-100 px-2 py-1 text-base font-bold tracking-widest">{team.inviteCode}</code>
              <CopyButton text={`${origin}/join/${team.inviteCode}`} label="Copy link" />
              <form action={regenerateInvite.bind(null, team.id)}>
                <SubmitButton className="btn-ghost btn-sm" pendingText="…" confirm="Create a new code? The old link will stop working.">New code</SubmitButton>
              </form>
            </div>
          </section>
        </aside>
      )}
    </div>
  );
}
