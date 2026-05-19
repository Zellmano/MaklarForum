"use client";

import { useActionState } from "react";
import { createAgentGroupAction } from "@/app/dashboard/actions";

export function AgentGroupCreateForm() {
  const [state, action, pending] = useActionState(createAgentGroupAction, undefined);

  return (
    <form action={action} className="grid gap-3 text-sm">
      <label>
        Gruppnamn
        <input name="name" required className="mt-1 w-full rounded-xl border border-[var(--line)] p-2" placeholder="Ex: Mäklare i Täby" />
      </label>
      <label>
        Beskrivning
        <textarea
          name="description"
          className="mt-1 min-h-20 w-full rounded-xl border border-[var(--line)] p-2"
          placeholder="Vilken typ av diskussion och tips gruppen ska ha"
        />
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label>
          Kommun
          <input name="municipality" required className="mt-1 w-full rounded-xl border border-[var(--line)] p-2" />
        </label>
        <label>
          Region
          <input name="region" required className="mt-1 w-full rounded-xl border border-[var(--line)] p-2" />
        </label>
      </div>
      {state?.error ? <p className="text-red-700">{state.error}</p> : null}
      {state?.success ? <p className="text-emerald-700">{state.success}</p> : null}
      <button className="pill pill-dark w-fit" disabled={pending}>
        {pending ? "Skickar..." : "Skapa grupp"}
      </button>
    </form>
  );
}
