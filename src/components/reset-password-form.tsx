"use client";

import { useActionState } from "react";
import { updatePasswordAction } from "@/app/auth/actions";

export function ResetPasswordForm() {
  const [state, action, pending] = useActionState(updatePasswordAction, undefined);

  return (
    <form action={action} className="mt-4 grid gap-3 text-sm">
      <label>
        Nytt lösenord
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-xl border border-[var(--line)] p-2"
        />
      </label>
      <label>
        Bekräfta lösenord
        <input
          name="confirm"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="mt-1 w-full rounded-xl border border-[var(--line)] p-2"
        />
      </label>
      {state?.error ? <p className="text-red-700">{state.error}</p> : null}
      <button type="submit" disabled={pending} className="pill pill-dark w-fit">
        {pending ? "Sparar..." : "Spara nytt lösenord"}
      </button>
    </form>
  );
}
