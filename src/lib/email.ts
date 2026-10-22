import "server-only";

/**
 * Sends e-mail through Resend (https://resend.com) when RESEND_API_KEY is set.
 * Without it (e.g. on your own computer) the e-mail is printed in the terminal instead.
 */
export async function sendEmail({ to, subject, text }: { to: string; subject: string; text: string }) {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(`\n✉️  E-mail (not sent — RESEND_API_KEY not set)\nTo: ${to}\nSubject: ${subject}\n\n${text}\n`);
    return { sent: false };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "Drillpin <onboarding@resend.dev>",
      to,
      subject,
      text,
    }),
  });
  if (!res.ok) {
    console.error("E-mail failed:", res.status, await res.text());
    return { sent: false };
  }
  return { sent: true };
}

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

/** The public address of the site, used in links inside e-mails. */
export function appUrl() {
  return (process.env.APP_URL ?? (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")).replace(/\/$/, "");
}
