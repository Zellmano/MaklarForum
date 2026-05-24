import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getMessageThreads } from "@/lib/data";
import { formatDate } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { UserAvatar } from "@/components/user-avatar";

export default async function AgentMessagesPage() {
  const user = await requireUser("/dashboard/messages");
  const threads = await getMessageThreads(user.id);

  const avatarMap = new Map<string, string | null>();
  if (hasSupabaseEnv() && threads.length > 0) {
    const supabase = await createSupabaseServerClient();
    const ids = threads.map((t) => t.otherUserId);
    const { data } = await supabase
      .from("profiles")
      .select("id, avatar_url")
      .in("id", ids);
    for (const p of data ?? []) {
      avatarMap.set(p.id, p.avatar_url);
    }
  }

  return (
    <div>
      <h1 className="text-4xl">Inkorg</h1>
      <p className="mt-2 text-[var(--muted)]">Dina konversationer med andra mäklare.</p>

      <section className="mt-6 card">
        {threads.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">Inga konversationer ännu. Skicka ett meddelande till en kollega via mäklarkatalogen.</p>
        ) : null}
        <div className="space-y-3">
          {threads.map((thread) => (
            <Link
              key={thread.otherUserId}
              href={`/dashboard/messages/${thread.otherUserId}`}
              className="flex items-center gap-3 rounded-xl border border-[var(--line)] bg-white p-3"
            >
              <UserAvatar url={avatarMap.get(thread.otherUserId)} name={thread.otherUserName} />
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">{thread.otherUserName}</p>
                  <p className="shrink-0 text-xs text-[var(--muted)]">{formatDate(thread.lastMessageAt)}</p>
                </div>
                <p className="mt-1 truncate text-sm text-[var(--muted)]">{thread.lastMessage}</p>
              </div>
              {thread.unreadCount > 0 && (
                <span className="ml-2 shrink-0 rounded-full bg-[var(--accent)] px-2 py-0.5 text-xs text-white">
                  {thread.unreadCount}
                </span>
              )}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
