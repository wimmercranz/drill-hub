"use client";

import { useState, useTransition } from "react";
import { ratePractice } from "@/app/actions/plans";
import { FACES, RATING_LABELS } from "./RatingSummary";

export default function RatePractice({ planId, current }: { planId: string; current: number | null }) {
  const [value, setValue] = useState(current);
  const [pending, startTransition] = useTransition();
  return (
    <div>
      <p className="font-bold">How would you rate this practice?</p>
      <p className="mb-3 text-xs text-ink-500">Anonymous — coaches only see the average.</p>
      <div className="grid grid-cols-4 gap-2">
        {[1, 2, 3, 4].map((n) => (
          <button
            key={n}
            type="button"
            disabled={pending}
            onClick={() => {
              setValue(n);
              startTransition(() => ratePractice(planId, n));
            }}
            className={`rounded-xl border-2 p-2 text-center transition ${value === n ? "border-brand-600 bg-brand-50" : "border-slate-200 hover:border-brand-300"}`}
          >
            <div className="text-2xl">{FACES[n]}</div>
            <div className="text-xs font-semibold">{n} · {RATING_LABELS[n]}</div>
          </button>
        ))}
      </div>
      {value && <p className="mt-2 text-xs text-emerald-700">Thanks! You can change your answer any time.</p>}
    </div>
  );
}
