import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAgentBySlug, getAnswersByAgent, getAgentTipsByAuthor } from "@/lib/data";

export default async function MemberProfilePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const me = await requireRole("agent", `/dashboard/medlemmar/${slug}`);
  const agent = await getAgentBySlug(slug);

  if (!agent) {
    notFound();
  }

  const [agentAnswers, agentTips] = await Promise.all([
    getAnswersByAgent(agent.id),
    getAgentTipsByAuthor(agent.id, me.id),
  ]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
      <div className="lg:col-span-2">
        <Link href="/dashboard/medlemmar" className="text-sm text-[var(--accent)] hover:underline">← Alla mäklare</Link>
      </div>
      <section className="card">
        <span className="pill pill-light">Verifierad mäklare</span>
        <h1 className="mt-3 text-3xl">{agent.fullName}</h1>
        <p className="text-sm text-[var(--muted)]">
          {agent.title || "Mäklare"} | {agent.firm || "-"}
        </p>
        <p className="mt-4 text-[var(--muted)]">{agent.bio || "Ingen bio ifylld."}</p>
        <div className="mt-5 text-sm text-[var(--muted)]">
          <p>Stad: {agent.city}</p>
        </div>
        {agent.id !== me.id ? (
          <div className="mt-5">
            <Link href={`/dashboard/messages/${agent.id}`} className="pill pill-dark">
              Skicka meddelande
            </Link>
          </div>
        ) : null}
      </section>

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
