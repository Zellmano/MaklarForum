"use client";

import { useActionState } from "react";
import { createAgentTipAction } from "@/app/dashboard/fragor/actions";

export function AgentTipForm() {
  const [state, action, pending] = useActionState(createAgentTipAction, undefined);

  return (
    <form action={action} className="grid gap-3 text-sm">
      <label>
        Rubrik
        <input name="title" required maxLength={200} className="mt-1 w-full rounded-xl border border-[var(--line)] p-2" placeholder="Ex: 3 saker köpare missar i budgivning" />
      </label>
      <label>
        Tips
        <textarea name="body" required maxLength={10000} className="mt-1 min-h-24 w-full rounded-xl border border-[var(--line)] p-2" />
      </label>
      <div className="grid gap-3 md:grid-cols-3">
        <label>
          Målgrupp
          <select name="audience" className="mt-1 w-full rounded-xl border border-[var(--line)] p-2">
            <option value="general">Allmänt</option>
            <option value="buyer">Köpare</option>
            <option value="seller">Säljare</option>
          </select>
        </label>
        <label>
          Räckvidd
          <select name="geo_scope" className="mt-1 w-full rounded-xl border border-[var(--line)] p-2">
            <option value="open">Hela Sverige</option>
            <option value="regional">Regional</option>
            <option value="local">Lokal</option>
          </select>
        </label>
        <label>
          Kommun
          <input name="municipality" className="mt-1 w-full rounded-xl border border-[var(--line)] p-2" />
        </label>
      </div>
      <label>
        Region
        <input name="region" className="mt-1 w-full rounded-xl border border-[var(--line)] p-2" />
      </label>
      {state?.error ? <p className="text-red-700">{state.error}</p> : null}
      {state?.success ? <p className="text-emerald-700">{state.success}</p> : null}
      <button className="pill pill-dark w-fit" disabled={pending}>
        {pending ? "Publicerar..." : "Publicera tips"}
      </button>
    </form>
  );
}
