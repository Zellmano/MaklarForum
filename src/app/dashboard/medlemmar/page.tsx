import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAgents } from "@/lib/data";

export default async function MembersPage() {
  await requireRole("agent", "/dashboard/medlemmar");
  const agents = await getAgents();

  return (
    <div>
      <h1 className="text-4xl">Mäklare i communityt</h1>
      <p className="mt-2 max-w-3xl text-[var(--muted)]">
        Alla verifierade mäklare på MäklarForum. Klicka för att se profil och starta en konversation.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {agents.length === 0 && (
          <p className="col-span-3 text-sm text-[var(--muted)]">Inga verifierade mäklare ännu.</p>
        )}
        {agents.map((agent) => (
          <Link
            key={agent.id}
            href={`/dashboard/medlemmar/${agent.slug}`}
            className="card hover:border-[var(--accent)]"
          >
            <p className="font-semibold">{agent.fullName}</p>
            <p className="mt-1 text-sm text-[var(--muted)]">{agent.title || "Mäklare"} • {agent.firm || "-"}</p>
            <p className="mt-1 text-xs text-[var(--muted)]">{agent.city}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
