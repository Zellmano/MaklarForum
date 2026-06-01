"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedAgent } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { emailNotificationsEnabled, sendNewMessageEmail } from "@/lib/email";

export async function sendConversationMessageAction(
  otherUserId: string,
  _: { error?: string; success?: string } | undefined,
  formData: FormData,
) {
  const user = await requireVerifiedAgent(`/dashboard/messages/${otherUserId}`);
  const body = String(formData.get("body") ?? "").trim().slice(0, 5000);

  if (!body) {
    return { error: "Skriv ett meddelande innan du skickar." };
  }

  if (otherUserId === user.id) {
    return { error: "Du kan inte skicka meddelande till dig själv." };
  }

  const rateLimit = await checkRateLimit("messages", user.id);
  if (!rateLimit.ok) {
    return { error: rateLimit.error };
  }

  const supabase = await createSupabaseServerClient();

  const { data: block } = await supabase
    .from("user_blocks")
    .select("blocker_id")
    .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${otherUserId}),and(blocker_id.eq.${otherUserId},blocked_id.eq.${user.id})`)
    .maybeSingle();

  if (block) {
    return { error: "Du kan inte skicka meddelande till denna användare." };
  }

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    receiver_id: otherUserId,
    body,
  });

  if (error) {
    return { error: error.message };
  }

  await notifyNewMessage(supabase, user.id, user.fullName, otherUserId);

  revalidatePath(`/dashboard/messages/${otherUserId}`);
  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard");

  return { success: "Meddelandet skickades." };
}

/**
 * Emails the receiver about a new message — but only for the first unread
 * message in the conversation, so a burst of messages produces one email until
 * the receiver reads them. No-ops if the receiver has disabled notifications.
 */
async function notifyNewMessage(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  senderId: string,
  senderName: string,
  receiverId: string,
) {
  const { count } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("sender_id", senderId)
    .eq("receiver_id", receiverId)
    .is("read_at", null);

  if ((count ?? 0) !== 1) return;

  const { data: receiver } = await supabase
    .from("profiles")
    .select("email, full_name, notification_prefs")
    .eq("id", receiverId)
    .maybeSingle();

  if (!receiver?.email || !emailNotificationsEnabled(receiver.notification_prefs)) return;

  await sendNewMessageEmail({
    to: receiver.email,
    name: receiver.full_name ?? "",
    senderName,
    senderId,
  });
}
