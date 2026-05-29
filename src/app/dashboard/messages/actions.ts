"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedAgent } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

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

  revalidatePath(`/dashboard/messages/${otherUserId}`);
  revalidatePath("/dashboard/messages");
  revalidatePath("/dashboard");

  return { success: "Meddelandet skickades." };
}
