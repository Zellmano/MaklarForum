import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { joinAgentGroupAction, leaveAgentGroupAction } from "@/app/dashboard/actions";
import { formatDate } from "@/lib/format";
import GroupInviteForm from "@/components/group-invite-form";
import PollCreateForm from "@/components/poll-create-form";
import PollCard from "@/components/poll-card";

export default async function GroupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireRole("agent", `/dashboard/grupper/${slug}`);

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
      .select("agent_id, role, profiles:agent_id(id, full_name, profile_slug, firm, city)")
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

  const isMember = Boolean(membership);
  const isDefault = group.is_default === true;

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
            {isMember ? (
              isDefault ? (
                <span className="pill pill-light opacity-60">Standardgrupp</span>
              ) : (
                <form action={leaveAgentGroupAction.bind(null, group.id)}>
                  <button className="pill pill-light">Lämna grupp</button>
                </form>
              )
            ) : (
              <form action={joinAgentGroupAction.bind(null, group.id)}>
                <button className="pill pill-dark">Begär medlemskap</button>
              </form>
            )}
          </div>
        </div>
      </section>

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
          <h2 className="text-xl">Medlemmar ({members?.length ?? 0})</h2>
          <div className="mt-4 grid gap-3">
            {(members ?? []).map((m) => {
              const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
              if (!profile) return null;
              return (
                <Link
                  key={m.agent_id}
                  href={`/dashboard/medlemmar/${profile.profile_slug}`}
                  className="rounded-xl border border-[var(--line)] bg-white p-3 text-sm hover:border-[var(--accent)]"
                >
                  <p className="font-medium">{profile.full_name}</p>
                  <p className="text-xs text-[var(--muted)]">{profile.firm || "-"} • {profile.city || "-"}</p>
                  {m.role === "owner" ? <p className="mt-1 text-xs text-[var(--accent)]">Ägare</p> : null}
                </Link>
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
                appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}
              />
            </div>
          </article>
        )}
      </section>
    </div>
  );
}
