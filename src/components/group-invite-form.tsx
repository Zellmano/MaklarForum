"use client";

import { useState } from "react";

const MAX_INVITES_PER_DAY = 3;
const STORAGE_KEY = "group_invites";

interface InviteRecord {
  date: string;
  count: number;
}

function getTodayInvites(): InviteRecord {
  if (typeof window === "undefined") return { date: "", count: 0 };
  const today = new Date().toISOString().slice(0, 10);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed: InviteRecord = JSON.parse(raw);
      if (parsed.date === today) return parsed;
    }
  } catch {}
  return { date: today, count: 0 };
}

function incrementInvites() {
  const today = new Date().toISOString().slice(0, 10);
  const current = getTodayInvites();
  const updated: InviteRecord = {
    date: today,
    count: (current.date === today ? current.count : 0) + 1,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  return updated.count;
}

export default function GroupInviteForm({
  groupName,
  appUrl,
}: {
  groupName: string;
  appUrl: string;
}) {
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [remaining, setRemaining] = useState<number | null>(null);
  const [error, setError] = useState("");

  function checkLimit(): boolean {
    const today = getTodayInvites();
    const used = today.date === new Date().toISOString().slice(0, 10) ? today.count : 0;
    if (used >= MAX_INVITES_PER_DAY) {
      setError("Du har redan skickat 3 inbjudningar idag. Prova igen imorgon.");
      return false;
    }
    setError("");
    return true;
  }

  function buildMessage(): string {
    return `Hej! Jag vill bjuda in dig till gruppen "${groupName}" på MäklarForum — ett slutet community för verifierade fastighetsmäklare i Sverige.\n\nRegistrera dig här:\n${appUrl}/register\n\nNär du är registrerad och godkänd kan du gå med i gruppen direkt.`;
  }

  async function handleCopy() {
    if (!email.trim()) return;
    if (!checkLimit()) return;

    try {
      await navigator.clipboard.writeText(buildMessage());
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = buildMessage();
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }

    const used = incrementInvites();
    setRemaining(MAX_INVITES_PER_DAY - used);
    setCopied(true);
    setEmail("");
    setTimeout(() => setCopied(false), 3000);
  }

  function handleMailto() {
    if (!email.trim()) return;
    if (!checkLimit()) return;

    const subject = encodeURIComponent(`Inbjudan till ${groupName} på MäklarForum`);
    const body = encodeURIComponent(buildMessage());
    window.open(`mailto:${email.trim()}?subject=${subject}&body=${body}`, "_blank");

    const used = incrementInvites();
    setRemaining(MAX_INVITES_PER_DAY - used);
    setEmail("");
  }

  return (
    <div className="space-y-3">
      <div>
        <label htmlFor="group-invite-email" className="text-sm font-medium">
          Kollegans e-post
        </label>
        <input
          id="group-invite-email"
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
      {error && <p className="text-xs text-red-600">{error}</p>}
      {copied && (
        <p className="text-xs text-green-600">
          Inbjudan kopierad! {remaining !== null && remaining > 0 && `(${remaining} inbjudningar kvar idag)`}
          {remaining === 0 && "(Inga fler inbjudningar kvar idag)"}
        </p>
      )}
      {remaining !== null && !copied && remaining <= 0 && (
        <p className="text-xs text-[var(--muted)]">Du har nått dagens gräns (max {MAX_INVITES_PER_DAY}/dag).</p>
      )}
    </div>
  );
}
