"use client";

import { useActionState } from "react";

type ActionState = { error?: string; success?: string };

export function AnswerComposer({
  action,
}: {
  action: (state: ActionState | undefined, formData: FormData) => Promise<ActionState>;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  return (
    <section className="card mt-4">
      <h3 className="text-lg font-semibold">Skriv ett svar</h3>
      <form action={formAction} className="mt-3">
        <textarea
          name="body"
          className="min-h-28 w-full rounded-xl border border-[var(--line)] bg-white p-3 text-sm"
          placeholder="Dela din erfarenhet eller ditt perspektiv..."
          required
          maxLength={10000}
        />
        {state?.error ? <p className="mt-2 text-sm text-red-700">{state.error}</p> : null}
        {state?.success ? <p className="mt-2 text-sm text-emerald-700">{state.success}</p> : null}
        <button type="submit" disabled={pending} className="mt-3 pill pill-dark disabled:opacity-40">
          {pending ? "Publicerar..." : "Publicera svar"}
        </button>
      </form>
    </section>
  );
}
