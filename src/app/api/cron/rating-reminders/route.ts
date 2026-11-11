import { sendRatingReminders } from "@/lib/ratingReminders";

export const dynamic = "force-dynamic";

/**
 * Called once a day by Vercel Cron (see vercel.json). Vercel sends
 * "Authorization: Bearer <CRON_SECRET>" when the CRON_SECRET environment variable is set;
 * without it the route refuses to run, so nobody else can trigger the e-mails.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Unauthorized", { status: 401 });
  }
  const result = await sendRatingReminders();
  return Response.json(result);
}
