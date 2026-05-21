"use client";

import { useTransition } from "react";
import { votePollAction } from "@/app/dashboard/grupper/actions";

interface PollCardProps {
  poll: {
    id: string;
    title: string;
    description: string | null;
    options: string[];
    voteCounts: number[];
    totalVotes: number;
    myVote: number | null;
    createdAt: string;
    creatorName: string;
  };
  groupSlug: string;
  isMember: boolean;
}

export default function PollCard({ poll, groupSlug, isMember }: PollCardProps) {
  const [isPending, startTransition] = useTransition();
  const hasVoted = poll.myVote !== null;

  function handleVote(optionIndex: number) {
    startTransition(() => {
      votePollAction(poll.id, groupSlug, optionIndex);
    });
  }

  return (
    <div className="rounded-xl border border-[var(--line)] bg-white p-4">
      <p className="font-medium">{poll.title}</p>
      {poll.description && (
        <p className="mt-1 text-sm text-[var(--muted)]">{poll.description}</p>
      )}
      <div className="mt-3 space-y-2">
        {poll.options.map((option, i) => {
          const count = poll.voteCounts[i] ?? 0;
          const pct = poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0;
          const isMyVote = poll.myVote === i;

          return (
            <button
              key={i}
              onClick={() => handleVote(i)}
              disabled={isPending || !isMember}
              className={`relative w-full overflow-hidden rounded-lg border p-2 text-left text-sm transition-colors ${
                isMyVote
                  ? "border-[var(--accent)] bg-blue-50"
                  : "border-[var(--line)] hover:border-[var(--accent)]"
              } disabled:cursor-default`}
            >
              {hasVoted && (
                <div
                  className="absolute inset-y-0 left-0 bg-blue-100/50"
                  style={{ width: `${pct}%` }}
                />
              )}
              <span className="relative flex items-center justify-between">
                <span>
                  {isMyVote && <span className="mr-1 text-[var(--accent)]">&#10003;</span>}
                  {option}
                </span>
                {hasVoted && (
                  <span className="text-xs text-[var(--muted)]">
                    {count} ({pct}%)
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-[var(--muted)]">
        {poll.totalVotes} röst{poll.totalVotes !== 1 ? "er" : ""} &bull; av {poll.creatorName}
      </p>
    </div>
  );
}
