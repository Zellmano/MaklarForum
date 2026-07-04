import Link from "next/link";
import { requireAgent } from "@/lib/auth";
import { getAgents } from "@/lib/data";
import { memberTypeLabels } from "@/lib/types";
import { UserAvatar } from "@/components/user-avatar";

export default async function MembersPage() {
  const user = await requireAgent("/dashboard/medlemmar");
  const agents = await getAgents();

  return (
    <div>
      <h1 className="text-4xl">Medlemmar i communityt</h1>
      <p className="mt-2 max-w-3xl text-[var(--muted)]">
        Alla verifierade mäklare, assistenter och studenter på MäklarForum. Klicka för att se
        profil och starta en konversation.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {agents.length === 0 && (
          <p className="col-span-3 text-sm text-[var(--muted)]">Inga verifierade mäklare ännu.</p>
        )}
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="card flex items-center justify-between gap-3"
          >
            <Link href={`/dashboard/medlemmar/${agent.slug}`} className="flex items-center gap-3 hover:opacity-80">
              <UserAvatar url={agent.avatarUrl} name={agent.fullName} />
              <div>
                <p className="font-semibold">
                  {agent.fullName}
                  {agent.memberType && agent.memberType !== "agent" ? (
                    <span className="ml-2 rounded-full bg-[#f8e7b8] px-2 py-0.5 text-[10px] font-semibold text-[#5a430f]">
                      {memberTypeLabels[agent.memberType]}
                    </span>
                  ) : null}
                </p>
                <p className="text-sm text-[var(--muted)]">
                  {agent.title || (agent.memberType ? memberTypeLabels[agent.memberType] : "Mäklare")} &bull; {agent.firm || "-"}
                  {agent.memberType === "student" && agent.studyYear
                    ? ` • Årgång ${agent.studyYear === "tidigare" ? "tidigare" : agent.studyYear}`
                    : ""}
                </p>
                <p className="text-xs text-[var(--muted)]">{agent.city}</p>
              </div>
            </Link>
            {agent.id !== user.id && (
              <Link
                href={`/dashboard/messages/${agent.id}`}
                className="shrink-0 rounded-full border border-[var(--line)] p-2 hover:border-[var(--accent)] hover:bg-blue-50"
                title="Skicka meddelande" aria-label="Skicka meddelande"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </Link>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
