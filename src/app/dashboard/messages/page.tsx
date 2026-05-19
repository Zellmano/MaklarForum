import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getMessageThreads } from "@/lib/data";
import { formatDate } from "@/lib/format";

export default async function AgentMessagesPage() {
  const user = await requireRole("agent", "/dashboard/messages");
  const threads = await getMessageThreads(user.id);

  return (
    <div>
      <h1 className="text-4xl">Inkorg</h1>
      <p className="mt-2 text-[var(--muted)]">Alla dina konversationer med kunder och andra användare.</p>

      <section className="mt-6 card">
        {threads.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga konversationer ännu.</p> : null}
        <div className="space-y-3">
          {threads.map((thread) => (
            <Link
              key={thread.otherUserId}
              href={`/dashboard/messages/${thread.otherUserId}`}
              className="block rounded-xl border border-[var(--line)] bg-white p-3"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-medium">
                    {thread.otherUserName} ({thread.otherUserRole})
                  </p>
                  <p className="mt-1 text-sm text-[var(--muted)]">{thread.lastMessage}</p>
                </div>
                <div className="text-right text-xs text-[var(--muted)]">
                  <p>{formatDate(thread.lastMessageAt)}</p>
                  <p>Olästa: {thread.unreadCount}</p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
