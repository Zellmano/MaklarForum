import Link from "next/link";
import { requireAgent } from "@/lib/auth";
import { getAgentGroupsForUser } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AgentGroupCreateForm } from "@/components/agent-group-create-form";
import { joinAgentGroupAction } from "@/app/dashboard/actions";

export default async function AgentGroupsPage() {
  const user = await requireAgent("/dashboard/grupper");
  const groups = await getAgentGroupsForUser(user.id);
  const approved = groups.filter((group) => group.status === "approved");
  const myGroups = groups.filter((group) => group.isMember);

  // Groups the user has already applied to (pending) — so we show "Ansökan
  // inskickad" instead of a join button that looks like it does nothing.
  const supabase = await createSupabaseServerClient();
  const { data: pending } = await supabase
    .from("group_join_requests")
    .select("group_id")
    .eq("agent_id", user.id)
    .eq("status", "pending");
  const pendingGroupIds = new Set((pending ?? []).map((r) => r.group_id));

  const discover = approved.filter((g) => !g.isMember);
  const groupSections = [
    { title: "Städer", groups: discover.filter((g) => g.category === "city") },
    { title: "Mäklarfirmor & kedjor", groups: discover.filter((g) => g.category === "firm") },
    { title: "Högskolor & utbildningar", groups: discover.filter((g) => g.category === "school") },
    { title: "Övriga grupper", groups: discover.filter((g) => g.category === null) },
  ];

  if (user.role === "admin") {
    return (
      <div>
        <h1 className="text-4xl">Mäklargrupper</h1>
        <p className="mt-2 text-[var(--muted)]">
          Som admin följer du alla grupper i bakgrunden. Du står inte med som medlem och syns inte för andra.
        </p>

        <section className="mt-6 card">
          <h2 className="text-xl">Alla grupper ({approved.length})</h2>
          <div className="mt-4 space-y-3">
            {approved.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Inga godkända grupper ännu.</p>
            ) : null}
            {approved.map((group) => (
              <Link
                key={group.id}
                href={`/dashboard/grupper/${group.slug}`}
                className="block rounded-xl border border-[var(--line)] bg-white p-3 hover:border-[var(--accent)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{group.name}</p>
                    <p className="text-sm text-[var(--muted)]">
                      {group.municipality || "-"} • {group.region || "-"}
                    </p>
                    {group.description ? <p className="mt-1 text-sm text-[var(--muted)]">{group.description}</p> : null}
                  </div>
                  <p className="text-xs text-[var(--muted)]">{group.memberCount} medlemmar</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl">Grupper</h1>
      <p className="mt-2 text-[var(--muted)]">
        Städer, mäklarfirmor, skolor och nischade grupper. Öppna grupper går du med i direkt —
        privata grupper kräver att gruppens admin godkänner din ansökan.
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

      {groupSections.map(({ title, groups: sectionGroups }) =>
        sectionGroups.length === 0 ? null : (
          <section key={title} className="mt-6 card">
            <h2 className="text-xl">{title}</h2>
            <div className="mt-4 space-y-3">
              {sectionGroups.map((group) => (
                <article key={group.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link href={`/dashboard/grupper/${group.slug}`} className="font-semibold hover:text-[var(--accent)]">
                          {group.name}
                        </Link>
                        {group.isPrivate ? (
                          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                            Privat
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-[var(--muted)]">
                        {group.municipality || "-"} • {group.region || "-"}
                      </p>
                      {group.description ? <p className="mt-1 text-sm text-[var(--muted)]">{group.description}</p> : null}
                    </div>
                    <p className="text-xs text-[var(--muted)]">{group.memberCount} medlemmar</p>
                  </div>
                  <div className="mt-3">
                    {pendingGroupIds.has(group.id) ? (
                      <span className="pill pill-light opacity-60">Ansökan inskickad</span>
                    ) : (
                      <form action={joinAgentGroupAction.bind(null, group.id)}>
                        <button className="pill pill-dark">
                          {group.isPrivate ? "Ansök om medlemskap" : "Gå med"}
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>
        ),
      )}
    </div>
  );
}
