import { notFound } from "next/navigation";
import Link from "next/link";
import { AnswerComposer } from "@/components/answer-composer";
import { WatchThreadButton } from "@/components/watch-thread-button";
import { AnswerVoteControls } from "@/components/answer-vote-controls";
import { formatDate } from "@/lib/format";
import { getAnswersForQuestion, getQuestionBySlug } from "@/lib/data";
import { submitAnswerAction } from "@/app/dashboard/fragor/actions";
import { requireUser } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const geoScopeLabels: Record<string, string> = {
  local: "Lokal",
  regional: "Regional",
  open: "Öppen",
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
  const currentUser = await requireUser(`/dashboard/fragor/${slug}`);
  const question = await getQuestionBySlug(slug);

  if (!question) {
    notFound();
  }

  const questionAnswers = await getAnswersForQuestion(question.id, currentUser.id);
  const boundSubmitAction = submitAnswerAction.bind(null, question.id, slug);
  let watching = false;

  if (hasSupabaseEnv()) {
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
        <Link href="/dashboard/fragor" className="text-sm text-[var(--accent)] hover:underline">← Alla frågor</Link>
      </div>
      <section className="card">
        <div className="mb-2 text-sm text-[var(--muted)]">Publicerad {formatDate(question.createdAt)}</div>
        <h1 className="text-3xl">{question.title}</h1>
        <p className="mt-4 text-[var(--muted)]">{question.body}</p>
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className="pill pill-light">Kategori: {categoryLabels[question.category] ?? question.category}</span>
          <span className="pill pill-light">Räckvidd: {geoScopeLabels[question.geoScope] ?? question.geoScope}</span>
        </div>
        <div className="mt-4">
          <WatchThreadButton questionId={question.id} slug={slug} watching={watching} />
        </div>
      </section>

      <AnswerComposer action={boundSubmitAction} />

      <section className="space-y-4 lg:col-span-2">
        <h2 className="text-2xl">Svar från mäklare</h2>
        {questionAnswers.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Inga svar ännu. Bli först att svara.</p>
        ) : null}
        {questionAnswers.map((answer) => (
          <article key={answer.id} className="card">
            <div className="mb-2 flex items-center justify-between text-sm">
              <div>
                <p className="font-semibold">{answer.agent?.fullName ?? "Mäklare"}</p>
                <p className="text-[var(--muted)]">{answer.agent?.firm ?? "-"}</p>
              </div>
              <span className="pill pill-light">{answer.helpfulVotes} röster</span>
            </div>
            <p className="text-sm leading-6">{answer.body}</p>
            <AnswerVoteControls
              answerId={answer.id}
              slug={slug}
              myVote={answer.myVote ?? 0}
              upVotes={answer.upVotes ?? 0}
              downVotes={answer.downVotes ?? 0}
            />
          </article>
        ))}
      </section>
    </div>
  );
}
