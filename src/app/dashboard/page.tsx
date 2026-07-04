import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { formatDate } from "@/lib/format";
import { getAgentGroupsForUser, getAgents, getMessageThreads, getWatchedThreads } from "@/lib/data";
import Link from "next/link";
import InviteColleagueForm from "@/components/invite-colleague-form";
import { sendInvitationReminderAction } from "@/app/dashboard/invite-actions";
import { UserAvatar } from "@/components/user-avatar";
import { memberTypeLabels } from "@/lib/types";

const verificationLabels: Record<string, string> = {
  pending: "Väntar på godkännande",
  verified: "Verifierad",
  suspended: "Avstängd",
};

export default async function AgentDashboardPage() {
  const user = await requireUser("/dashboard");

  let answerCount = 0;
  let questionCount = 0;
  let verification = "pending";

  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const [{ count: ac }, { count: qc }, { data: profile }] = await Promise.all([
      supabase.from("answers").select("id", { count: "exact", head: true }).eq("answered_by", user.id),
      supabase.from("questions").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("verification_status").eq("id", user.id).single(),
    ]);
    answerCount = ac ?? 0;
    questionCount = qc ?? 0;
    verification = profile?.verification_status ?? "pending";
  }

  let invitations: { id: string; email: string; status: string; created_at: string; reminded_at: string | null }[] = [];
  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("invitations")
      .select("id, email, status, created_at, reminded_at")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    invitations = data ?? [];
  }

  const [watchedThreads, messageThreads, groups, agents] = await Promise.all([
    getWatchedThreads(user.id),
    getMessageThreads(user.id),
    getAgentGroupsForUser(user.id),
    getAgents(),
  ]);

  const myGroups = groups.filter((g) => g.isMember);
  const discoverGroups = groups
    .filter((g) => g.status === "approved" && !g.isMember)
    .sort((a, b) => b.memberCount - a.memberCount)
    .slice(0, 5);
  const newMembers = agents.filter((a) => a.id !== user.id).slice(0, 5);

  return (
    <div>
      <h1 className="text-4xl">Välkommen, {user.fullName.split(" ")[0]}!</h1>
      <p className="mt-2 text-[var(--muted)]">Översikt över din aktivitet på MäklarForum.</p>

      {verification !== "verified" ? (
        <div className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm">
          <strong>Din profil väntar på godkännande.</strong> Du kan utforska plattformen men kan inte ställa frågor, svara eller publicera tips förrän admin har godkänt din profil (vanligtvis inom 24 timmar).
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/dashboard/grupper" className="pill pill-dark">Grupper</Link>
        <Link href="/dashboard/fragor" className="pill pill-light">Frågor & diskussioner</Link>
        <Link href="/dashboard/medlemmar" className="pill pill-light">Mäklare</Link>
        <Link href="/dashboard/messages" className="pill pill-light">Meddelanden</Link>
        <Link href="/dashboard/profil" className="pill pill-light">Min profil</Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="metric">
          <p className="text-2xl font-semibold">{myGroups.length}</p>
          <p className="text-xs text-[var(--muted)]">Mina grupper</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{answerCount}</p>
          <p className="text-xs text-[var(--muted)]">Mina svar</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{questionCount}</p>
          <p className="text-xs text-[var(--muted)]">Frågor i communityt</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{verificationLabels[verification] ?? "Väntar"}</p>
          <p className="text-xs text-[var(--muted)]">Verifieringsstatus</p>
        </div>
      </div>

      <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <article className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Mina grupper</h2>
            <Link href="/dashboard/grupper" className="text-sm text-[var(--accent)]">Visa alla</Link>
          </div>
          <div className="mt-4 space-y-2">
            {myGroups.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Du är inte med i någon grupp ännu. <Link href="/dashboard/grupper" className="text-[var(--accent)]">Gå med eller skapa en</Link>.
              </p>
            ) : null}
            {myGroups.slice(0, 5).map((group) => (
              <Link
                key={group.id}
                href={`/dashboard/grupper/${group.slug}`}
                className="block rounded-xl border border-[var(--line)] bg-white p-2.5 hover:border-[var(--accent)]"
              >
                <p className="text-sm font-medium">{group.name}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {group.municipality || group.region || "Sverige"} • {group.memberCount} medlemmar
                </p>
              </Link>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Upptäck grupper</h2>
            <Link href="/dashboard/grupper" className="text-sm text-[var(--accent)]">Alla grupper</Link>
          </div>
          <div className="mt-4 space-y-2">
            {discoverGroups.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Du är med i alla tillgängliga grupper.</p>
            ) : null}
            {discoverGroups.map((group) => (
              <Link
                key={group.id}
                href={`/dashboard/grupper/${group.slug}`}
                className="block rounded-xl border border-[var(--line)] bg-white p-2.5 hover:border-[var(--accent)]"
              >
                <p className="text-sm font-medium">{group.name}</p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {group.municipality || group.region || "Sverige"} • {group.memberCount} medlemmar
                </p>
              </Link>
            ))}
          </div>
        </article>

        <article className="card md:col-span-2 xl:col-span-1">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Nya medlemmar</h2>
            <Link href="/dashboard/medlemmar" className="text-sm text-[var(--accent)]">Visa alla</Link>
          </div>
          <div className="mt-4 space-y-2">
            {newMembers.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">Inga andra medlemmar ännu — bjud in en kollega!</p>
            ) : null}
            {newMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between gap-2 rounded-xl border border-[var(--line)] bg-white p-2.5"
              >
                <Link
                  href={`/dashboard/medlemmar/${member.slug}`}
                  className="flex min-w-0 items-center gap-2 hover:opacity-80"
                >
                  <UserAvatar url={member.avatarUrl} name={member.fullName} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{member.fullName}</p>
                    <p className="truncate text-xs text-[var(--muted)]">
                      {(member.memberType && memberTypeLabels[member.memberType]) || "Mäklare"} • {member.firm || member.city || "-"}
                    </p>
                  </div>
                </Link>
                <Link
                  href={`/dashboard/messages/${member.id}`}
                  className="shrink-0 rounded-full border border-[var(--line)] px-2.5 py-1 text-xs hover:border-[var(--accent)]"
                >
                  Säg hej
                </Link>
              </div>
            ))}
          </div>
        </article>

      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="card">
          <h2 className="text-xl">Bevakade trådar</h2>
          <div className="mt-4 space-y-3">
            {watchedThreads.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga bevakade trådar.</p> : null}
            {watchedThreads.slice(0, 5).map((thread) => (
              <Link
                key={thread.questionId}
                href={`/dashboard/fragor/${thread.questionSlug}`}
                className="block rounded-xl border border-[var(--line)] bg-white p-3"
              >
                <p className="font-medium">{thread.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{thread.answerCount} svar • {formatDate(thread.createdAt)}</p>
              </Link>
            ))}
          </div>
        </article>

        <article className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Senaste meddelanden</h2>
            <Link href="/dashboard/messages" className="text-sm text-[var(--accent)]">Öppna inkorg</Link>
          </div>
          <div className="mt-4 space-y-3">
            {messageThreads.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga meddelanden ännu.</p> : null}
            {messageThreads.slice(0, 5).map((thread) => (
              <Link
                key={thread.otherUserId}
                href={`/dashboard/messages/${thread.otherUserId}`}
                className="block rounded-xl border border-[var(--line)] bg-white p-3"
              >
                <p className="font-medium">{thread.otherUserName}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{thread.lastMessage}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatDate(thread.lastMessageAt)} • Olästa: {thread.unreadCount}
                </p>
              </Link>
            ))}
          </div>
        </article>

        <article className="card lg:col-span-2">
          <h2 className="text-xl">Bjud in kollega</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Hjälp communityt växa — bjud in mäklarkollegor du vill ha med på MäklarForum. Max 3 per dag.
          </p>
          <div className="mt-4">
            <InviteColleagueForm />
          </div>
          {invitations.length > 0 && (
            <div className="mt-4 border-t border-[var(--line)] pt-4">
              <h3 className="text-sm font-medium">Dina inbjudningar</h3>
              <div className="mt-2 space-y-2">
                {invitations.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--line)] bg-white p-2 text-sm">
                    <span className="truncate">{inv.email}</span>
                    <div className="flex shrink-0 items-center gap-2">
                      <span className={`text-xs ${
                        inv.status === "registered" ? "text-emerald-600" :
                        inv.status === "clicked" ? "text-blue-600" :
                        "text-[var(--muted)]"
                      }`}>
                        {inv.status === "registered" ? "Registrerad!" :
                         inv.status === "clicked" ? "Klickad" :
                         "Väntande"}
                      </span>
                      {inv.status !== "registered" && (
                        inv.reminded_at ? (
                          <span className="text-xs text-[var(--muted)]">Påminnelse skickad</span>
                        ) : (
                          <form action={sendInvitationReminderAction.bind(null, inv.id)}>
                            <button className="pill pill-light px-2 py-0.5 text-xs">Påminn</button>
                          </form>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </article>
      </section>
    </div>
  );
}
