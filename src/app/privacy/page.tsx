import Link from "next/link";
import LegalPage from "@/components/LegalPage";
import { MIN_AGE } from "@/lib/legal";

export const metadata = { title: "Privacy policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="October 2026">
      <p>
        This policy explains what personal data Drillpin collects, why, and what rights you have under the EU General Data
        Protection Regulation (GDPR). The data controller is [Owner name / company, organisation number, address, contact e-mail].
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account:</strong> name, e-mail address, password (stored encrypted, never readable), or your Google account ID if you sign in with Google.</li>
        <li><strong>Profile:</strong> username, profile picture, short bio, the clubs and teams you belong to, and whether your profile is public or private.</li>
        <li><strong>Activity:</strong> drills you save, create or add to a team, practice plans, and your practice ratings.</li>
        <li><strong>Consent:</strong> when you accepted these terms and which version.</li>
        <li><strong>Technical:</strong> a login cookie so you stay logged in. We do not use advertising or tracking cookies.</li>
      </ul>

      <h2>Why we use it (legal basis)</h2>
      <ul>
        <li>To provide the service you signed up for: your account, boards, teams and practice plans (<em>performance of a contract</em>).</li>
        <li>To keep the service safe and working, and prevent misuse (<em>legitimate interest</em>).</li>
        <li>To send e-mails you ask for, such as team invitations and password resets.</li>
      </ul>
      <p>We never sell your data and never use it for advertising.</p>

      <h2>Who can see your data</h2>
      <ul>
        <li><strong>Public profile:</strong> anyone can see your name, picture, bio, clubs, teams and collected drills.</li>
        <li><strong>Private profile</strong> (the default): only you and people on your teams.</li>
        <li>Coaches on your team can see your name and e-mail address. Club admins can see the club&apos;s member list.</li>
        <li><strong>Practice ratings are anonymous:</strong> coaches only see the average and the number of answers, never who answered what.</li>
      </ul>

      <h2>Service providers</h2>
      <p>We use these providers to run Drillpin. They only process data on our behalf, under data processing agreements:</p>
      <ul>
        <li>[Vercel] — hosting of the website.</li>
        <li>[Neon] — database.</li>
        <li>[Resend] — sending e-mails.</li>
        <li>Google — only if you choose &quot;Continue with Google&quot;.</li>
        <li>YouTube — only when you press play on a video, YouTube loads and may set its own cookies.</li>
      </ul>
      <p>Some providers are based in the USA. Transfers are protected by the EU–US Data Privacy Framework or the EU Standard Contractual Clauses.</p>

      <h2>How long we keep it</h2>
      <p>
        We keep your data while you have an account. When you delete your account, your personal data is deleted immediately.
        Public drills you created stay in the library without your name. [Backups are deleted within 30 days.]
      </p>

      <h2>Children</h2>
      <p>
        Drillpin is used by youth teams. Users under {MIN_AGE} need permission from a parent or guardian. Profiles are private by
        default. Parents can contact us at [contact e-mail] to see or delete a child&apos;s data.
      </p>

      <h2>Your rights</h2>
      <ul>
        <li><strong>Access and portability:</strong> download all your data under <Link href="/settings" className="text-brand-700 underline">Profile settings → Your data</Link>.</li>
        <li><strong>Correction:</strong> change your details in Profile settings.</li>
        <li><strong>Deletion:</strong> delete your account in Profile settings.</li>
        <li><strong>Objection and restriction:</strong> contact us at [contact e-mail].</li>
        <li>
          <strong>Complaints:</strong> you can complain to your national data protection authority. In Sweden this is the
          Swedish Authority for Privacy Protection (IMY), imy.se.
        </li>
      </ul>
    </LegalPage>
  );
}
