"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const ALLOWED_AVATAR_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export async function uploadAvatarAction(formData: FormData): Promise<{ error?: string; url?: string }> {
  const user = await requireUser("/dashboard/profil");
  const file = formData.get("avatar") as File | null;

  if (!file || file.size === 0) {
    return { error: "Ingen fil vald." };
  }

  if (file.size > 2 * 1024 * 1024) {
    return { error: "Max 2 MB." };
  }

  const ext = ALLOWED_AVATAR_TYPES[file.type];
  if (!ext) {
    return { error: "Endast JPG, PNG eller WebP är tillåtet." };
  }

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

export async function addAgentAreaAction(_: { error?: string; success?: string } | undefined, formData: FormData) {
  const user = await requireUser("/dashboard/profil");
  const municipality = String(formData.get("municipality") ?? "").trim().slice(0, 80);
  const region = String(formData.get("region") ?? "").trim().slice(0, 80);

  if (!municipality || !region) {
    return { error: "Ange både kommun och region." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("agent_areas")
    .upsert({ agent_id: user.id, municipality, region }, { onConflict: "agent_id,municipality" });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/profil");
  return { success: "Området lades till." };
}

export async function removeAgentAreaAction(areaId: string) {
  const user = await requireUser("/dashboard/profil");
  const supabase = await createSupabaseServerClient();
  await supabase.from("agent_areas").delete().eq("id", areaId).eq("agent_id", user.id);
  revalidatePath("/dashboard/profil");
}

export async function updateNotificationPrefsAction(formData: FormData) {
  const user = await requireUser("/dashboard/profil");
  const enabled = formData.get("email_notifications") === "on";

  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("notification_prefs")
    .eq("id", user.id)
    .maybeSingle();

  const prefs =
    profile?.notification_prefs && typeof profile.notification_prefs === "object"
      ? (profile.notification_prefs as Record<string, unknown>)
      : {};

  await supabase
    .from("profiles")
    .update({ notification_prefs: { ...prefs, email_notifications: enabled } })
    .eq("id", user.id);

  revalidatePath("/dashboard/profil");
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
