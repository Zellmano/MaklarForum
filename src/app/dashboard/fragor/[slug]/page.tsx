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
  let relatedQuestions: { id: string; title: string; question_slug: string; answer_count: number }[] = [];

  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();

    const [{ data: watchData }, { data: related }] = await Promise.all([
      supabase
        .from("question_watchers")
        .select("question_id")
        .eq("question_id", question.id)
        .eq("user_id", currentUser.id)
        .maybeSingle(),
      supabase
        .from("questions")
        .select("id, title, question_slug")
        .eq("category", question.category)
        .neq("id", question.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

    watching = Boolean(watchData);

    if (related && related.length > 0) {
      const relatedIds = related.map((r) => r.id);
      const { data: counts } = await supabase
        .from("answers")
        .select("question_id")
        .in("question_id", relatedIds);

      const countMap = new Map<string, number>();
      for (const c of counts ?? []) {
        countMap.set(c.question_id, (countMap.get(c.question_id) ?? 0) + 1);
      }

      relatedQuestions = related.map((r) => ({
        ...r,
        answer_count: countMap.get(r.id) ?? 0,
      }));
    }
  }

  const sorted = [...questionAnswers].sort((a, b) => b.helpfulVotes - a.helpfulVotes);
  const topAnswers = sorted.slice(0, 3);
  const remainingAnswers = sorted.slice(3);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div>
        <Link href="/dashboard/fragor" className="text-sm text-[var(--accent)] hover:underline">← Alla frågor</Link>

        <section className="card mt-4">
          <div className="text-sm text-[var(--muted)]">Publicerad {formatDate(question.createdAt)}</div>
          <h1 className="mt-2 text-3xl">{question.title}</h1>
          <p className="mt-4 leading-7">{question.body}</p>
          <div className="mt-4">
            <WatchThreadButton questionId={question.id} slug={slug} watching={watching} />
          </div>
        </section>

        <AnswerComposer action={boundSubmitAction} />

        <section className="mt-6 space-y-4">
          <h2 className="text-xl">
            {questionAnswers.length === 0
              ? "Inga svar ännu"
              : `${questionAnswers.length} svar`}
          </h2>
          {questionAnswers.length === 0 && (
            <p className="text-sm text-[var(--muted)]">Bli först att svara på denna diskussion.</p>
          )}
          {topAnswers.map((answer) => (
            <article key={answer.id} className="card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{answer.agent?.fullName ?? "Mäklare"}</p>
                  <p className="text-xs text-[var(--muted)]">{answer.agent?.firm ?? "-"} &bull; {answer.agent?.city ?? "-"}</p>
                </div>
                <span className="shrink-0 text-xs text-[var(--muted)]">{formatDate(answer.createdAt)}</span>
              </div>
              <p className="mt-3 text-sm leading-6">{answer.body}</p>
              <AnswerVoteControls
                answerId={answer.id}
                slug={slug}
                myVote={answer.myVote ?? 0}
                upVotes={answer.upVotes ?? 0}
                downVotes={answer.downVotes ?? 0}
              />
            </article>
          ))}
          {remainingAnswers.length > 0 && (
            <details className="group">
              <summary className="cursor-pointer text-sm text-[var(--accent)]">
                Visa {remainingAnswers.length} fler svar
              </summary>
              <div className="mt-4 space-y-4">
                {remainingAnswers.map((answer) => (
                  <article key={answer.id} className="card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{answer.agent?.fullName ?? "Mäklare"}</p>
                        <p className="text-xs text-[var(--muted)]">{answer.agent?.firm ?? "-"} &bull; {answer.agent?.city ?? "-"}</p>
                      </div>
                      <span className="shrink-0 text-xs text-[var(--muted)]">{formatDate(answer.createdAt)}</span>
                    </div>
                    <p className="mt-3 text-sm leading-6">{answer.body}</p>
                    <AnswerVoteControls
                      answerId={answer.id}
                      slug={slug}
                      myVote={answer.myVote ?? 0}
                      upVotes={answer.upVotes ?? 0}
                      downVotes={answer.downVotes ?? 0}
                    />
                  </article>
                ))}
              </div>
            </details>
          )}
        </section>
      </div>

      <aside className="hidden lg:block">
        <div className="sticky top-6 space-y-4">
          <div className="card">
            <h3 className="text-sm font-semibold">Liknande diskussioner</h3>
            <div className="mt-3 space-y-2">
              {relatedQuestions.length === 0 && (
                <p className="text-xs text-[var(--muted)]">Inga liknande diskussioner hittades.</p>
              )}
              {relatedQuestions.map((rq) => (
                <Link
                  key={rq.id}
                  href={`/dashboard/fragor/${rq.question_slug}`}
                  className="block rounded-lg border border-[var(--line)] bg-white p-2 text-sm hover:border-[var(--accent)]"
                >
                  <p className="font-medium leading-tight">{rq.title}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">{rq.answer_count} svar</p>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
