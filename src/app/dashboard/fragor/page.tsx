import Link from "next/link";
import { requireVerifiedAgent } from "@/lib/auth";
import { AgentTipForm } from "@/components/agent-tip-form";
import { TipVoteControls } from "@/components/tip-vote-controls";
import { getAgentDashboardQuestionFeed, getAgentTips, getAgentTipsByAuthor } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default async function AgentQuestionsPage() {
  const user = await requireVerifiedAgent("/dashboard/fragor");
  const [questions, myTips, allTips] = await Promise.all([
    getAgentDashboardQuestionFeed(user.id),
    getAgentTipsByAuthor(user.id, user.id),
    getAgentTips(user.id),
  ]);

  const unansweredFirst = [...questions].sort((a, b) => Number(a.answeredByMe) - Number(b.answeredByMe));

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-4xl">Frågor & diskussioner</h1>
          <p className="mt-2 text-[var(--muted)]">Frågor från andra mäklare i dina områden och i hela Sverige.</p>
        </div>
        <Link href="/dashboard/fragor/ny" className="pill pill-dark">
          Ställ en fråga
        </Link>
      </div>

      <section className="mt-6 card space-y-3">
        <h2 className="text-xl">Aktuella frågor</h2>
        {unansweredFirst.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Inga frågor ännu. Ställ den första!</p>
        ) : null}
        {unansweredFirst.map((question) => (
          <Link
            key={question.id}
            href={`/dashboard/fragor/${question.slug}`}
            className="block rounded-xl border border-[var(--line)] bg-white p-3"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-medium">{question.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {question.category} • {question.geoScope}
                  {question.municipality ? ` • ${question.municipality}` : ""}
                  {question.region ? `, ${question.region}` : ""}
                </p>
              </div>
              <div className="text-right text-xs text-[var(--muted)]">
                <p>{formatDate(question.createdAt)}</p>
                <p>{question.answeredByMe ? "Du har svarat" : "Inget svar från dig än"}</p>
              </div>
            </div>
          </Link>
        ))}
      </section>

      <section className="mt-6 card">
        <h2 className="text-xl">Tips & trix</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Dela korta tips till andra mäklare. Andra verifierade mäklare röstar — bästa tips lyfts.
        </p>
        <div className="mt-4">
          <AgentTipForm />
        </div>
      </section>

      <section className="mt-6 card">
        <h2 className="text-xl">Senaste tips</h2>
        <div className="mt-4 space-y-3">
          {allTips.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga tips publicerade ännu.</p> : null}
          {allTips.map((tip) => (
            <article key={tip.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{tip.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {tip.authorName} • {tip.geoScope}
                    {tip.municipality ? ` • ${tip.municipality}` : ""}
                    {tip.region ? `, ${tip.region}` : ""} • {formatDate(tip.createdAt)}
                  </p>
                </div>
                <span className="pill pill-light">Score: {tip.score}</span>
              </div>
              <p className="mt-2 text-sm">{tip.body}</p>
              <TipVoteControls tipId={tip.id} myVote={tip.myVote} upVotes={tip.upVotes} downVotes={tip.downVotes} />
            </article>
          ))}
        </div>
      </section>

      {myTips.length > 0 ? (
        <section className="mt-6 card">
          <h2 className="text-xl">Mina tips</h2>
          <div className="mt-4 space-y-3">
            {myTips.map((tip) => (
              <article key={tip.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
                <p className="font-medium">{tip.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  Score: {tip.score} • Upp: {tip.upVotes} • Ner: {tip.downVotes}
                </p>
                <p className="mt-2 text-sm">{tip.body}</p>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
