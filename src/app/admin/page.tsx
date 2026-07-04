import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminMetrics, getPendingAgentVerifications, getPendingGroupApprovals, getPendingModerationItems } from "@/lib/data";
import {
  approveAgentAction,
  approveGroupAction,
  approveModerationItemAction,
  deleteUserAction,
  reactivateAgentAction,
  rejectAgentAction,
  rejectGroupAction,
  rejectModerationItemAction,
  suspendAgentAction,
  updateAgentEmailAction,
} from "@/app/admin/actions";
import { formatDate } from "@/lib/format";

const memberTypeLabel: Record<string, string> = {
  agent: "Mäklare",
  assistant: "Assistent",
  student: "Student",
};

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  await requireRole("admin", "/admin");
  const { q } = await searchParams;
  const query = (q ?? "").trim();

  let metrics = { totalUsers: 0, verifiedAgents: 0, payingAgents: 0, flaggedItems: 0 };
  let pendingAgents: Awaited<ReturnType<typeof getPendingAgentVerifications>> = [];
  let pendingGroups: Awaited<ReturnType<typeof getPendingGroupApprovals>> = [];
  let pendingModeration: Awaited<ReturnType<typeof getPendingModerationItems>> = [];
  let users: Array<{
    id: string;
    full_name: string;
    email: string;
    role: string;
    member_type: string | null;
    firm: string | null;
    city: string | null;
    verification_status: string;
    last_seen_at: string | null;
    created_at: string;
  }> = [];
  let invitations: Array<{ id: string; email: string; status: string; created_at: string; reminded_at: string | null; inviter: { full_name: string } | { full_name: string }[] | null }> = [];

  try {
    [metrics, pendingAgents, pendingGroups, pendingModeration] = await Promise.all([
      getAdminMetrics(),
      getPendingAgentVerifications(),
      getPendingGroupApprovals(),
      getPendingModerationItems(),
    ]);
    const supabase = await createSupabaseServerClient();
    let usersQuery = supabase
      .from("profiles")
      .select("id, full_name, email, role, member_type, firm, city, verification_status, last_seen_at, created_at")
      .order("created_at", { ascending: false })
      .limit(30);
    if (query) {
      usersQuery = usersQuery.or(
        `full_name.ilike.%${query}%,email.ilike.%${query}%,firm.ilike.%${query}%,city.ilike.%${query}%`,
      );
    }
    const [{ data }, { data: inviteData }] = await Promise.all([
      usersQuery,
      supabase
        .from("invitations")
        .select("id, email, status, created_at, reminded_at, inviter:inviter_id(full_name)")
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    users = data ?? [];
    invitations = inviteData ?? [];
  } catch (err) {
    console.error("Admin data fetch error:", err);
  }

  const invitedTotal = invitations.length;
  const invitedRegistered = invitations.filter((i) => i.status === "registered").length;

  return (
    <div>
      <h1 className="text-4xl">Adminpanel</h1>
      <p className="mt-2 max-w-3xl text-[var(--muted)]">
        Central kontrollpanel för verifiering, moderering, användare, betalningar och plattformsstatus.
      </p>

      <section className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="metric">
          <p className="text-2xl font-semibold">{metrics.totalUsers}</p>
          <p className="text-xs text-[var(--muted)]">Totala användare</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{metrics.verifiedAgents}</p>
          <p className="text-xs text-[var(--muted)]">Verifierade mäklare</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{metrics.payingAgents}</p>
          <p className="text-xs text-[var(--muted)]">Betalande premium</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{metrics.flaggedItems}</p>
          <p className="text-xs text-[var(--muted)]">Flaggat innehåll</p>
        </div>
      </section>

      <section className="mt-6">
        <div className="card">
          <h2 className="text-2xl">Verifieringskö</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Godkänn eller neka mäklare efter manuell FMI-kontroll.</p>
          <div className="mt-4 space-y-3">
            {pendingAgents.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga väntande verifieringar just nu.</p> : null}
            {pendingAgents.map((agent) => (
              <div key={agent.id} className="rounded-xl border border-[var(--line)] bg-white p-3 text-sm">
                <p className="font-semibold">{agent.full_name}</p>
                <p className="text-[var(--muted)]">{agent.firm}</p>
                <p className="text-[var(--muted)]">{agent.fmi_number} | {agent.email}</p>
                <div className="mt-2 flex gap-2">
                  <form action={approveAgentAction}>
                    <input type="hidden" name="agent_id" value={agent.id} />
                    <button className="pill pill-dark">Godkänn</button>
                  </form>
                  <form action={rejectAgentAction}>
                    <input type="hidden" name="agent_id" value={agent.id} />
                    <button className="pill pill-light">Neka</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="card">
          <h2 className="text-2xl">Gruppgodkännanden</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Nya mäklargrupper måste godkännas innan de blir synliga för andra.</p>
          <div className="mt-4 space-y-3">
            {pendingGroups.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga väntande gruppförslag.</p> : null}
            {pendingGroups.map((group) => (
              <div key={group.id} className="rounded-xl border border-[var(--line)] bg-white p-3 text-sm">
                <p className="font-semibold">{group.name}</p>
                <p className="text-[var(--muted)]">{group.municipality} | {group.region}</p>
                <p className="text-[var(--muted)]">
                  Skapad av {group.createdBy} • {formatDate(group.createdAt)}
                </p>
                <div className="mt-2 flex gap-2">
                  <form action={approveGroupAction}>
                    <input type="hidden" name="group_id" value={group.id} />
                    <button className="pill pill-dark">Godkänn</button>
                  </form>
                  <form action={rejectGroupAction}>
                    <input type="hidden" name="group_id" value={group.id} />
                    <button className="pill pill-light">Neka</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <h2 className="text-2xl">Publiceringskö</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Blockerade svar som väntar på adminbeslut innan publicering.</p>
          <div className="mt-4 space-y-3">
            {pendingModeration.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga väntande publiceringar.</p> : null}
            {pendingModeration.map((item) => (
              <div key={item.id} className="rounded-xl border border-[var(--line)] bg-white p-3 text-sm">
                <p className="font-semibold">{item.questionTitle}</p>
                <p className="text-[var(--muted)]">Föreslaget av: {item.proposedByName}</p>
                <p className="text-[var(--muted)]">Blockerade ord: {item.blockedTerms.join(", ")}</p>
                <p className="mt-2 rounded-lg border border-[var(--line)] bg-[var(--paper)] p-2">{item.body}</p>
                <div className="mt-2 flex gap-2">
                  <form action={approveModerationItemAction}>
                    <input type="hidden" name="queue_id" value={item.id} />
                    <button className="pill pill-dark">Godkänn & publicera</button>
                  </form>
                  <form action={rejectModerationItemAction}>
                    <input type="hidden" name="queue_id" value={item.id} />
                    <button className="pill pill-light">Neka</button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-6 card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">Inbjudningar</h2>
          <span className="text-sm text-[var(--muted)]">
            {invitedRegistered} av {invitedTotal} registrerade
          </span>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">Alla inbjudningar som skickats, och deras status.</p>
        <div className="mt-4 space-y-2">
          {invitations.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Inga inbjudningar skickade ännu.</p>
          ) : null}
          {invitations.map((inv) => {
            const inviter = Array.isArray(inv.inviter) ? inv.inviter[0] : inv.inviter;
            return (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-white p-3 text-sm">
                <div>
                  <p className="font-medium">{inv.email}</p>
                  <p className="text-xs text-[var(--muted)]">
                    Inbjuden av {inviter?.full_name ?? "Okänd"} &bull; {formatDate(inv.created_at)}
                    {inv.reminded_at ? " • påmind" : ""}
                  </p>
                </div>
                <span className={`shrink-0 text-xs ${
                  inv.status === "registered" ? "text-emerald-600" :
                  inv.status === "clicked" ? "text-blue-600" :
                  "text-[var(--muted)]"
                }`}>
                  {inv.status === "registered" ? "Registrerad" : inv.status === "clicked" ? "Klickad" : "Väntande"}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="mt-6 card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl">Användare</h2>
          <form method="GET" className="flex gap-2">
            <input
              type="search"
              name="q"
              defaultValue={query}
              placeholder="Sök namn, mail, firma, stad..."
              className="w-64 rounded-xl border border-[var(--line)] bg-white p-2 text-sm"
            />
            <button className="pill pill-light text-sm">Sök</button>
          </form>
        </div>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Blockera (pausar all tillgång direkt), byt e-post vid firmabyte, eller radera konto helt (GDPR).
        </p>
        <div className="mt-4 space-y-3">
          {users.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              {query ? `Inga användare matchar "${query}".` : "Inga användare ännu."}
            </p>
          ) : null}
          {users.map((user) => {
            const suspended = user.verification_status === "suspended";
            return (
              <div key={user.id} className="rounded-xl border border-[var(--line)] bg-white p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold">
                      {user.full_name}
                      <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                        {user.role === "admin"
                          ? "Admin"
                          : memberTypeLabel[user.member_type ?? "agent"] ?? "Mäklare"}
                      </span>
                      {suspended ? (
                        <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Blockerad
                        </span>
                      ) : user.verification_status === "pending" ? (
                        <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                          Väntar på godkännande
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[var(--muted)]">
                      {user.email} • {user.firm || "-"} • {user.city || "-"}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      Registrerad {formatDate(user.created_at)}
                      {user.last_seen_at ? ` • Senast aktiv ${formatDate(user.last_seen_at)}` : ""}
                    </p>
                  </div>
                  {user.role !== "admin" ? (
                    <div className="flex shrink-0 gap-2">
                      {suspended ? (
                        <form action={reactivateAgentAction}>
                          <input type="hidden" name="agent_id" value={user.id} />
                          <button className="pill pill-dark text-xs">Återaktivera</button>
                        </form>
                      ) : (
                        <form action={suspendAgentAction}>
                          <input type="hidden" name="agent_id" value={user.id} />
                          <button className="pill pill-light text-xs text-red-700">Blockera</button>
                        </form>
                      )}
                    </div>
                  ) : null}
                </div>

                {user.role !== "admin" ? (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-[var(--accent)]">
                      Fler åtgärder (byt e-post, radera konto)
                    </summary>
                    <div className="mt-3 grid gap-4 border-t border-[var(--line)] pt-3 sm:grid-cols-2">
                      <form action={updateAgentEmailAction} className="space-y-2">
                        <p className="text-xs font-medium">Byt e-post (t.ex. vid firmabyte)</p>
                        <input type="hidden" name="agent_id" value={user.id} />
                        <input
                          name="new_email"
                          type="email"
                          required
                          placeholder="ny@maklarfirma.se"
                          className="w-full rounded-xl border border-[var(--line)] p-2 text-sm"
                        />
                        <button className="pill pill-light text-xs">Uppdatera e-post</button>
                        <p className="text-xs text-[var(--muted)]">
                          Profilen och all historik behålls — bara inloggningsmailen byts.
                        </p>
                      </form>
                      <form action={deleteUserAction} className="space-y-2">
                        <p className="text-xs font-medium text-red-700">Radera konto permanent (GDPR)</p>
                        <input type="hidden" name="user_id" value={user.id} />
                        <input
                          name="confirm_delete"
                          required
                          placeholder='Skriv "RADERA" för att bekräfta'
                          className="w-full rounded-xl border border-red-200 p-2 text-sm"
                        />
                        <button className="pill pill-light text-xs text-red-700">Radera kontot</button>
                        <p className="text-xs text-[var(--muted)]">
                          Tar bort profil, inlägg och inloggning permanent. Kan inte ångras.
                        </p>
                      </form>
                    </div>
                  </details>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
