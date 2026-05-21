import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getAdminMetrics, getPendingAgentVerifications, getPendingGroupApprovals, getPendingModerationItems } from "@/lib/data";
import {
  approveAgentAction,
  approveGroupAction,
  approveModerationItemAction,
  deleteUserAction,
  rejectAgentAction,
  rejectGroupAction,
  rejectModerationItemAction,
  updateAgentEmailAction,
} from "@/app/admin/actions";
import { formatDate } from "@/lib/format";

export default async function AdminPage() {
  await requireRole("admin", "/admin");

  let metrics = { totalUsers: 0, verifiedAgents: 0, payingAgents: 0, flaggedItems: 0 };
  let pendingAgents: Awaited<ReturnType<typeof getPendingAgentVerifications>> = [];
  let pendingGroups: Awaited<ReturnType<typeof getPendingGroupApprovals>> = [];
  let pendingModeration: Awaited<ReturnType<typeof getPendingModerationItems>> = [];
  let users: Array<{ id: string; full_name: string; email: string; role: string; verification_status: string; subscription_status: string }> = [];

  try {
    [metrics, pendingAgents, pendingGroups, pendingModeration] = await Promise.all([
      getAdminMetrics(),
      getPendingAgentVerifications(),
      getPendingGroupApprovals(),
      getPendingModerationItems(),
    ]);
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, verification_status, subscription_status")
      .order("created_at", { ascending: false })
      .limit(20);
    users = data ?? [];
  } catch (err) {
    console.error("Admin data fetch error:", err);
  }

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

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
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

        <div className="card">
          <h2 className="text-2xl">Byt mäklarens e-post</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Behåller samma profil-id så att alla historiska svar följer mäklaren vid firmabyte.
          </p>
          <form action={updateAgentEmailAction} className="mt-4 grid gap-3 text-sm">
            <label>
              Mäklar-ID
              <input name="agent_id" required className="mt-1 w-full rounded-xl border border-[var(--line)] p-2" />
            </label>
            <label>
              Ny företagsmail
              <input name="new_email" type="email" required className="mt-1 w-full rounded-xl border border-[var(--line)] p-2" />
            </label>
            <button className="pill pill-dark w-fit">Uppdatera e-post</button>
          </form>
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
        <h2 className="text-2xl">Användare</h2>
        <div className="mt-4 space-y-3">
          {(users ?? []).map((user) => (
            <div key={user.id} className="rounded-xl border border-[var(--line)] bg-white p-3 text-sm">
              <p className="font-semibold">{user.full_name} ({user.role})</p>
              <p className="text-[var(--muted)]">
                {user.email} | {user.verification_status} | {user.subscription_status}
              </p>
              <form action={deleteUserAction} className="mt-2">
                <input type="hidden" name="user_id" value={user.id} />
                <button className="pill pill-light">Ta bort konto</button>
              </form>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
