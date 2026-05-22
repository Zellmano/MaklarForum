"use client";

import { useActionState, useState } from "react";
import { createInvitationAction } from "@/app/dashboard/invite-actions";

export default function InviteColleagueForm({ groupId }: { groupId?: string }) {
  const [state, action, pending] = useActionState(createInvitationAction, undefined);
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    if (!state?.inviteUrl) return;
    const message = `Hej! Jag vill bjuda in dig till MäklarForum — ett slutet community för verifierade fastighetsmäklare i Sverige.\n\nRegistrera dig här:\n${state.inviteUrl}`;
    try {
      await navigator.clipboard.writeText(message);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = message;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  function handleMailto() {
    if (!state?.inviteUrl) return;
    const subject = encodeURIComponent("Inbjudan till MäklarForum");
    const body = encodeURIComponent(`Hej!\n\nJag vill bjuda in dig till MäklarForum — ett slutet community för verifierade fastighetsmäklare i Sverige.\n\nRegistrera dig här:\n${state.inviteUrl}\n\nVi ses på forumet!`);
    window.open(`mailto:?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <div className="space-y-3">
      <form action={action} className="space-y-3">
        {groupId && <input type="hidden" name="group_id" value={groupId} />}
        <div>
          <label htmlFor="invite-email" className="text-sm font-medium">
            Kollegans företagsmail
          </label>
          <input
            id="invite-email"
            name="email"
            type="email"
            required
            placeholder="namn@maklarfirma.se"
            className="mt-1 w-full rounded-xl border border-[var(--line)] p-2 text-sm"
          />
        </div>
        <button className="pill pill-dark" disabled={pending}>
          {pending ? "Skapar inbjudan..." : "Skapa inbjudningslänk"}
        </button>
      </form>

      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}

      {state?.inviteUrl && (
        <div className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3">
          <p className="text-sm text-emerald-800">{state.success}</p>
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={state.inviteUrl}
              className="w-full rounded-lg border border-[var(--line)] bg-white p-2 text-xs"
              onFocus={(e) => e.target.select()}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleMailto} className="pill pill-dark text-xs">
              Skicka via e-post
            </button>
            <button onClick={handleCopy} className="pill pill-light text-xs">
              {copied ? "Kopierat!" : "Kopiera länk"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
