import "server-only";
import { db } from "./db";
import { appUrl, sendEmail } from "./email";
import { addMinutes, formatDate, nowIn } from "./time";

/** Practices without a set length count as finished this long after they start. */
const DEFAULT_LENGTH_MIN = 90;
/** Practices that ended longer ago than this get no e-mail (e.g. the first run after deploying). */
const MAX_AGE_DAYS = 3;

/** When a practice ends, in the same wall-clock representation as startsAt. */
export const practiceEnd = (plan: { startsAt: Date; durationMin: number | null }) =>
  addMinutes(plan.startsAt, plan.durationMin ?? DEFAULT_LENGTH_MIN);

/**
 * E-mails every player who hasn't rated a finished practice yet, once per practice.
 * Run once a day by the Vercel cron job in vercel.json (/api/cron/rating-reminders).
 */
export async function sendRatingReminders() {
  const utcNow = new Date();
  // Wall-clock times can be up to ±14h off UTC, so fetch a little wider and check each team's own clock below.
  const plans = await db.practicePlan.findMany({
    where: {
      cancelled: false,
      ratingReminderSentAt: null,
      startsAt: { gte: addMinutes(utcNow, -(MAX_AGE_DAYS * 24 + 14) * 60), lte: addMinutes(utcNow, 14 * 60) },
    },
    include: {
      ratings: { select: { userId: true } },
      team: {
        select: {
          id: true,
          name: true,
          timezone: true,
          memberships: {
            where: { role: "PLAYER", user: { practiceRatingEmails: true } },
            select: { user: { select: { id: true, name: true, email: true } } },
          },
        },
      },
    },
  });

  let practices = 0;
  let emails = 0;
  for (const plan of plans) {
    if (!plan.startsAt) continue;
    const now = nowIn(plan.team.timezone);
    const end = practiceEnd({ startsAt: plan.startsAt, durationMin: plan.durationMin });
    if (end > now) continue; // not over yet
    if (end < addMinutes(now, -MAX_AGE_DAYS * 24 * 60)) {
      // Too old to ask about — just mark it so it isn't looked at again.
      await db.practicePlan.update({ where: { id: plan.id }, data: { ratingReminderSentAt: utcNow } });
      continue;
    }

    const rated = new Set(plan.ratings.map((r) => r.userId));
    const link = `${appUrl()}/teams/${plan.team.id}/plans/${plan.id}`;
    for (const { user } of plan.team.memberships) {
      if (rated.has(user.id)) continue;
      const res = await sendEmail({
        to: user.email,
        subject: `How was ${plan.title}? Rate it on Drillpin`,
        text:
          `Hi ${user.name}!\n\n` +
          `How was ${plan.title} with ${plan.team.name} on ${formatDate(plan.startsAt, "long")}?\n\n` +
          `Rate it from 1 to 4 here — it takes five seconds and is anonymous, your coaches only see the average:\n${link}\n\n` +
          `— Drillpin\n\n` +
          `Don't want these e-mails? Turn them off in your settings: ${appUrl()}/settings`,
      });
      if (res.sent) emails++;
    }
    // Mark it even if e-mail isn't set up, so players aren't flooded with old practices later.
    await db.practicePlan.update({ where: { id: plan.id }, data: { ratingReminderSentAt: utcNow } });
    practices++;
  }
  return { practices, emails };
}
