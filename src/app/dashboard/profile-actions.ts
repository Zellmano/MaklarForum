"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function uploadAvatarAction(formData: FormData): Promise<{ error?: string; url?: string }> {
  const user = await requireUser("/dashboard/profil");
  const file = formData.get("avatar") as File | null;

  if (!file || file.size === 0) {
    return { error: "Ingen fil vald." };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: "Max 2 MB." };
  }

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
  const path = `${user.id}/avatar.${ext}`;

  const supabase = await createSupabaseServerClient();

  const { error: uploadError } = await supabase.storage
    .from("avatars")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return { error: uploadError.message };
  }

  const { data: publicUrl } = supabase.storage.from("avatars").getPublicUrl(path);
  const avatarUrl = `${publicUrl.publicUrl}?t=${Date.now()}`;

  await supabase.from("profiles").update({ avatar_url: avatarUrl }).eq("id", user.id);

  revalidatePath("/dashboard/profil");
  revalidatePath("/dashboard");
  return { url: avatarUrl };
}

export async function sendConnectionRequestAction(receiverId: string) {
  const user = await requireUser("/dashboard");
  const supabase = await createSupabaseServerClient();

  if (receiverId === user.id) return;

  const { data: existing } = await supabase
    .from("agent_connections")
    .select("id")
    .or(`and(requester_id.eq.${user.id},receiver_id.eq.${receiverId}),and(requester_id.eq.${receiverId},receiver_id.eq.${user.id})`)
    .maybeSingle();

  if (existing) return;

  await supabase.from("agent_connections").insert({
    requester_id: user.id,
    receiver_id: receiverId,
  });

  revalidatePath("/dashboard/profil");
}

export async function acceptConnectionAction(connectionId: string) {
  const user = await requireUser("/dashboard");
  const supabase = await createSupabaseServerClient();

  await supabase
    .from("agent_connections")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", connectionId)
    .eq("receiver_id", user.id)
    .eq("status", "pending");

  revalidatePath("/dashboard/profil");
}

export async function removeConnectionAction(connectionId: string) {
  const user = await requireUser("/dashboard");
  const supabase = await createSupabaseServerClient();

  await supabase
    .from("agent_connections")
    .delete()
    .eq("id", connectionId)
    .or(`requester_id.eq.${user.id},receiver_id.eq.${user.id}`);

  revalidatePath("/dashboard/profil");
}
