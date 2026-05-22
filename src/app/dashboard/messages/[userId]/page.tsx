import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { getConversation, markConversationAsRead } from "@/lib/data";
import { sendConversationMessageAction } from "@/app/dashboard/messages/actions";
import { ConversationComposer } from "@/components/messages/conversation-composer";
import { UserAvatar } from "@/components/user-avatar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export default async function AgentConversationPage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = await params;
  const user = await requireUser(`/dashboard/messages/${userId}`);

  let otherName = "Mäklare";
  let otherAvatarUrl: string | null = null;

  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const { data: otherProfile } = await supabase
      .from("profiles")
      .select("full_name, avatar_url, firm, city")
      .eq("id", userId)
      .maybeSingle();

    if (otherProfile) {
      otherName = otherProfile.full_name;
      otherAvatarUrl = otherProfile.avatar_url;
    }
  }

  const conversation = await getConversation(user.id, userId);
  await markConversationAsRead(user.id, userId);

  const sendAction = sendConversationMessageAction.bind(null, userId);

  return (
    <div>
      <Link href="/dashboard/messages" className="text-sm text-[var(--accent)]">
        ← Till inkorg
      </Link>
      <div className="mt-2 flex items-center gap-3">
        <UserAvatar url={otherAvatarUrl} name={otherName} size="lg" />
        <h1 className="text-3xl">{otherName}</h1>
      </div>

      <section className="mt-4 card">
        {conversation.length === 0 && (
          <p className="text-sm text-[var(--muted)]">Inga meddelanden ännu. Skriv det första!</p>
        )}
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
