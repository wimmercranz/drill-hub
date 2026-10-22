"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClub } from "@/app/actions/profile";
import { FormError, PendingContext, useFormAction } from "./ActionForm";
import SubmitButton from "./SubmitButton";

type Suggestion = { slug: string; name: string; city: string; members: number };

export default function ClubCreateForm() {
  const [state, pending, onSubmit] = useFormAction(createClub);
  const [name, setName] = useState("");
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);

  useEffect(() => {
    if (name.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    const t = setTimeout(async () => {
      const res = await fetch(`/api/clubs/similar?q=${encodeURIComponent(name)}`);
      if (res.ok) setSuggestions(await res.json());
    }, 250);
    return () => clearTimeout(t);
  }, [name]);

  return (
    <form onSubmit={onSubmit} className="space-y-3">
      <FormError state={state} />
      <input name="name" required placeholder="Club name" className="input" value={name} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      {suggestions.length > 0 && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="font-semibold text-amber-900">Did you mean one of these?</p>
          <ul className="mt-1 space-y-1">
            {suggestions.map((s) => (
              <li key={s.slug}>
                <Link href={`/clubs/${s.slug}`} className="font-medium text-brand-700 underline">{s.name}</Link>
                <span className="text-ink-500"> {s.city && `· ${s.city} `}· {s.members} member{s.members === 1 ? "" : "s"}</span>
              </li>
            ))}
          </ul>
          <label className="mt-2 flex items-center gap-2 text-ink-700">
            <input type="checkbox" name="confirmNew" className="accent-brand-600" /> This is a different club — create it anyway
          </label>
        </div>
      )}
      <input name="city" placeholder="City (optional)" className="input" />
      <PendingContext.Provider value={pending}>
        <SubmitButton pendingText="Creating…">Create club</SubmitButton>
      </PendingContext.Provider>
    </form>
  );
}
