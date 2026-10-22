import { similarClubs } from "@/lib/clubs";

export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q") ?? "";
  const clubs = await similarClubs(q.slice(0, 80));
  return Response.json(clubs.map((c) => ({ slug: c.slug, name: c.name, city: c.city, members: c._count.members })));
}
