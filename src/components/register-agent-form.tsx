"use client";

import { useActionState, useState } from "react";
import { registerAgentAction } from "@/app/auth/actions";

type MemberType = "agent" | "assistant" | "student";

const memberTypeOptions: Array<{ value: MemberType; label: string }> = [
  { value: "agent", label: "Fastighetsmäklare" },
  { value: "assistant", label: "Mäklarassistent" },
  { value: "student", label: "Mäklarstudent" },
];

const schools = [
  "Malmö universitet",
  "KTH",
  "Högskolan i Gävle",
  "Högskolan Väst",
  "Luleå tekniska universitet",
  "Högskolan i Halmstad",
  "Annan utbildning",
];

const currentYear = new Date().getFullYear();
const studyYears = Array.from({ length: 10 }, (_, i) => String(currentYear - i));

export function RegisterAgentForm({ inviteToken }: { inviteToken?: string }) {
  const [state, action, pending] = useActionState(registerAgentAction, undefined);
  const [memberType, setMemberType] = useState<MemberType>("agent");

  const isStudent = memberType === "student";

  return (
    <form action={action} className="mt-4 grid gap-3">
      {inviteToken && <input type="hidden" name="invite_token" value={inviteToken} />}
      <label className="block text-sm">
        Jag är
        <select
          name="member_type"
          value={memberType}
          onChange={(e) => setMemberType(e.target.value as MemberType)}
          className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2"
        >
          {memberTypeOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block text-sm">
        Fullständigt namn
        <input name="full_name" required maxLength={120} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
      </label>
      <label className="block text-sm">
        {isStudent ? "E-postadress" : "Företagsmail"}
        <input name="email" type="email" required maxLength={200} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
        <span className="mt-1 block text-xs text-[var(--muted)]">
          {isStudent
            ? "Som student får du använda din privata e-post eller studentmail."
            : "Personliga e-postadresser (gmail, hotmail, outlook m.fl.) accepteras inte."}
        </span>
      </label>
      <label className="block text-sm">
        Lösenord
        <input name="password" type="password" required minLength={8} maxLength={200} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
      </label>
      {isStudent ? (
        <>
          <label className="block text-sm">
            Utbildning/skola
            <select name="firm" required className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2">
              {schools.map((school) => (
                <option key={school} value={school}>
                  {school}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            Årgång (startår)
            <select name="study_year" required className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2">
              {studyYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
              <option value="tidigare">Tidigare</option>
            </select>
          </label>
        </>
      ) : (
        <label className="block text-sm">
          Mäklarfirma
          <input name="firm" required maxLength={120} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
        </label>
      )}
      <label className="block text-sm">
        Stad
        <input name="city" required maxLength={80} className="mt-1 w-full rounded-xl border border-[var(--line)] bg-white p-2" />
      </label>
      {state?.error ? <p className="text-sm text-red-700">{state.error}</p> : null}
      <p className="text-xs text-[var(--muted)]">
        Din profil granskas manuellt av admin innan du får full tillgång. Vanligtvis inom 24 timmar.
      </p>
      <button className="pill pill-dark" disabled={pending}>
        {pending ? "Skickar in..." : "Skapa konto"}
      </button>
    </form>
  );
}
