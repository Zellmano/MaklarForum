"use client";

import { useActionState } from "react";
import { registerAgentAction } from "@/app/auth/actions";

export function RegisterAgentForm({ inviteToken }: { inviteToken?: string }) {
  const [state, action, pending] = useActionState(registerAgentAction, undefined);

  return (
    <form action={action} className="mt-4 grid gap-3">
      {inviteToken && <input type="hidden" name="invite_token" value={inviteToken} />}
      <label className="block text-sm">
        Fullständigt namn
        <input name="full_name" required maxLength={120} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
      </label>
      <label className="block text-sm">
        Företagsmail
        <input name="email" type="email" required maxLength={200} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
        <span className="mt-1 block text-xs text-[var(--muted)]">Personliga e-postadresser (gmail, hotmail, outlook m.fl.) accepteras inte.</span>
      </label>
      <label className="block text-sm">
        Lösenord
        <input name="password" type="password" required minLength={8} maxLength={200} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
      </label>
      <label className="block text-sm">
        Mäklarfirma
        <input name="firm" required maxLength={120} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
      </label>
      <label className="block text-sm">
        Stad
        <input name="city" required maxLength={80} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
      </label>
      {state?.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      <p className="text-xs text-[var(--muted)]">
        Din profil granskas manuellt av admin innan du får full tillgång. Vanligtvis inom 24 timmar.
      </p>
      <button className="pill pill-dark" disabled={pending}>
        {pending ? "Skickar in..." : "Skapa mäklarkonto"}
      </button>
    </form>
  );
}
