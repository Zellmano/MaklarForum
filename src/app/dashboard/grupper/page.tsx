import Link from "next/link";
import { requireAgent } from "@/lib/auth";
import { getAgentGroupsForUser } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AgentGroupCreateForm } from "@/components/agent-group-create-form";
import { GroupDirectory } from "@/components/group-directory";

export default async function AgentGroupsPage() {
  const user = await requireAgent("/dashboard/grupper");
  const groups = await getAgentGroupsForUser(user.id);
  const approved = groups.filter((group) => group.status === "approved");
  const myGroups = groups.filter((group) => group.isMember);
  const userEmailDomain = user.email.split("@")[1]?.toLowerCase() ?? "";

  // Groups the user has already applied to (pending) — so we show "Ansökan
  // inskickad" instead of a join button that looks like it does nothing.
  const supabase = await createSupabaseServerClient();
  const { data: pending } = await supabase
    .from("group_join_requests")
    .select("group_id")
    .eq("agent_id", user.id)
    .eq("status", "pending");
  const pendingGroupIds = (pending ?? []).map((r) => r.group_id);

  if (user.role === "admin") {
    return (
      <div>
        <h1 className="text-4xl">Grupper</h1>
        <p className="mt-2 text-[var(--muted)]">
          Som admin följer du alla grupper i bakgrunden. Du står inte med som medlem och syns inte
          för andra. Du kan godkänna ansökningar inne på varje grupp.
        </p>

        <div className="mt-6">
          <GroupDirectory
            groups={approved}
            pendingGroupIds={[]}
            userEmailDomain=""
            showJoin={false}
          />
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl">Grupper</h1>
      <p className="mt-2 text-[var(--muted)]">
        Städer, mäklarfirmor, skolor och nischade grupper. Ansök för att gå med — gruppens admin
        godkänner. Har du företagsmail som matchar en firmagrupp går du med direkt.
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
        <h2 className="text-xl">Upptäck grupper</h2>
        <div className="mt-4">
          <GroupDirectory
            groups={approved.filter((g) => !g.isMember)}
            pendingGroupIds={pendingGroupIds}
            userEmailDomain={userEmailDomain}
            showJoin
          />
        </div>
      </section>

      <section className="mt-6 card">
        <h2 className="text-xl">Skapa ny grupp</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">Exempel: Mäklare i Täby, Lyxsegmentet Stockholm, Mäklarchefer i Skåne.</p>
        <div className="mt-4">
          <AgentGroupCreateForm />
        </div>
      </section>
    </div>
  );
}
