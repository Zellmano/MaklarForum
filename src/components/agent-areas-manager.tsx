"use client";

import { useActionState } from "react";
import { addAgentAreaAction, removeAgentAreaAction } from "@/app/dashboard/profile-actions";

type Area = { id: string; municipality: string; region: string };

export function AgentAreasManager({ areas }: { areas: Area[] }) {
  const [state, action, pending] = useActionState(addAgentAreaAction, undefined);

  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-3 text-sm">
      <p className="font-medium text-[var(--ink)]">Områden du verkar i</p>
      <p className="mt-1 text-xs text-[var(--muted)]">
        Lägg till de kommuner du jobbar i — det hjälper kollegor att hitta dig.
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        {areas.length === 0 ? (
          <span className="text-xs text-[var(--muted)]">Inga områden sparade ännu.</span>
        ) : (
          areas.map((a) => (
            <span key={a.id} className="pill pill-light inline-flex items-center gap-2">
              {a.municipality}, {a.region}
              <form action={removeAgentAreaAction.bind(null, a.id)} className="inline">
                <button type="submit" aria-label={`Ta bort ${a.municipality}`} className="text-[var(--muted)] hover:text-red-700">
                  ✕
                </button>
              </form>
            </span>
          ))
        )}
      </div>

      <form action={action} className="mt-4 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input
          name="municipality"
          placeholder="Kommun (t.ex. Täby)"
          required
          maxLength={80}
          className="rounded-xl border border-[var(--line)] p-2"
        />
        <input
          name="region"
          placeholder="Region (t.ex. Stockholm)"
          required
          maxLength={80}
          className="rounded-xl border border-[var(--line)] p-2"
        />
        <button className="pill pill-dark" disabled={pending}>
          {pending ? "Lägger till…" : "Lägg till"}
        </button>
      </form>
      {state?.error ? <p className="mt-2 text-xs text-red-700">{state.error}</p> : null}
      {state?.success ? <p className="mt-2 text-xs text-emerald-700">{state.success}</p> : null}
    </div>
  );
}
