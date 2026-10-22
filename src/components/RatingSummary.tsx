export const FACES = ["", "😞", "😐", "🙂", "🤩"];
export const RATING_LABELS = ["", "Poor", "OK", "Good", "Great"];

export function averageRating(ratings: { rating: number }[]) {
  return ratings.length ? ratings.reduce((s, r) => s + r.rating, 0) / ratings.length : null;
}

/** Compact average for lists: "🙂 3.2 (8)". */
export function RatingBadge({ ratings }: { ratings: { rating: number }[] }) {
  const avg = averageRating(ratings);
  if (avg === null) return null;
  return (
    <span className="chip" title={`${ratings.length} anonymous rating${ratings.length === 1 ? "" : "s"}`}>
      {FACES[Math.round(avg)]} {avg.toFixed(1)} <span className="ml-1 text-ink-500">({ratings.length})</span>
    </span>
  );
}

/** Distribution of ratings, shown to coaches. Never shows who voted what. */
export default function RatingSummary({ ratings, members }: { ratings: { rating: number }[]; members: number }) {
  const avg = averageRating(ratings);
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="text-3xl font-extrabold">{avg === null ? "–" : avg.toFixed(1)}</span>
        <span className="text-sm text-ink-500">
          average of {ratings.length} answer{ratings.length === 1 ? "" : "s"} · {members} member{members === 1 ? "" : "s"}
        </span>
      </div>
      <div className="mt-3 space-y-1.5">
        {[4, 3, 2, 1].map((n) => {
          const count = ratings.filter((r) => r.rating === n).length;
          return (
            <div key={n} className="flex items-center gap-2 text-sm">
              <span className="w-24 shrink-0">{FACES[n]} {RATING_LABELS[n]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div className="h-full rounded-full bg-brand-500" style={{ width: ratings.length ? `${(count / ratings.length) * 100}%` : 0 }} />
              </div>
              <span className="w-6 text-right text-ink-500">{count}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}


