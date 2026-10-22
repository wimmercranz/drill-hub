/** "75 / 90 min planned" bar. Turns amber when nearly full and red when over. */
export default function TimeBar({ planned, available, compact }: { planned: number; available: number | null; compact?: boolean }) {
  if (!available) {
    return <p className="text-sm text-ink-500"><strong className="text-ink-900">{planned} min</strong> planned</p>;
  }
  const pct = Math.min(100, (planned / available) * 100);
  const over = planned > available;
  const color = over ? "bg-red-500" : planned >= available * 0.9 ? "bg-amber-500" : "bg-emerald-500";
  const left = available - planned;
  return (
    <div className={compact ? "" : "card p-4"}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2 text-sm">
        <span>
          <strong className={over ? "text-red-600" : "text-ink-900"}>{planned}</strong>
          <span className="text-ink-500"> / {available} min planned</span>
        </span>
        {!compact && (
          <span className={`text-xs font-semibold ${over ? "text-red-600" : "text-ink-500"}`}>
            {over ? `${-left} min over — shorten or remove a drill` : left === 0 ? "Perfect fit" : `${left} min left`}
          </span>
        )}
      </div>
      <div className={`overflow-hidden rounded-full bg-slate-200 ${compact ? "h-1.5" : "h-2.5"}`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
