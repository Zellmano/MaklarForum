"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function sendConversationMessageAction(
  otherUserId: string,
  _: { error?: string; success?: string } | undefined,
  formData: FormData,
) {
  const user = await requireUser(`/dashboard/messages/${otherUserId}`);
  const body = String(formData.get("body") ?? "").trim();

  if (!body) {
    return { error: "Skriv ett meddelande innan du skickar." };
  }

  if (otherUserId === user.id) {
    return { error: "Du kan inte skicka meddelande till dig själv." };
  }

  const supabase = await createSupabaseServerClient();

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
