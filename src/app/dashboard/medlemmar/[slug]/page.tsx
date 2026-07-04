import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAgent } from "@/lib/auth";
import { getAgentBySlug, getAnswersByAgent, getAgentTipsByAuthor } from "@/lib/data";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { memberTypeLabels } from "@/lib/types";
import { formatDate } from "@/lib/format";
import { UserAvatar } from "@/components/user-avatar";
import {
  sendConnectionRequestAction,
  acceptConnectionAction,
  removeConnectionAction,
} from "@/app/dashboard/profile-actions";

interface SharedGroup {
  id: string;
  name: string;
  slug: string;
}

interface ConversationPreviewMessage {
  id: string;
  body: string;
  createdAt: string;
  fromMe: boolean;
}

export default async function MemberProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await requireAgent(`/dashboard/medlemmar/${slug}`);
  const agent = await getAgentBySlug(slug);

  if (!agent) {
    notFound();
  }

  const isSelf = agent.id === me.id;

  const [agentAnswers, agentTips] = await Promise.all([
    getAnswersByAgent(agent.id),
    getAgentTipsByAuthor(agent.id, me.id),
  ]);

  let sharedGroups: SharedGroup[] = [];
  let connection: { id: string; requester_id: string; status: string } | null = null;
  let conversation: ConversationPreviewMessage[] = [];

  if (!isSelf && hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const [{ data: memberships }, { data: conn }, { data: messages }] = await Promise.all([
      supabase
        .from("agent_group_members")
        .select("group_id, agent_id")
        .in("agent_id", [me.id, agent.id]),
      supabase
        .from("agent_connections")
        .select("id, requester_id, status")
        .or(
          `and(requester_id.eq.${me.id},receiver_id.eq.${agent.id}),and(requester_id.eq.${agent.id},receiver_id.eq.${me.id})`,
        )
        .maybeSingle(),
      supabase
        .from("messages")
        .select("id, sender_id, body, created_at")
        .or(
          `and(sender_id.eq.${me.id},receiver_id.eq.${agent.id}),and(sender_id.eq.${agent.id},receiver_id.eq.${me.id})`,
        )
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    const myGroupIds = new Set(
      (memberships ?? []).filter((m) => m.agent_id === me.id).map((m) => m.group_id),
    );
    const sharedIds = [
      ...new Set(
        (memberships ?? [])
          .filter((m) => m.agent_id === agent.id && myGroupIds.has(m.group_id))
          .map((m) => m.group_id),
      ),
    ];

    if (sharedIds.length > 0) {
      const { data: groups } = await supabase
        .from("agent_groups")
        .select("id, name, slug")
        .in("id", sharedIds)
        .order("name");
      sharedGroups = groups ?? [];
    }

    connection = conn ?? null;
    conversation = (messages ?? [])
      .map((m) => ({
        id: m.id,
        body: m.body,
        createdAt: m.created_at,
        fromMe: m.sender_id === me.id,
      }))
      .reverse();
  }

  const memberTypeLabel =
    (agent.memberType && memberTypeLabels[agent.memberType]) || "Mäklare";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="lg:col-span-2">
        <Link href="/dashboard/medlemmar" className="text-sm text-[var(--accent)] hover:underline">← Alla medlemmar</Link>
      </div>

      <div className="space-y-6">
        <section className="card">
          <div className="flex items-center gap-3">
            <UserAvatar url={agent.avatarUrl} name={agent.fullName} />
            <span className="pill pill-light">Verifierad {memberTypeLabel.toLowerCase()}</span>
          </div>
          <h1 className="mt-3 text-3xl">{agent.fullName}</h1>
          <p className="text-sm text-[var(--muted)]">
            {agent.title || memberTypeLabel} | {agent.firm || "-"}
            {agent.memberType === "student" && agent.studyYear
              ? ` | Årgång ${agent.studyYear}`
              : ""}
          </p>
          <p className="mt-4 text-[var(--muted)]">{agent.bio || "Ingen bio ifylld."}</p>
          <div className="mt-5 text-sm text-[var(--muted)]">
            <p>Stad: {agent.city}</p>
          </div>
          {!isSelf ? (
            <div className="mt-5 flex flex-wrap items-center gap-2">
              <Link href={`/dashboard/messages/${agent.id}`} className="pill pill-dark">
                Skicka meddelande
              </Link>
              {!connection ? (
                <form action={sendConnectionRequestAction.bind(null, agent.id)}>
                  <button className="pill pill-light">+ Lägg till som branschkollega</button>
                </form>
              ) : connection.status === "accepted" ? (
                <>
                  <span className="pill pill-gold">✓ Branschkollegor</span>
                  <form action={removeConnectionAction.bind(null, connection.id)}>
                    <button className="text-xs text-[var(--muted)] hover:text-red-700">Ta bort koppling</button>
                  </form>
                </>
              ) : connection.requester_id === me.id ? (
                <span className="pill pill-light opacity-60">Förfrågan skickad</span>
              ) : (
                <>
                  <form action={acceptConnectionAction.bind(null, connection.id)}>
                    <button className="pill pill-dark">Acceptera kollegaförfrågan</button>
                  </form>
                  <form action={removeConnectionAction.bind(null, connection.id)}>
                    <button className="pill pill-light">Avböj</button>
                  </form>
                </>
              )}
            </div>
          ) : null}
        </section>

        {!isSelf ? (
          <section className="card">
            <h2 className="text-xl">Gemensamma grupper ({sharedGroups.length})</h2>
            <div className="mt-3 space-y-2">
              {sharedGroups.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">
                  Ni är inte med i några gemensamma grupper ännu.
                </p>
              ) : null}
              {sharedGroups.map((group) => (
                <Link
                  key={group.id}
                  href={`/dashboard/grupper/${group.slug}`}
                  className="block rounded-xl border border-[var(--line)] bg-white p-2.5 text-sm font-medium hover:border-[var(--accent)]"
                >
                  {group.name}
                </Link>
              ))}
            </div>
          </section>
        ) : null}

        {!isSelf && conversation.length > 0 ? (
          <section className="card">
            <div className="flex items-center justify-between">
              <h2 className="text-xl">Er konversation</h2>
              <Link href={`/dashboard/messages/${agent.id}`} className="text-sm text-[var(--accent)]">
                Öppna hela
              </Link>
            </div>
            <div className="mt-3 space-y-2">
              {conversation.map((msg) => (
                <div
                  key={msg.id}
                  className={`max-w-[85%] rounded-xl border border-[var(--line)] p-2.5 text-sm ${
                    msg.fromMe ? "ml-auto bg-[#eef6f4]" : "bg-white"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.body}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {msg.fromMe ? "Du" : agent.fullName.split(" ")[0]} • {formatDate(msg.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ) : null}
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl">Senaste svar</h2>
        {agentAnswers.length === 0 && <p className="text-sm text-[var(--muted)]">Inga svar ännu.</p>}
        {agentAnswers.map((answer) => (
          <article key={answer.id} className="card">
            <p className="text-xs text-[var(--muted)]">På frågan: {answer.question?.title ?? "-"}</p>
            <p className="mt-2 text-sm">{answer.body}</p>
            <div className="mt-3 text-xs text-[var(--muted)]">{answer.helpfulVotes} röster</div>
          </article>
        ))}

        <h2 className="pt-2 text-2xl">Tips</h2>
        {agentTips.length === 0 && <p className="text-sm text-[var(--muted)]">Inga tips ännu.</p>}
        {agentTips.map((tip) => (
          <article key={tip.id} className="card">
            <p className="text-xs text-[var(--muted)]">
              {tip.geoScope}
              {tip.municipality ? ` • ${tip.municipality}` : ""}
              {tip.region ? `, ${tip.region}` : ""}
            </p>
            <p className="mt-2 text-sm font-medium">{tip.title}</p>
            <p className="mt-2 text-sm">{tip.body}</p>
            <div className="mt-3 text-xs text-[var(--muted)]">Score {tip.score} ({tip.upVotes} upp / {tip.downVotes} ner)</div>
          </article>
        ))}
      </section>
    </div>
  );
}
