import "server-only";
import { db } from "./db";
import { WEEKDAYS, nowIn, occurrences } from "./time";

/**
 * Make the future practices of a schedule match its settings.
 * Past practices are never touched. Future practices keep their drills when they move;
 * surplus future practices are removed if empty, or kept (unlinked) if they already have drills.
 */
export async function syncSchedule(scheduleId: string) {
  const schedule = await db.practiceSchedule.findUniqueOrThrow({ where: { id: scheduleId }, include: { team: true } });
  const now = nowIn(schedule.team.timezone);
  const wanted = occurrences(schedule.weekday, schedule.startTime, schedule.startsOn, schedule.endsOn).filter((d) => d > now);
  const existing = await db.practicePlan.findMany({
    where: { scheduleId, startsAt: { gt: now } },
    include: { _count: { select: { items: true } } },
    orderBy: { startsAt: "asc" },
  });

  const ops = [];
  for (let i = 0; i < Math.max(wanted.length, existing.length); i++) {
    const date = wanted[i];
    const plan = existing[i];
    const data = { startsAt: date, durationMin: schedule.durationMin, location: schedule.location };
    if (date && plan) {
      ops.push(db.practicePlan.update({ where: { id: plan.id }, data }));
    } else if (date) {
      ops.push(
        db.practicePlan.create({
          data: { ...data, title: `${WEEKDAYS[schedule.weekday]} practice`, teamId: schedule.teamId, scheduleId },
        }),
      );
    } else if (plan._count.items === 0) {
      ops.push(db.practicePlan.delete({ where: { id: plan.id } }));
    } else {
      ops.push(db.practicePlan.update({ where: { id: plan.id }, data: { scheduleId: null } }));
    }
  }
  await db.$transaction(ops);
}

/** Delete a schedule: future empty practices go away, everything else is kept. */
export async function removeSchedule(scheduleId: string) {
  const schedule = await db.practiceSchedule.findUniqueOrThrow({ where: { id: scheduleId }, include: { team: true } });
  const now = nowIn(schedule.team.timezone);
  await db.$transaction([
    db.practicePlan.deleteMany({ where: { scheduleId, startsAt: { gt: now }, items: { none: {} } } }),
    db.practiceSchedule.delete({ where: { id: scheduleId } }),
  ]);
}

/** Has the practice started (so it can be rated)? Practices without a date can always be rated. */
export function practiceHasStarted(plan: { startsAt: Date | null }, timezone: string) {
  return !plan.startsAt || plan.startsAt <= nowIn(timezone);
}
