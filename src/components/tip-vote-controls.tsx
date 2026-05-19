"use client";

import { useActionState } from "react";
import { voteTipAction } from "@/app/dashboard/fragor/actions";

export function TipVoteControls({ tipId, myVote, upVotes, downVotes }: { tipId: string; myVote: -1 | 0 | 1; upVotes: number; downVotes: number }) {
  const [state, formAction, pending] = useActionState(voteTipAction, undefined);

  return (
    <form action={formAction} className="mt-3 flex flex-wrap items-center gap-2 text-xs">
      <input type="hidden" name="tip_id" value={tipId} />
      <button type="submit" name="vote" value="1" disabled={pending} className={`pill ${myVote === 1 ? "pill-dark" : "pill-light"}`}>
        Tumme upp {upVotes}
      </button>
      <button type="submit" name="vote" value="-1" disabled={pending} className={`pill ${myVote === -1 ? "pill-dark" : "pill-light"}`}>
        Tumme ner {downVotes}
      </button>
      {state?.error ? <span className="text-red-700">{state.error}</span> : null}
    </form>
  );
}
