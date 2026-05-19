import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getConversation, getMessageThreads, markConversationAsRead } from "@/lib/data";
import { sendConversationMessageAction } from "@/app/dashboard/messages/actions";
import { ConversationComposer } from "@/components/messages/conversation-composer";

export default async function AgentConversationPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await requireRole("agent", `/dashboard/messages/${userId}`);

  const [threads, conversation] = await Promise.all([getMessageThreads(user.id), getConversation(user.id, userId)]);

  const thread = threads.find((item) => item.otherUserId === userId);
  if (!thread) {
    notFound();
  }

  await markConversationAsRead(user.id, userId);

  const sendAction = sendConversationMessageAction.bind(null, userId);

  return (
    <div>
      <Link href="/dashboard/messages" className="text-sm text-[var(--accent)]">
        ← Till inkorg
      </Link>
      <h1 className="mt-2 text-3xl">{thread.otherUserName}</h1>
      <p className="text-sm text-[var(--muted)]">Roll: {thread.otherUserRole}</p>

      <section className="mt-4 card">
        <div className="space-y-3">
          {conversation.map((message) => {
            const mine = message.senderId === user.id;
            return (
              <div key={message.id} className={`rounded-xl border p-3 text-sm ${mine ? "border-emerald-300 bg-emerald-50" : "border-[var(--line)] bg-white"}`}>
                <p className="font-medium">{mine ? "Du" : message.senderName}</p>
                <p className="mt-1">{message.body}</p>
                <p className="mt-2 text-xs text-[var(--muted)]">{formatDate(message.createdAt)}</p>
              </div>
            );
          })}
        </div>

        <ConversationComposer action={sendAction} />
      </section>
    </div>
  );
}
