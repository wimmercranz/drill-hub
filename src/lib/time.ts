/**
 * Practice times are "wall clock" times in the team's timezone (e.g. 18:00 in Stockholm).
 * We store them in Date objects whose UTC fields hold that wall-clock time, and always
 * format them with timeZone "UTC". That way 18:00 stays 18:00 no matter where the server runs.
 */

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** "2026-10-27" + "18:00" → Date with UTC fields 2026-10-27 18:00. */
export function wallClock(date: string, time = "00:00"): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh || 0, mm || 0));
}

/** The current wall-clock time in a timezone, in the same representation. */
export function nowIn(timeZone: string): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return wallClock(`${get("year")}-${get("month")}-${get("day")}`, `${get("hour")}:${get("minute")}`);
}

export const toDateInput = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
export const toTimeInput = (d: Date | null | undefined) => (d ? d.toISOString().slice(11, 16) : "");

export function formatDate(d: Date, style: "short" | "long" = "short") {
  return d.toLocaleDateString("en-GB", {
    weekday: style === "long" ? "long" : "short",
    day: "numeric",
    month: style === "long" ? "long" : "short",
    ...(style === "long" ? { year: "numeric" } : {}),
    timeZone: "UTC",
  });
}

export const formatTime = (d: Date) => toTimeInput(d);

export function addMinutes(d: Date, minutes: number) {
  return new Date(d.getTime() + minutes * 60_000);
}

/** Every date between start and end (inclusive) that falls on the weekday, at the given time. */
export function occurrences(weekday: number, startTime: string, startsOn: Date, endsOn: Date, max = 120): Date[] {
  const out: Date[] = [];
  const first = new Date(startsOn);
  first.setUTCDate(first.getUTCDate() + ((weekday - first.getUTCDay() + 7) % 7));
  for (let d = first; d <= endsOn && out.length < max; d = new Date(d.getTime() + 7 * 86_400_000)) {
    out.push(wallClock(toDateInput(d), startTime));
  }
  return out;
}
