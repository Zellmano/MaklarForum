"use client";

import { useActionState } from "react";
import { requestPasswordResetAction } from "@/app/auth/actions";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(requestPasswordResetAction, undefined);

  return (
    <form action={action} className="mt-4 grid gap-3 text-sm">
      <label>
        E-post
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="mt-1 w-full rounded-xl border border-[var(--line)] p-2"
        />
      </label>
      {state?.error ? <p className="text-red-700">{state.error}</p> : null}
      {state?.success ? <p className="text-emerald-700">{state.success}</p> : null}
      <button type="submit" disabled={pending} className="pill pill-dark w-fit">
        {pending ? "Skickar..." : "Skicka återställningslänk"}
      </button>
    </form>
  );
}
