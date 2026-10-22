type TeamLike = { id: string; name: string; avatarUpdatedAt?: Date | null; sport?: { emoji: string } | null };

/** Team picture, or the sport's emoji on an orange tile when the team has no picture. */
export default function TeamAvatar({ team, size = "md" }: { team: TeamLike; size?: "xs" | "sm" | "md" | "lg" }) {
  const cls = { xs: "h-5 w-5 text-xs rounded", sm: "h-8 w-8 text-base rounded-lg", md: "h-12 w-12 text-2xl rounded-xl", lg: "h-20 w-20 text-4xl rounded-2xl" }[size];
  if (team.avatarUpdatedAt) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={`/api/team-avatar/${team.id}?v=${team.avatarUpdatedAt.getTime()}`} alt={team.name} className={`shrink-0 object-cover ${cls}`} />
    );
  }
  return <span className={`grid shrink-0 place-items-center bg-brand-100 ${cls}`}>{team.sport?.emoji ?? "🏀"}</span>;
}
