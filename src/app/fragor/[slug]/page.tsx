import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AnswerComposer } from "@/components/answer-composer";
import { WatchThreadButton } from "@/components/watch-thread-button";
import { AnswerVoteControls } from "@/components/answer-vote-controls";
import { formatDate } from "@/lib/format";
import { getAnswersForQuestion, getQuestionBySlug } from "@/lib/data";
import { submitAnswerAction } from "@/app/fragor/actions";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const question = await getQuestionBySlug(slug);
  if (!question) return { title: "Fråga hittades inte" };
  return {
    title: question.title,
    description: question.body.slice(0, 160),
    openGraph: { title: question.title, description: question.body.slice(0, 160) },
  };
}

const geoScopeLabels: Record<string, string> = {
  local: "Lokal",
  regional: "Regional",
  open: "Öppen",
};

const audienceLabels: Record<string, string> = {
  buyer: "Köpare",
  seller: "Säljare",
  general: "Allmänt",
};

const categoryLabels: Record<string, string> = {
  kopa: "Köpa",
  salja: "Sälja",
  juridik: "Juridik",
  vardering: "Värdering",
  flytt: "Flytt",
  ovrigt: "Övrigt",
};

export default async function QuestionDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const question = await getQuestionBySlug(slug);

  if (!question) {
    notFound();
  }

  const currentUser = await getCurrentUser();
  const questionAnswers = await getAnswersForQuestion(question.id, currentUser?.id);
  const boundSubmitAction = submitAnswerAction.bind(null, question.id, slug);
  let watching = false;

  if (currentUser && hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase
      .from("question_watchers")
      .select("question_id")
      .eq("question_id", question.id)
      .eq("user_id", currentUser.id)
      .maybeSingle();
    watching = Boolean(data);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <div className="lg:col-span-2">
        <Link href="/fragor" className="text-sm text-[var(--accent)] hover:underline">← Alla frågor</Link>
      </div>
      <section className="card">
        {currentUser ? (
          <p className="mb-2 text-xs text-[var(--muted)]">
            Inloggad som: {currentUser.role === "agent" ? "Mäklare" : currentUser.role === "admin" ? "Admin" : "Konsument"}
          </p>
        ) : null}
        <div className="mb-2 text-sm text-[var(--muted)]">Publicerad {formatDate(question.createdAt)}</div>
        <h1 className="text-3xl">{question.title}</h1>
        <p className="mt-4 text-[var(--muted)]">{question.body}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="pill pill-light">Kategori: {categoryLabels[question.category] ?? question.category}</span>
          <span className="pill pill-light">Räckvidd: {geoScopeLabels[question.geoScope] ?? question.geoScope}</span>
          <span className="pill pill-light">Målgrupp: {audienceLabels[question.audience] ?? question.audience}</span>
        </div>
        {currentUser ? (
          <div className="mt-4">
            <WatchThreadButton questionId={question.id} slug={slug} watching={watching} />
          </div>
        ) : null}
      </section>

      {currentUser?.role === "agent" ? (
        <AnswerComposer action={boundSubmitAction} />
      ) : (
        <section className="card">
          <h3 className="text-lg font-semibold">Svara som mäklare</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Endast verifierade mäklare kan svara på frågor. Konsumenter kan rösta på svar med tumme upp eller ner.
          </p>
        </section>
      )}

      <section className="space-y-4 lg:col-span-2">
        <h2 className="text-2xl">Svar från mäklare</h2>
        {questionAnswers.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga svar ännu. Verifierade mäklare kan svara direkt.</p> : null}
        {questionAnswers.map((answer) => (
          <article key={answer.id} className="card">
            <div className="mb-2 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold">{answer.agent?.fullName ?? "Mäklare"}</p>
                <p className="text-[var(--muted)]">{answer.agent?.firm ?? "-"}</p>
              </div>
              <span className="pill pill-light">{answer.helpfulVotes} hjälpsamt</span>
            </div>
            <p className="text-sm leading-6">{answer.body}</p>
            {currentUser?.role === "consumer" ? (
              <AnswerVoteControls
                answerId={answer.id}
                slug={slug}
                myVote={answer.myVote ?? 0}
                upVotes={answer.upVotes ?? 0}
                downVotes={answer.downVotes ?? 0}
              />
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
}
