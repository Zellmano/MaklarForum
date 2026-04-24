import type { Metadata } from "next";
import { QuestionCard } from "@/components/question-card";
import { TipVoteControls } from "@/components/tip-vote-controls";
import { getCurrentUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getAgentTips, getQuestions } from "@/lib/data";

export const metadata: Metadata = {
  title: "Frågor & svar om bostadsköp och försäljning",
  description: "Ställ frågor om bostadsköp, försäljning, juridik och värdering. Få svar från verifierade fastighetsmäklare.",
};

export default async function QuestionsPage() {
  const user = await getCurrentUser();
  const [questions, tips] = await Promise.all([getQuestions(), getAgentTips(user?.id)]);

  return (
    <div>
      <h1 className="text-4xl">Frågor & svar</h1>
      <p className="mt-2 max-w-3xl text-[var(--muted)]">
        Alla frågor är SEO-indexerade och kan besvaras av verifierade mäklare. Konsumenter kan jämföra svar sida vid sida.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {questions.length === 0 && (
          <p className="col-span-2 text-sm text-[var(--muted)]">Inga frågor publicerade ännu. Bli den första att ställa en fråga!</p>
        )}
        {questions.map((question) => (
          <QuestionCard key={question.id} question={question} />
        ))}
      </div>

      <section className="mt-8 card">
        <h2 className="text-2xl">Tips & trix från mäklare</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Konsumenter kan rösta upp eller ner för att lyfta de mest hjälpsamma tipsen.
        </p>
        <div className="mt-4 space-y-3">
          {tips.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga tips publicerade ännu.</p> : null}
          {tips.map((tip) => (
            <article key={tip.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{tip.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    {tip.authorName} • {tip.audience} • {tip.geoScope}
                    {tip.municipality ? ` • ${tip.municipality}` : ""}
                    {tip.region ? `, ${tip.region}` : ""} • {formatDate(tip.createdAt)}
                  </p>
                </div>
                <span className="pill pill-light">Score: {tip.score}</span>
              </div>
              <p className="mt-2 text-sm">{tip.body}</p>
              {user?.role === "consumer" ? (
                <TipVoteControls tipId={tip.id} myVote={tip.myVote} upVotes={tip.upVotes} downVotes={tip.downVotes} />
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
