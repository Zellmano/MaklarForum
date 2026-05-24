"use server";

import { revalidatePath } from "next/cache";
import { requireRole, requireVerifiedAgent } from "@/lib/auth";
import { toSlug } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

const MAX_BODY_LENGTH = 5000;

export async function updateAgentProfileAction(_: { error?: string; success?: string } | undefined, formData: FormData) {
  const user = await requireRole("agent", "/dashboard");

  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 120);
  const firm = String(formData.get("firm") ?? "").trim().slice(0, 120);
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 2000);

  if (!fullName || !firm || !city) {
    return { error: "Namn, firma och stad är obligatoriska." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      firm,
      title,
      city,
      bio,
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard");
  return { success: "Profilen uppdaterades." };
}

export async function sendMessageAction(_: { error?: string; success?: string } | undefined, formData: FormData) {
  const user = await requireVerifiedAgent("/dashboard");
  const receiverId = String(formData.get("receiver_id") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY_LENGTH);

  if (!receiverId || !body) {
    return { error: "Mottagare och meddelande krävs." };
  }

  if (receiverId === user.id) {
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
    .or(`and(blocker_id.eq.${user.id},blocked_id.eq.${receiverId}),and(blocker_id.eq.${receiverId},blocked_id.eq.${user.id})`)
    .maybeSingle();

  if (block) {
    return { error: "Du kan inte skicka meddelande till denna användare." };
  }

  const { error } = await supabase.from("messages").insert({
    sender_id: user.id,
    receiver_id: receiverId,
    body,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/messages");
  return { success: "Meddelandet skickades." };
}

export async function createAgentGroupAction(_: { error?: string; success?: string } | undefined, formData: FormData) {
  const user = await requireVerifiedAgent("/dashboard/grupper");

  const name = String(formData.get("name") ?? "").trim().slice(0, 120);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);
  const municipality = String(formData.get("municipality") ?? "").trim().slice(0, 80);
  const region = String(formData.get("region") ?? "").trim().slice(0, 80);
  if (!name || !municipality || !region) {
    return { error: "Namn, kommun och region är obligatoriskt." };
  }

  const supabase = await createSupabaseServerClient();
  const slug = `${toSlug(name)}-${Date.now().toString().slice(-5)}`;
  const { data: group, error } = await supabase
    .from("agent_groups")
    .insert({
      name,
      slug,
      description: description || null,
      municipality,
      region,
      is_private: true,
      created_by: user.id,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return { error: error.message };
  }

  if (group) {
    await supabase.from("agent_group_members").insert({
      group_id: group.id,
      agent_id: user.id,
      role: "owner",
    });
  }

  revalidatePath("/dashboard/grupper");
  revalidatePath("/admin");

  return { success: "Gruppen skapades och ligger nu för admin-godkännande." };
}

export async function joinAgentGroupAction(groupId: string) {
  const user = await requireVerifiedAgent("/dashboard/grupper");
  const supabase = await createSupabaseServerClient();

  const { data: group } = await supabase
    .from("agent_groups")
    .select("id, is_private, status")
    .eq("id", groupId)
    .maybeSingle();

  if (!group || group.status !== "approved") {
    return;
  }

  if (group.is_private) {
    await supabase.from("group_join_requests").insert({
      group_id: groupId,
      agent_id: user.id,
      status: "pending",
    });
  } else {
    await supabase.from("agent_group_members").insert({
      group_id: groupId,
      agent_id: user.id,
      role: "member",
    });
  }

  revalidatePath("/dashboard/grupper");
  revalidatePath(`/dashboard/grupper/${groupId}`);
}

export async function leaveAgentGroupAction(groupId: string) {
  const user = await requireVerifiedAgent("/dashboard/grupper");
  const supabase = await createSupabaseServerClient();

  const { data: group } = await supabase
    .from("agent_groups")
    .select("is_default")
    .eq("id", groupId)
    .maybeSingle();

  if (group?.is_default) return;

  await supabase.from("agent_group_members").delete().eq("group_id", groupId).eq("agent_id", user.id);

  revalidatePath("/dashboard/grupper");
  revalidatePath(`/dashboard/grupper/${groupId}`);
}

export async function approveJoinRequestAction(requestId: string) {
  const user = await requireVerifiedAgent("/dashboard/grupper");
  const supabase = await createSupabaseServerClient();

  const { data: request } = await supabase
    .from("group_join_requests")
    .select("id, group_id, agent_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || request.status !== "pending") return;

  const { data: ownership } = await supabase
    .from("agent_group_members")
    .select("role")
    .eq("group_id", request.group_id)
    .eq("agent_id", user.id)
    .maybeSingle();

  if (!ownership || ownership.role !== "owner") return;

  await supabase
    .from("group_join_requests")
    .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", requestId);

  await supabase.from("agent_group_members").insert({
    group_id: request.group_id,
    agent_id: request.agent_id,
    role: "member",
  });

  revalidatePath(`/dashboard/grupper/${request.group_id}`);
}
