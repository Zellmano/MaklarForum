"use server";

import { revalidatePath } from "next/cache";
import { requireAgent, requireRole, requireVerifiedAgent } from "@/lib/auth";
import { toSlug } from "@/lib/format";
import { createSupabaseServerClient, createSupabaseAdminClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { emailNotificationsEnabled, sendGroupApprovalEmail, sendNewMessageEmail } from "@/lib/email";
import { createNotification } from "@/lib/notifications";

const MAX_BODY_LENGTH = 5000;

export async function updateAgentProfileAction(_: { error?: string; success?: string } | undefined, formData: FormData) {
  const user = await requireRole("agent", "/dashboard");

  // Name is intentionally NOT editable here — it's tied to admin verification.
  const firm = String(formData.get("firm") ?? "").trim().slice(0, 120);
  const title = String(formData.get("title") ?? "").trim().slice(0, 80);
  const city = String(formData.get("city") ?? "").trim().slice(0, 80);
  const bio = String(formData.get("bio") ?? "").trim().slice(0, 2000);

  if (!firm || !city) {
    return { error: "Firma och stad är obligatoriska." };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("profiles")
    .update({
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

  await createNotification({
    user_id: receiverId,
    type: "new_message",
    title: `Nytt meddelande från ${user.fullName}`,
    link: `/dashboard/messages/${user.id}`,
  });
  await notifyNewMessage(supabase, user.id, user.fullName, receiverId);

  revalidatePath("/dashboard/messages");
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
  const user = await requireAgent("/dashboard/grupper");
  const supabase = await createSupabaseServerClient();

  const { data: group } = await supabase
    .from("agent_groups")
    .select("id, name, slug, is_private, status, email_domain")
    .eq("id", groupId)
    .maybeSingle();

  if (!group || group.status !== "approved") {
    return;
  }

  // A company email on the group's domain (e.g. namn@bjurfors.se for the
  // Bjurfors group) proves affiliation — join instantly without approval.
  const userDomain = user.email.split("@")[1]?.toLowerCase() ?? "";
  const domainMatch =
    !!group.email_domain && userDomain === group.email_domain.toLowerCase();

  if (!group.is_private || domainMatch) {
    // upsert keeps double-click idempotent.
    await supabase
      .from("agent_group_members")
      .upsert(
        { group_id: groupId, agent_id: user.id, role: "member" },
        { onConflict: "group_id,agent_id" },
      );
  } else {
    // Unique (group_id, agent_id, status) guards against duplicates from
    // double-clicks; ignore the conflict silently.
    const { error } = await supabase.from("group_join_requests").insert({
      group_id: groupId,
      agent_id: user.id,
      status: "pending",
    });
    if (error && !error.message.includes("duplicate")) {
      console.error("joinAgentGroupAction join_request failed", error);
    } else if (!error) {
      await notifyJoinRequestReviewers(group.id, group.name, group.slug, user.fullName);
    }
  }

  revalidatePath("/dashboard/grupper");
  revalidatePath(`/dashboard/grupper/${groupId}`);
}

/** In-app notification to group owners + site admins when someone applies. */
async function notifyJoinRequestReviewers(
  groupId: string,
  groupName: string,
  groupSlug: string,
  applicantName: string,
): Promise<void> {
  try {
    const admin = createSupabaseAdminClient();
    const [{ data: owners }, { data: admins }] = await Promise.all([
      admin
        .from("agent_group_members")
        .select("agent_id")
        .eq("group_id", groupId)
        .eq("role", "owner"),
      admin.from("profiles").select("id").eq("role", "admin"),
    ]);

    const recipients = new Set<string>([
      ...(owners ?? []).map((o) => o.agent_id),
      ...(admins ?? []).map((a) => a.id),
    ]);

    const { createNotifications } = await import("@/lib/notifications");
    await createNotifications(
      [...recipients].map((userId) => ({
        user_id: userId,
        type: "join_request" as const,
        title: `Ny ansökan till ${groupName}`,
        body: `${applicantName} vill gå med i gruppen.`,
        link: `/dashboard/grupper/${groupSlug}`,
      })),
    );
  } catch (err) {
    console.error("notifyJoinRequestReviewers failed", err);
  }
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

  // Group owners approve their own members; admins can approve anywhere
  // (they manage groups in the background without being members).
  if (user.role !== "admin" && (!ownership || ownership.role !== "owner")) return;

  // The member-insert RLS only allows self-joins, so an approver can't add
  // someone else through the normal client. Use the service-role client for the
  // privileged writes — authorization is already enforced above.
  const admin = createSupabaseAdminClient();

  // Add membership FIRST so we never end up with an "approved" request and no
  // membership row (the inverse is recoverable; this isn't).
  const { error: memberError } = await admin
    .from("agent_group_members")
    .upsert(
      { group_id: request.group_id, agent_id: request.agent_id, role: "member" },
      { onConflict: "group_id,agent_id" },
    );

  if (memberError) {
    console.error("approveJoinRequestAction member upsert failed", memberError);
    return;
  }

  await admin
    .from("group_join_requests")
    .update({ status: "approved", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", requestId);

  const [{ data: approvedAgent }, { data: group }] = await Promise.all([
    supabase
      .from("profiles")
      .select("email, full_name, notification_prefs")
      .eq("id", request.agent_id)
      .maybeSingle(),
    supabase.from("agent_groups").select("name, slug").eq("id", request.group_id).maybeSingle(),
  ]);

  if (group) {
    await createNotification({
      user_id: request.agent_id,
      type: "group_approved",
      title: `Du är nu medlem i ${group.name}`,
      link: `/dashboard/grupper/${group.slug}`,
    });
  }

  if (approvedAgent?.email && group && emailNotificationsEnabled(approvedAgent.notification_prefs)) {
    await sendGroupApprovalEmail({
      to: approvedAgent.email,
      name: approvedAgent.full_name ?? "",
      groupName: group.name,
      groupSlug: group.slug,
    });
  }

  revalidatePath(`/dashboard/grupper/${request.group_id}`);
}

export async function rejectJoinRequestAction(requestId: string) {
  const user = await requireVerifiedAgent("/dashboard/grupper");
  const supabase = await createSupabaseServerClient();

  const { data: request } = await supabase
    .from("group_join_requests")
    .select("id, group_id, status")
    .eq("id", requestId)
    .maybeSingle();

  if (!request || request.status !== "pending") return;

  const { data: ownership } = await supabase
    .from("agent_group_members")
    .select("role")
    .eq("group_id", request.group_id)
    .eq("agent_id", user.id)
    .maybeSingle();

  if (user.role !== "admin" && (!ownership || ownership.role !== "owner")) return;

  await supabase
    .from("group_join_requests")
    .update({ status: "rejected", reviewed_by: user.id, reviewed_at: new Date().toISOString() })
    .eq("id", requestId);

  revalidatePath(`/dashboard/grupper/${request.group_id}`);
}
