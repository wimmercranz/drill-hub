import "server-only";
import { db } from "./db";

// Words that don't help tell clubs apart ("Hawks BC" ≈ "Hawks Basketball Club").
const FILLER = new Set([
  "bc", "bk", "if", "ik", "fc", "ff", "sk", "club", "klubb", "basket", "basketball", "basketbollklubb",
  "basketboll", "idrottsforening", "idrottsklubb", "sports", "sport", "the", "of", "and", "team",
]);

export function clubTokens(name: string) {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .split(/\s+/)
    .filter((w) => w && !FILLER.has(w));
}

function editDistance(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** 0–1: how alike two club names are, ignoring filler words and small typos. */
export function clubSimilarity(a: string, b: string) {
  const ta = clubTokens(a);
  const tb = clubTokens(b);
  if (!ta.length || !tb.length) return 0;
  const close = (x: string, y: string) => x === y || (x.length > 3 && editDistance(x, y) <= 1) || (x.length > 2 && (y.startsWith(x) || x.startsWith(y)));
  const matches = ta.filter((x) => tb.some((y) => close(x, y))).length;
  return matches / Math.max(ta.length, tb.length);
}

export async function similarClubs(name: string, limit = 5) {
  if (clubTokens(name).length === 0) return [];
  const clubs = await db.club.findMany({ include: { _count: { select: { members: true } } } });
  return clubs
    .map((c) => ({ ...c, score: clubSimilarity(name, c.name) }))
    .filter((c) => c.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
