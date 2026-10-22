type AvatarUser = { id?: string; name: string; avatarUpdatedAt?: Date | null };

/** Profile picture, or the person's initials when they haven't uploaded one. */
export default function Avatar({ user, size = "md" }: { user: AvatarUser; size?: "sm" | "md" | "lg" }) {
  const cls = { sm: "h-8 w-8 text-xs", md: "h-10 w-10 text-sm", lg: "h-20 w-20 text-2xl" }[size];
  if (user.id && user.avatarUpdatedAt) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={`/api/avatar/${user.id}?v=${user.avatarUpdatedAt.getTime()}`}
        alt={user.name}
        className={`shrink-0 rounded-full object-cover ${cls}`}
      />
    );
  }
  const initials = user.name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
  return <span className={`grid shrink-0 place-items-center rounded-full bg-brand-100 font-bold text-brand-700 ${cls}`}>{initials}</span>;
}
