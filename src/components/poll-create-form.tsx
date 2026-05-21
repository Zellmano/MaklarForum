"use client";

import { useActionState, useState } from "react";
import { createPollAction } from "@/app/dashboard/grupper/actions";

export default function PollCreateForm({
  groupId,
  groupSlug,
}: {
  groupId: string;
  groupSlug: string;
}) {
  const bound = createPollAction.bind(null, groupId, groupSlug);
  const [state, action, pending] = useActionState(bound, undefined);
  const [optionCount, setOptionCount] = useState(2);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="pill pill-light">
        Skapa omröstning
      </button>
    );
  }

  return (
    <form action={action} className="rounded-xl border border-[var(--line)] bg-white p-4 space-y-3">
      <h3 className="text-lg font-medium">Ny omröstning</h3>
      <label className="block text-sm">
        Fråga / Rubrik
        <input
          name="title"
          required
          maxLength={200}
          className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2"
        />
      </label>
      <label className="block text-sm">
        Beskrivning (valfritt)
        <textarea
          name="description"
          maxLength={1000}
          className="mt-1 min-h-16 w-full rounded-xl border border-[var(--line)] bg-white p-2"
        />
      </label>
      <div className="space-y-2">
        <p className="text-sm font-medium">Alternativ</p>
        {Array.from({ length: optionCount }).map((_, i) => (
          <input
            key={i}
            name={`option_${i}`}
            placeholder={`Alternativ ${i + 1}`}
            required={i < 2}
            maxLength={200}
            className="w-full rounded-xl border border-[var(--line)] bg-white p-2 text-sm"
          />
        ))}
        {optionCount < 10 && (
          <button
            type="button"
            onClick={() => setOptionCount((c) => c + 1)}
            className="text-sm text-[var(--accent)]"
          >
            + Lägg till alternativ
          </button>
        )}
      </div>
      {state?.error && <p className="text-sm text-red-700">{state.error}</p>}
      {state?.success && <p className="text-sm text-emerald-700">{state.success}</p>}
      <div className="flex gap-2">
        <button className="pill pill-dark" disabled={pending}>
          {pending ? "Skapar..." : "Publicera omröstning"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="pill pill-light">
          Avbryt
        </button>
      </div>
    </form>
  );
}
