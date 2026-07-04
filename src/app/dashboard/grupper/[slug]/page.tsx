import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAgent } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { UserAvatar } from "@/components/user-avatar";
import { joinAgentGroupAction, leaveAgentGroupAction, approveJoinRequestAction, rejectJoinRequestAction, removeGroupMemberAction } from "@/app/dashboard/actions";
import { formatDate } from "@/lib/format";
import GroupInviteForm from "@/components/group-invite-form";
import PollCreateForm from "@/components/poll-create-form";
import PollCard from "@/components/poll-card";

export default async function GroupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireAgent(`/dashboard/grupper/${slug}`);

  if (!hasSupabaseEnv()) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: group } = await supabase
    .from("agent_groups")
    .select("id, name, slug, description, municipality, region, status, is_private, is_default, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!group) {
    notFound();
  }

  const [{ data: membership }, { data: members }, { data: questions }, { data: polls }] = await Promise.all([
    supabase
      .from("agent_group_members")
      .select("role")
      .eq("group_id", group.id)
      .eq("agent_id", user.id)
      .maybeSingle(),
    supabase
      .from("agent_group_members")
      .select("agent_id, role, profiles:agent_id(id, full_name, profile_slug, firm, city, avatar_url)")
      .eq("group_id", group.id)
      .limit(50),
    supabase
      .from("questions")
      .select("id, title, question_slug, body, created_at")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("group_polls")
      .select("id, title, description, options, created_by, created_at, profiles:created_by(full_name)")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const isAdmin = user.role === "admin";
  const isMember = Boolean(membership);
  const isDefault = group.is_default === true;
  const isVerified = user.verificationStatus === "verified";

  // Group content is only visible to admins (background access) and to verified
  // members. Pending members or non-members see a locked view.
  const canViewContent = isAdmin || (isMember && isVerified);

  // Has this user already applied (pending) to a private group?
  const { data: myRequest } = await supabase
    .from("group_join_requests")
    .select("status")
    .eq("group_id", group.id)
    .eq("agent_id", user.id)
    .eq("status", "pending")
    .maybeSingle();
  const hasPendingRequest = Boolean(myRequest);

  // Group owners and admins can review pending applications.
  const isOwner = (membership as { role?: string } | null)?.role === "owner";
  const canModerate = isAdmin || isOwner;
  let pendingRequests: {
    id: string;
    agent_id: string;
    created_at: string;
    profiles: { full_name: string; firm: string | null; city: string | null; avatar_url: string | null; profile_slug: string | null } | { full_name: string; firm: string | null; city: string | null; avatar_url: string | null; profile_slug: string | null }[] | null;
  }[] = [];
  if (canModerate) {
    const { data } = await supabase
      .from("group_join_requests")
      .select("id, agent_id, created_at, profiles:agent_id(full_name, firm, city, avatar_url, profile_slug)")
      .eq("group_id", group.id)
      .eq("status", "pending")
      .order("created_at");
    pendingRequests = data ?? [];
  }

  // Admins read every group in the background without being members; never list
  // the admin's own row as a participant.
  const visibleMembers = (members ?? []).filter((m) => !isAdmin || m.agent_id !== user.id);

  const pollIds = (polls ?? []).map((p) => p.id);
  let allVotes: { poll_id: string; option_index: number; voter_id: string }[] = [];
  if (pollIds.length > 0) {
    const { data } = await supabase
      .from("group_poll_votes")
      .select("poll_id, option_index, voter_id")
      .in("poll_id", pollIds);
    allVotes = data ?? [];
  }

  const pollsWithVotes = (polls ?? []).map((p) => {
    const options: string[] = typeof p.options === "string" ? JSON.parse(p.options) : (p.options as string[]);
    const votes = allVotes.filter((v) => v.poll_id === p.id);
    const voteCounts = options.map((_, i) => votes.filter((v) => v.option_index === i).length);
    const myVoteRecord = votes.find((v) => v.voter_id === user.id);
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return {
      id: p.id,
      title: p.title,
      description: p.description,
      options,
      voteCounts,
      totalVotes: votes.length,
      myVote: myVoteRecord ? myVoteRecord.option_index : null,
      createdAt: p.created_at,
      creatorName: (profile as { full_name: string } | null)?.full_name ?? "Okänd",
    };
  });

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard/grupper" className="text-sm text-[var(--accent)] hover:underline">← Alla grupper</Link>
      </div>

      {isAdmin && (
        <p className="mb-4 rounded-xl border border-[var(--line)] bg-white/60 px-4 py-2 text-xs text-[var(--muted)]">
          Du ser den här gruppen som admin. Du står inte med som medlem och syns inte för andra.
        </p>
      )}

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              <span className="pill pill-light">{group.municipality || "-"} &bull; {group.region || "-"}</span>
              {isDefault && <span className="pill pill-light">Alla mäklare</span>}
            </div>
            <h1 className="mt-3 text-3xl">{group.name}</h1>
            {group.description ? <p className="mt-2 text-[var(--muted)]">{group.description}</p> : null}
          </div>
          <div>
            {isAdmin ? (
              <span className="pill pill-light opacity-60">Admin-vy</span>
            ) : isMember ? (
              isDefault ? (
                <span className="pill pill-light opacity-60">Standardgrupp</span>
              ) : (
                <form action={leaveAgentGroupAction.bind(null, group.id)}>
                  <button className="pill pill-light">Lämna grupp</button>
                </form>
              )
            ) : hasPendingRequest ? (
              <span className="pill pill-light opacity-60">Ansökan inskickad</span>
            ) : (
              <form action={joinAgentGroupAction.bind(null, group.id)}>
                <button className="pill pill-dark">Ansök om medlemskap</button>
              </form>
            )}
          </div>
        </div>
      </section>

      {canModerate && pendingRequests.length > 0 && (
        <section className="mt-6 card border-[var(--accent)]">
          <h2 className="text-xl">Ansökningar att granska ({pendingRequests.length})</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Mäklare som vill gå med i gruppen. Godkänn för att ge tillgång.</p>
          <div className="mt-4 space-y-3">
            {pendingRequests.map((req) => {
              const p = Array.isArray(req.profiles) ? req.profiles[0] : req.profiles;
              if (!p) return null;
              return (
                <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white p-3">
                  <div className="flex items-center gap-3">
                    <UserAvatar url={p.avatar_url} name={p.full_name} size="sm" />
                    <div>
                      <p className="text-sm font-medium">{p.full_name}</p>
                      <p className="text-xs text-[var(--muted)]">{p.firm || "-"} &bull; {p.city || "-"}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <form action={approveJoinRequestAction.bind(null, req.id)}>
                      <button className="pill pill-dark text-xs">Godkänn</button>
                    </form>
                    <form action={rejectJoinRequestAction.bind(null, req.id)}>
                      <button className="pill pill-light text-xs">Avböj</button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!canViewContent ? (
        <section className="mt-6 card text-center">
          <div className="mx-auto max-w-md py-6">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--line)]">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <h2 className="text-xl">Innehållet är låst</h2>
            {!isVerified ? (
              <p className="mt-2 text-sm text-[var(--muted)]">
                Diskussioner och omröstningar visas när din profil har godkänts av admin. Vanligtvis inom 24 timmar.
              </p>
            ) : hasPendingRequest ? (
              <p className="mt-2 text-sm text-[var(--muted)]">
                Din ansökan väntar på gruppadmins godkännande. Du ser innehållet så snart du blivit medlem.
              </p>
            ) : (
              <p className="mt-2 text-sm text-[var(--muted)]">
                Den här gruppen är privat. Ansök om medlemskap för att se diskussioner och omröstningar — gruppadmin godkänner nya medlemmar.
              </p>
            )}
            {isVerified && !isMember && !hasPendingRequest && (
              <form action={joinAgentGroupAction.bind(null, group.id)} className="mt-4">
                <button className="pill pill-dark">Ansök om medlemskap</button>
              </form>
            )}
          </div>
        </section>
      ) : (
      <>
      <section className="mt-6 card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl">Diskussioner i gruppen</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">Frågor och diskussioner kopplade till gruppen.</p>
          </div>
          {isMember && (
            <Link
              href={`/dashboard/fragor/ny?group_id=${group.id}`}
              className="pill pill-dark"
            >
              Starta ny diskussion
            </Link>
          )}
        </div>
        <div className="mt-4 space-y-3">
          {(!questions || questions.length === 0) ? (
            <p className="text-sm text-[var(--muted)]">Inga diskussioner ännu. {isMember && "Bli den första att starta en!"}</p>
          ) : null}
          {(questions ?? []).map((q) => (
            <Link key={q.id} href={`/dashboard/fragor/${q.question_slug}`} className="block rounded-xl border border-[var(--line)] bg-white p-3">
              <p className="font-medium">{q.title}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(q.created_at)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl">Omröstningar</h2>
          {isMember && <PollCreateForm groupId={group.id} groupSlug={group.slug} />}
        </div>
        <div className="mt-4 space-y-3">
          {pollsWithVotes.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">Inga omröstningar ännu. {isMember && "Skapa den första!"}</p>
          ) : null}
          {pollsWithVotes.map((poll) => (
            <PollCard key={poll.id} poll={poll} groupSlug={group.slug} isMember={isMember} />
          ))}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="card">
          <h2 className="text-xl">Medlemmar ({visibleMembers.length})</h2>
          <div className="mt-4 grid gap-3">
            {visibleMembers.map((m) => {
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              if (!profile) return null;
              const canRemove =
                canModerate &&
                m.agent_id !== user.id &&
                (m.role !== "owner" || isAdmin);
              return (
                <div
                  key={m.agent_id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-white p-3 text-sm"
                >
                  <Link
                    href={`/dashboard/medlemmar/${profile.profile_slug}`}
                    className="flex items-center gap-3 hover:opacity-80"
                  >
                    <UserAvatar url={(profile as { avatar_url?: string }).avatar_url} name={profile.full_name} size="sm" />
                    <div>
                      <p className="font-medium">{profile.full_name}</p>
                      <p className="text-xs text-[var(--muted)]">{profile.firm || "-"} &bull; {profile.city || "-"}</p>
                      {m.role === "owner" ? <p className="text-xs text-[var(--accent)]">Ägare</p> : null}
                    </div>
                  </Link>
                  {canRemove ? (
                    <form action={removeGroupMemberAction.bind(null, group.id, m.agent_id)}>
                      <button
                        className="pill pill-light px-2 py-0.5 text-xs text-red-700 hover:border-red-300"
                        title={`Ta bort ${profile.full_name} ur gruppen`}
                      >
                        Ta bort
                      </button>
                    </form>
                  ) : null}
                </div>
              );
            })}
          </div>
        </article>

        {isMember && (
          <article className="card">
            <h2 className="text-xl">Bjud in till gruppen</h2>
            <p className="mt-2 text-sm text-[var(--muted)]">
              Bjud in mäklarkollegor att gå med i {group.name}. Max 3 inbjudningar per dag.
            </p>
            <div className="mt-4">
              <GroupInviteForm
                groupName={group.name}
                groupId={group.id}
              />
            </div>
          </article>
        )}
      </section>
      </>
      )}
    </div>
  );
}
