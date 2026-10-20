import Link from "next/link";
import type { DrillCardData } from "@/lib/drills";
import { levelLabel, usedCount } from "@/lib/drills";
import { thumbnailUrl } from "@/lib/video";

const levelColor: Record<string, string> = {
  BEGINNER: "bg-emerald-100 text-emerald-800",
  INTERMEDIATE: "bg-amber-100 text-amber-800",
  ADVANCED: "bg-rose-100 text-rose-800",
};

export default function DrillCard({ drill, footer }: { drill: DrillCardData; footer?: React.ReactNode }) {
  const thumb = thumbnailUrl(drill.videoUrl);
  const used = usedCount(drill);
  return (
    <div className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-md">
      <Link href={`/drills/${drill.slug}`} className="flex flex-1 flex-col">
        <div className="relative aspect-video bg-gradient-to-br from-brand-100 to-brand-200">
          {thumb ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
          ) : (
            <div className="grid h-full place-items-center text-4xl">{drill.sport.emoji}</div>
          )}
          {thumb && (
            <span className="absolute bottom-2 right-2 rounded bg-black/70 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              ▶ Video
            </span>
          )}
          {drill.visibility !== "PUBLIC" && (
            <span className="absolute left-2 top-2 rounded bg-ink-900/80 px-1.5 py-0.5 text-[11px] font-semibold text-white">
              {drill.visibility === "TEAM" ? "Team only" : "Private"}
            </span>
          )}
        </div>
        <div className="flex flex-1 flex-col gap-2 p-4">
          <h3 className="font-bold leading-snug group-hover:text-brand-700">{drill.title}</h3>
          <p className="line-clamp-2 text-sm text-ink-500">{drill.summary}</p>
          <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-1">
            <span className={`chip ${levelColor[drill.level] ?? ""}`}>{levelLabel(drill.level)}</span>
            <span className="chip">{drill.durationMin} min</span>
            <span className="chip">{drill.minPlayers}+ players</span>
            <span className="ml-auto text-xs font-semibold text-ink-500" title="Times added to a profile or team library">
              {used > 0 ? `🔥 Used ${used}×` : "New"}
            </span>
          </div>
        </div>
      </Link>
      {footer && <div className="border-t border-slate-100 px-4 py-2">{footer}</div>}
    </div>
  );
}

export function DrillGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">{children}</div>;
}
