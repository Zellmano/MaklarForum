import type { Metadata } from "next";
import { AgentCard } from "@/components/agent-card";
import { getAgents } from "@/lib/data";

export const metadata: Metadata = {
  title: "Verifierade mäklare i Sverige",
  description: "Hitta verifierade fastighetsmäklare med FMI-nummer. Se profiler, svar och tips från mäklare i hela Sverige.",
};

export default async function AgentsPage() {
  const agents = await getAgents();

  return (
    <div>
      <h1 className="text-4xl">Verifierade mäklare</h1>
      <p className="mt-2 max-w-3xl text-[var(--muted)]">
        Alla profiler är kopplade till FMI-nummer och verifieras av admin innan de får svara eller medverka i mäklarforumet.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        {agents.length === 0 && (
          <p className="col-span-3 text-sm text-[var(--muted)]">Inga verifierade mäklare att visa ännu.</p>
        )}
        {agents.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </div>
  );
}
