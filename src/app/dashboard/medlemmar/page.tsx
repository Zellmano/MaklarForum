import Link from "next/link";
import { requireVerifiedAgent } from "@/lib/auth";
import { getAgents } from "@/lib/data";
import { UserAvatar } from "@/components/user-avatar";

export default async function MembersPage() {
  const user = await requireVerifiedAgent("/dashboard/medlemmar");
  const agents = await getAgents();

  return (
    <div>
      <h1 className="text-4xl">Mäklare i communityt</h1>
      <p className="mt-2 max-w-3xl text-[var(--muted)]">
        Alla verifierade mäklare på MäklarForum. Klicka för att se profil och starta en konversation.
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
                <p className="font-semibold">{agent.fullName}</p>
                <p className="text-sm text-[var(--muted)]">{agent.title || "Mäklare"} &bull; {agent.firm || "-"}</p>
                <p className="text-xs text-[var(--muted)]">{agent.city}</p>
              </div>
            </Link>
            {agent.id !== user.id && (
              <Link
                href={`/dashboard/messages/${agent.id}`}
                className="shrink-0 rounded-full border border-[var(--line)] p-2 hover:border-[var(--accent)] hover:bg-blue-50"
                title="Skicka meddelande"
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
