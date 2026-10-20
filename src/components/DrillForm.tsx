"use client";

import { useState } from "react";
import type { FormState } from "@/app/actions/auth";
import SubmitButton from "./SubmitButton";
import { FormError, PendingContext, useFormAction } from "./ActionForm";

type Option = { id: string; name: string };
type Sport = Option & { emoji: string; categories: Option[] };

export type DrillDefaults = {
  title: string;
  summary: string;
  sportId: string;
  categoryIds: string[];
  level: string;
  minPlayers: number;
  durationMin: number;
  equipment: string;
  setup: string;
  steps: string;
  coachingPoints: string;
  variations: string;
  videoUrl: string;
  sourceTitle: string;
  visibility: string;
  teamId: string;
};

export default function DrillForm({
  action,
  sports,
  teams,
  defaults,
  submitLabel,
}: {
  action: (state: FormState, formData: FormData) => Promise<FormState>;
  sports: Sport[];
  teams: Option[];
  defaults: DrillDefaults;
  submitLabel: string;
}) {
  const [state, pending, onSubmit] = useFormAction(action);
  const [sportId, setSportId] = useState(defaults.sportId || sports[0]?.id);
  const [visibility, setVisibility] = useState(defaults.visibility);
  const sport = sports.find((s) => s.id === sportId);

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <FormError state={state} />

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 font-bold">Basics</legend>
        <div>
          <label className="label" htmlFor="title">Title *</label>
          <input id="title" name="title" required defaultValue={defaults.title} className="input" placeholder="e.g. Mikan Drill" />
        </div>
        <div>
          <label className="label" htmlFor="summary">Short summary *</label>
          <textarea id="summary" name="summary" required rows={2} defaultValue={defaults.summary} className="input" placeholder="One or two sentences on what the drill is and why it's useful." />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="sportId">Sport</label>
            <select id="sportId" name="sportId" value={sportId} onChange={(e) => setSportId(e.target.value)} className="input">
              {sports.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="level">Level</label>
            <select id="level" name="level" defaultValue={defaults.level} className="input">
              <option value="BEGINNER">Beginner</option>
              <option value="INTERMEDIATE">Intermediate</option>
              <option value="ADVANCED">Advanced</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="minPlayers">Minimum players</label>
            <input id="minPlayers" name="minPlayers" type="number" min={1} max={50} defaultValue={defaults.minPlayers} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="durationMin">Duration (minutes)</label>
            <input id="durationMin" name="durationMin" type="number" min={1} max={180} defaultValue={defaults.durationMin} className="input" />
          </div>
        </div>
        <div>
          <label className="label" htmlFor="equipment">Equipment</label>
          <input id="equipment" name="equipment" defaultValue={defaults.equipment} className="input" placeholder="e.g. 2 balls, 4 cones, half court" />
        </div>
        <div>
          <span className="label">Skills *</span>
          <div className="flex flex-wrap gap-2">
            {sport?.categories.map((c) => (
              <label key={c.id} className="flex cursor-pointer items-center gap-1.5 rounded-full border border-slate-300 px-3 py-1 text-sm has-[:checked]:border-brand-600 has-[:checked]:bg-brand-50 has-[:checked]:text-brand-700">
                <input type="checkbox" name="categoryIds" value={c.id} defaultChecked={defaults.categoryIds.includes(c.id)} className="accent-brand-600" />
                {c.name}
              </label>
            ))}
          </div>
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 font-bold">Video (optional)</legend>
        <div>
          <label className="label" htmlFor="videoUrl">YouTube or Vimeo link</label>
          <input id="videoUrl" name="videoUrl" type="url" defaultValue={defaults.videoUrl} className="input" placeholder="https://www.youtube.com/watch?v=…" />
          <p className="mt-1 text-xs text-ink-500">The video is embedded from its creator — leave empty for a text-only drill.</p>
        </div>
        <div>
          <label className="label" htmlFor="sourceTitle">Credit / video title</label>
          <input id="sourceTitle" name="sourceTitle" defaultValue={defaults.sourceTitle} className="input" placeholder="e.g. Channel name – video title" />
        </div>
      </fieldset>

      <fieldset className="card space-y-4 p-5">
        <legend className="px-1 font-bold">Instructions</legend>
        <div>
          <label className="label" htmlFor="setup">Setup</label>
          <textarea id="setup" name="setup" rows={2} defaultValue={defaults.setup} className="input" placeholder="Where players start, what equipment goes where." />
        </div>
        <div>
          <label className="label" htmlFor="steps">Steps <span className="font-normal text-ink-500">(one per line)</span></label>
          <textarea id="steps" name="steps" rows={5} defaultValue={defaults.steps} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="coachingPoints">Coaching points <span className="font-normal text-ink-500">(one per line)</span></label>
          <textarea id="coachingPoints" name="coachingPoints" rows={3} defaultValue={defaults.coachingPoints} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="variations">Variations <span className="font-normal text-ink-500">(one per line)</span></label>
          <textarea id="variations" name="variations" rows={2} defaultValue={defaults.variations} className="input" />
        </div>
      </fieldset>

      <fieldset className="card space-y-3 p-5">
        <legend className="px-1 font-bold">Who can see it?</legend>
        {[
          ["PUBLIC", "Everyone", "Shown in the public drill library."],
          ["TEAM", "My team only", "Only members of the selected team (coaches only)."],
          ["PRIVATE", "Only me", "A private drill for your own page."],
        ].map(([value, label, help]) => (
          <label key={value} className="flex cursor-pointer items-start gap-3">
            <input type="radio" name="visibility" value={value} checked={visibility === value} onChange={() => setVisibility(value)} className="mt-1 accent-brand-600" disabled={value === "TEAM" && teams.length === 0} />
            <span>
              <span className="font-medium">{label}</span>
              <span className="block text-sm text-ink-500">{help}{value === "TEAM" && teams.length === 0 && " You don't coach a team yet."}</span>
            </span>
          </label>
        ))}
        {visibility === "TEAM" && (
          <select name="teamId" defaultValue={defaults.teamId || teams[0]?.id} className="input max-w-xs">
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        )}
        {visibility !== "TEAM" && <input type="hidden" name="teamId" value="" />}
      </fieldset>

      <FormError state={state} />
      <PendingContext.Provider value={pending}>
        <SubmitButton>{submitLabel}</SubmitButton>
      </PendingContext.Provider>
    </form>
  );
}
