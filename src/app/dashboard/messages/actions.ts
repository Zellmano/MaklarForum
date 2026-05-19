"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function sendConversationMessageAction(
  otherUserId: string,
  _: { error?: string; success?: string } | undefined,
  formData: FormData,
) {
  const user = await requireRole("agent", `/dashboard/messages/${otherUserId}`);
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    return { error: "Skriv ett meddelande innan du skickar." };
  }

  const supabase = await createSupabaseServerClient();
  const [{ data: initiated }, { data: blocked }] = await Promise.all([
    supabase
      .from("messages")
      .select("id")
      .eq("sender_id", otherUserId)
      .eq("receiver_id", user.id)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("user_blocks")
      .select("blocked_id")
      .eq("blocker_id", otherUserId)
      .eq("blocked_id", user.id)
      .limit(1)
      .maybeSingle(),
  ]);

  if (blocked) {
    return { error: "Den här kunden har blockerat kontakt." };
  }

  if (!initiated) {
    return { error: "Kunden måste initiera kontakt först via meddelandefunktionen." };
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
