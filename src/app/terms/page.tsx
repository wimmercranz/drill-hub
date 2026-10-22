import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { MIN_AGE } from "@/lib/legal";

export const metadata = { title: "Terms of use" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of use" updated="October 2026">
      <p>
        Drillpin is a service where players, coaches and clubs collect and share sports drills and plan practices. It is
        provided by [Owner name / company, organisation number, address] (&quot;we&quot;). By creating an account you agree to these terms.
      </p>

      <h2>1. Your account</h2>
      <ul>
        <li>You must give correct information and keep your password safe. You are responsible for what happens on your account.</li>
        <li>You must be at least {MIN_AGE} years old, or have permission from a parent or guardian, to create an account.</li>
        <li>You can delete your account at any time under <Link href="/settings" className="text-brand-700 underline">Profile settings</Link>.</li>
      </ul>

      <h2>2. Content you add</h2>
      <ul>
        <li>You keep the rights to drills, notes and pictures you add. You give us permission to store and show them to the people you choose (everyone, your team or only you).</li>
        <li>Only add content you have the right to share. Link to videos instead of uploading other people&apos;s material.</li>
        <li>Content must not be hateful, harassing, discriminating, sexual, violent, illegal, or reveal other people&apos;s personal information.</li>
        <li>We may remove content or close accounts that break these rules.</li>
      </ul>

      <h2>3. Videos from other sites</h2>
      <p>
        Drill videos are embedded from their original creators (for example YouTube) and remain their property. Using them is also
        subject to that site&apos;s terms. Please support the creators on their channels.
      </p>

      <h2>4. Safety</h2>
      <p>
        Drills are suggestions. Coaches and players are responsible for running practices safely and adapting drills to the players&apos;
        age, level and health. Drillpin is not responsible for injuries that happen during practice.
      </p>

      <h2>5. The service</h2>
      <p>
        Drillpin is currently free and provided &quot;as is&quot;, while it is being developed. Features may change, and we can&apos;t guarantee
        the service is always available or free of errors. We will tell users about important changes to these terms.
      </p>

      <h2>6. Personal data</h2>
      <p>
        How we handle personal data is described in the <Link href="/privacy" className="text-brand-700 underline">privacy policy</Link>.
      </p>

      <h2>7. Contact and law</h2>
      <p>Questions: [contact e-mail]. These terms are governed by [Swedish] law.</p>
    </LegalPage>
  );
}
