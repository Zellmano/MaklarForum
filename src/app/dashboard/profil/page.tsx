import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AgentProfileForm } from "@/components/agent-profile-form";
import AvatarUpload from "@/components/avatar-upload";
import { UserAvatar } from "@/components/user-avatar";
import { formatDate } from "@/lib/format";
import {
  getAgentGroupsForUser,
  getAnswersByAgent,
  getMessageThreads,
} from "@/lib/data";
import { acceptConnectionAction, removeConnectionAction } from "@/app/dashboard/profile-actions";

export default async function AgentProfileDashboardPage() {
  const user = await requireRole("agent", "/dashboard/profil");
  const supabase = await createSupabaseServerClient();

  const [answers, threads, groups, areaRows, profileRow] = await Promise.all([
    getAnswersByAgent(user.id),
    getMessageThreads(user.id),
    getAgentGroupsForUser(user.id),
    supabase.from("agent_areas").select("municipality, region").eq("agent_id", user.id),
    supabase.from("profiles").select("full_name, firm, title, city, bio, avatar_url, profile_slug").eq("id", user.id).single(),
  ]);

  const profile = profileRow.data;
  const myGroups = groups.filter((group) => group.isMember);
  const suggestedGroups = groups.filter((group) => !group.isMember && group.status === "approved").slice(0, 6);

  const { data: connections } = await supabase
    .from("agent_connections")
    .select("id, requester_id, receiver_id, status, created_at, accepted_at")
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

  const friendIds = (connections ?? [])
    .filter((c) => c.status === "accepted")
    .map((c) => (c.requester_id === user.id ? c.receiver_id : c.requester_id));

  const pendingReceived = (connections ?? []).filter(
    (c) => c.status === "pending" && c.receiver_id === user.id,
  );

  let friends: { id: string; full_name: string; firm: string | null; city: string | null; avatar_url: string | null; profile_slug: string | null }[] = [];
  let pendingProfiles: typeof friends = [];

  if (friendIds.length > 0) {
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, firm, city, avatar_url, profile_slug")
      .in("id", friendIds);
    friends = data ?? [];
  }

  if (pendingReceived.length > 0) {
    const pendingIds = pendingReceived.map((c) => c.requester_id);
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, firm, city, avatar_url, profile_slug")
      .in("id", pendingIds);
    pendingProfiles = data ?? [];
  }

  return (
    <div>
      <h1 className="text-4xl">Min mäklarprofil</h1>
      <p className="mt-2 text-[var(--muted)]">
        Hantera din profil, dina kontakter och se din aktivitet.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <div className="metric">
          <p className="text-2xl font-semibold">{answers.length}</p>
          <p className="text-xs text-[var(--muted)]">Publicerade svar</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{threads.reduce((acc, thread) => acc + thread.unreadCount, 0)}</p>
          <p className="text-xs text-[var(--muted)]">Olästa meddelanden</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{friends.length}</p>
          <p className="text-xs text-[var(--muted)]">Kontakter</p>
        </div>
      </div>

      <section className="mt-6 card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl">Profilinformation</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Synlig för andra mäklare på plattformen.
            </p>
          </div>
          {profile?.profile_slug ? (
            <Link href={`/dashboard/medlemmar/${profile.profile_slug}`} className="pill pill-light">
              Visa profil
            </Link>
          ) : null}
        </div>

        <div className="mt-4">
          <AvatarUpload currentUrl={profile?.avatar_url} />
        </div>

        {profile ? (
          <div className="mt-4">
            <AgentProfileForm
              defaults={{
                fullName: profile.full_name,
                firm: profile.firm ?? "",
                title: profile.title ?? "",
                city: profile.city ?? "",
                bio: profile.bio ?? "",
              }}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">Ingen profil hittades ännu.</p>
        )}

        <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-3 text-sm text-[var(--muted)]">
          <p className="font-medium text-[var(--ink)]">Områden du verkar i</p>
          {areaRows.data && areaRows.data.length > 0 ? (
            <p className="mt-1">
              {areaRows.data.map((row) => `${row.municipality}, ${row.region}`).join(" | ")}
            </p>
          ) : (
            <p className="mt-1">Inga områden sparade ännu.</p>
          )}
        </div>
      </section>

      <section className="mt-6 card">
        <h2 className="text-xl">Mina kontakter ({friends.length})</h2>

        {pendingReceived.length > 0 && (
          <div className="mt-4">
            <h3 className="text-sm font-medium text-[var(--accent)]">Väntande förfrågningar</h3>
            <div className="mt-2 space-y-2">
              {pendingReceived.map((conn) => {
                const p = pendingProfiles.find((pr) => pr.id === conn.requester_id);
                if (!p) return null;
                return (
                  <div key={conn.id} className="flex items-center justify-between rounded-xl border border-[var(--line)] bg-white p-3">
                    <div className="flex items-center gap-3">
                      <UserAvatar url={p.avatar_url} name={p.full_name} />
                      <div>
                        <p className="text-sm font-medium">{p.full_name}</p>
                        <p className="text-xs text-[var(--muted)]">{p.firm ?? "-"} &bull; {p.city ?? "-"}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <form action={acceptConnectionAction.bind(null, conn.id)}>
                        <button className="pill pill-dark text-xs">Acceptera</button>
                      </form>
                      <form action={removeConnectionAction.bind(null, conn.id)}>
                        <button className="pill pill-light text-xs">Avböj</button>
                      </form>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {friends.length === 0 && pendingReceived.length === 0 && (
            <p className="text-sm text-[var(--muted)] md:col-span-2">
              Inga kontakter ännu. Besök en mäklares profil för att skicka en kontaktförfrågan.
            </p>
          )}
          {friends.map((f) => (
            <div
              key={f.id}
              className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white p-3"
            >
              <Link href={`/dashboard/medlemmar/${f.profile_slug}`} className="flex items-center gap-3 hover:opacity-80">
                <UserAvatar url={f.avatar_url} name={f.full_name} />
                <div>
                  <p className="text-sm font-medium">{f.full_name}</p>
                  <p className="text-xs text-[var(--muted)]">{f.firm ?? "-"} &bull; {f.city ?? "-"}</p>
                </div>
              </Link>
              <Link
                href={`/dashboard/messages/${f.id}`}
                className="shrink-0 rounded-full border border-[var(--line)] p-2 hover:border-[var(--accent)] hover:bg-blue-50"
                title="Skicka meddelande"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </Link>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Meddelanden</h2>
            <Link href="/dashboard/messages" className="text-sm text-[var(--accent)]">
              Öppna inkorg
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {threads.slice(0, 5).map((thread) => (
              <Link
                key={thread.otherUserId}
                href={`/dashboard/messages/${thread.otherUserId}`}
                className="block rounded-xl border border-[var(--line)] bg-white p-3"
              >
                <p className="font-medium">{thread.otherUserName}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{thread.lastMessage}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(thread.lastMessageAt)} &bull; Olästa: {thread.unreadCount}</p>
              </Link>
            ))}
            {threads.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga meddelanden ännu.</p> : null}
          </div>
        </article>

        <article className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Grupper</h2>
            <Link href="/dashboard/grupper" className="text-sm text-[var(--accent)]">
              Hantera grupper
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {myGroups.slice(0, 3).map((group) => (
              <Link key={group.id} href={`/dashboard/grupper/${group.slug}`} className="block rounded-xl border border-[var(--line)] bg-white p-3">
                <p className="font-medium">{group.name}</p>
                <p className="text-xs text-[var(--muted)]">Medlem &bull; {group.memberCount} medlemmar</p>
              </Link>
            ))}
            {suggestedGroups.slice(0, 3).map((group) => (
              <Link key={group.id} href={`/dashboard/grupper/${group.slug}`} className="block rounded-xl border border-[var(--line)] bg-white p-3">
                <p className="font-medium">{group.name}</p>
                <p className="text-xs text-[var(--muted)]">Förslag &bull; {group.memberCount} medlemmar</p>
              </Link>
            ))}
            {groups.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga grupper ännu.</p> : null}
          </div>
        </article>
      </section>
    </div>
  );
}
