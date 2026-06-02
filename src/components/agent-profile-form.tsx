"use client";

import { useActionState } from "react";
import { updateAgentProfileAction } from "@/app/dashboard/actions";

export function AgentProfileForm({
  defaults,
}: {
  defaults: { fullName: string; firm: string; title: string; city: string; bio: string };
}) {
  const [state, action, pending] = useActionState(updateAgentProfileAction, undefined);

  return (
    <form action={action} className="grid gap-3 text-sm">
      <label>
        Namn
        <input
          value={defaults.fullName}
          readOnly
          disabled
          className="mt-1 w-full cursor-not-allowed rounded-xl border border-[var(--line)] bg-[var(--line)]/30 p-2 text-[var(--muted)]"
        />
        <span className="mt-1 block text-xs text-[var(--muted)]">
          Ditt namn är kopplat till din verifiering och kan inte ändras här. Kontakta admin om det behöver rättas.
        </span>
      </label>
      <label>
        Firma
        <input name="firm" defaultValue={defaults.firm} required className="mt-1 w-full rounded-xl border border-[var(--line)] p-2" />
      </label>
      <label>
        Titel
        <input name="title" defaultValue={defaults.title} required className="mt-1 w-full rounded-xl border border-[var(--line)] p-2" />
      </label>
      <label>
        Stad
        <input name="city" defaultValue={defaults.city} required className="mt-1 w-full rounded-xl border border-[var(--line)] p-2" />
      </label>
      <label>
        Biografi
        <textarea name="bio" defaultValue={defaults.bio} className="mt-1 min-h-24 w-full rounded-xl border border-[var(--line)] p-2" />
      </label>
      {state?.error ? <p className="text-red-700">{state.error}</p> : null}
      {state?.success ? <p className="text-emerald-700">{state.success}</p> : null}
      <button className="pill pill-dark w-fit" disabled={pending}>
        {pending ? "Sparar..." : "Spara profil"}
      </button>
    </form>
  );
}
