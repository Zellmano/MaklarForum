"use client";

import { useState } from "react";

export default function InviteColleagueForm({ appUrl }: { appUrl: string }) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const registerUrl = `${appUrl}/register`;
  const message = `Hej! Jag använder MäklarForum — ett slutet community för verifierade fastighetsmäklare. Registrera dig här: ${registerUrl}`;

  async function handleCopy() {
    if (!email.trim()) return;

    const personalMessage = `Hej! Jag använder MäklarForum — ett slutet community för verifierade fastighetsmäklare i Sverige. Gå med du också!\n\nRegistrera dig med din företagsmail här:\n${registerUrl}\n\nSkickat till: ${email.trim()}`;

    try {
      await navigator.clipboard.writeText(personalMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = personalMessage;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    }
  }

  function handleMailto() {
    if (!email.trim()) return;
    const subject = encodeURIComponent("Inbjudan till MäklarForum");
    const body = encodeURIComponent(`Hej!\n\nJag använder MäklarForum — ett slutet community för verifierade fastighetsmäklare i Sverige. Gå med du också!\n\nRegistrera dig med din företagsmail här:\n${registerUrl}\n\nVi ses på forumet!`);
    window.open(`mailto:${email.trim()}?subject=${subject}&body=${body}`, "_blank");
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="invite-email" className="text-sm font-medium">
          Kollegans företagsmail
        </label>
        <input
          id="invite-email"
          type="email"
          placeholder="namn@maklarfirma.se"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-1 w-full rounded-xl border border-[var(--line)] p-2 text-sm"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleMailto}
          disabled={!email.trim()}
          className="pill pill-dark disabled:opacity-50"
        >
          Skicka via e-post
        </button>
        <button
          onClick={handleCopy}
          disabled={!email.trim()}
          className="pill pill-light disabled:opacity-50"
        >
          {copied ? "Kopierat!" : "Kopiera inbjudan"}
        </button>
      </div>
      {copied && (
        <p className="text-xs text-green-600">
          Inbjudan kopierad — klistra in i valfri meddelandeapp!
        </p>
      )}
    </div>
  );
}
