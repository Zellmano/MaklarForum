"use client";

import { useActionState } from "react";
import { voteAnswerAction } from "@/app/dashboard/fragor/actions";

export function AnswerVoteControls({
  answerId,
  slug,
  myVote,
  upVotes,
  downVotes,
}: {
  answerId: string;
  slug: string;
  myVote: -1 | 0 | 1;
  upVotes: number;
  downVotes: number;
}) {
  const [state, formAction, pending] = useActionState(voteAnswerAction, undefined);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      <input type="hidden" name="answer_id" value={answerId} />
      <input type="hidden" name="slug" value={slug} />
      <button
        type="submit"
        name="vote"
        value="1"
        disabled={pending}
        className={`pill ${myVote === 1 ? "pill-dark" : "pill-light"}`}
      >
        Tumme upp {upVotes}
      </button>
      <button
        type="submit"
        name="vote"
        value="-1"
        disabled={pending}
        className={`pill ${myVote === -1 ? "pill-dark" : "pill-light"}`}
      >
        Tumme ner {downVotes}
      </button>
      {state?.error ? <span className="text-red-700">{state.error}</span> : null}
    </form>
  );
}
