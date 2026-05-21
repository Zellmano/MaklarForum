import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAgentGroupsForUser } from "@/lib/data";
import { AgentGroupCreateForm } from "@/components/agent-group-create-form";
import { joinAgentGroupAction } from "@/app/dashboard/actions";

export default async function AgentGroupsPage() {
  const user = await requireRole("agent", "/dashboard/grupper");
  const groups = await getAgentGroupsForUser(user.id);
  const approved = groups.filter((group) => group.status === "approved");
  const myGroups = groups.filter((group) => group.isMember);

  return (
    <div>
      <h1 className="text-4xl">Mäklargrupper</h1>
      <p className="mt-2 text-[var(--muted)]">
        Geografiska och nischade grupper. Skicka en ansökan för att gå med — gruppens admin godkänner nya medlemmar.
      </p>

      <section className="mt-6 card">
        <h2 className="text-xl">Mina grupper</h2>
        <div className="mt-4 space-y-3">
          {myGroups.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Du är inte med i någon grupp ännu.</p>
          ) : null}
          {myGroups.map((group) => (
            <Link
              key={group.id}
              href={`/dashboard/grupper/${group.slug}`}
              className="block rounded-xl border border-[var(--line)] bg-white p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{group.name}</p>
                  <p className="text-sm text-[var(--muted)]">
                    {group.municipality || "-"} • {group.region || "-"}
                  </p>
                </div>
                <p className="text-xs text-[var(--muted)]">{group.memberCount} medlemmar</p>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 card">
        <h2 className="text-xl">Skapa ny grupp</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Exempel: Mäklare i Täby, Lyxsegmentet Stockholm, Mäklarchefer i Skåne.</p>
        <div className="mt-4">
          <AgentGroupCreateForm />
        </div>
      </section>

      <section className="mt-6 card">
        <h2 className="text-xl">Upptäck grupper</h2>
        <div className="mt-4 space-y-3">
          {approved.filter((g) => !g.isMember).length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Du är redan med i alla tillgängliga grupper.</p>
          ) : null}
          {approved.filter((g) => !g.isMember).map((group) => (
            <article key={group.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Link href={`/dashboard/grupper/${group.slug}`} className="font-semibold hover:text-[var(--accent)]">
                      {group.name}
                    </Link>
                  </div>
                  <p className="text-sm text-[var(--muted)]">
                    {group.municipality || "-"} • {group.region || "-"}
                  </p>
                  {group.description ? <p className="mt-1 text-sm text-[var(--muted)]">{group.description}</p> : null}
                </div>
                <p className="text-xs text-[var(--muted)]">{group.memberCount} medlemmar</p>
              </div>
              <div className="mt-3">
                <form action={joinAgentGroupAction.bind(null, group.id)}>
                  <button className="pill pill-dark">Begär medlemskap</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
