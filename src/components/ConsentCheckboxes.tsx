import Link from "next/link";
import { MIN_AGE } from "@/lib/legal";

export default function ConsentCheckboxes() {
  return (
    <div className="space-y-2 text-sm text-ink-700">
      <label className="flex items-start gap-2">
        <input type="checkbox" name="terms" required className="mt-1 accent-brand-600" />
        <span>
          I accept the <Link href="/terms" target="_blank" className="font-semibold text-brand-700 underline">terms of use</Link> and have read the{" "}
          <Link href="/privacy" target="_blank" className="font-semibold text-brand-700 underline">privacy policy</Link>.
        </span>
      </label>
      <label className="flex items-start gap-2">
        <input type="checkbox" name="age" required className="mt-1 accent-brand-600" />
        <span>I am {MIN_AGE} or older, or my parent/guardian has agreed to me creating an account.</span>
      </label>
    </div>
  );
}
