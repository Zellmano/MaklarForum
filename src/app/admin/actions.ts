"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/server";

export async function approveAgentAction(formData: FormData) {
  await requireRole("admin", "/admin");
  const agentId = String(formData.get("agent_id") ?? "");

  const admin = createSupabaseAdminClient();
  await admin.from("profiles").update({ verification_status: "verified" }).eq("id", agentId);

  revalidatePath("/admin");
}

export async function rejectAgentAction(formData: FormData) {
  await requireRole("admin", "/admin");
  const agentId = String(formData.get("agent_id") ?? "");

  const admin = createSupabaseAdminClient();
  await admin.from("profiles").update({ verification_status: "suspended" }).eq("id", agentId);

  revalidatePath("/admin");
}

export async function updateAgentEmailAction(formData: FormData) {
  await requireRole("admin", "/admin");
  const agentId = String(formData.get("agent_id") ?? "");
  const email = String(formData.get("new_email") ?? "").trim().toLowerCase();

  if (!email) {
    return;
  }

  const admin = createSupabaseAdminClient();

  await admin.auth.admin.updateUserById(agentId, {
    email,
    email_confirm: true,
  });

  await admin.from("profiles").update({ email }).eq("id", agentId);

  revalidatePath("/admin");
}

export async function deleteUserAction(formData: FormData) {
  await requireRole("admin", "/admin");
  const userId = String(formData.get("user_id") ?? "");
  const confirmDelete = String(formData.get("confirm_delete") ?? "");

  if (confirmDelete !== "RADERA") {
    return;
  }

  const admin = createSupabaseAdminClient();

  const { data: profile } = await admin
    .from("profiles")
    .select("id, role, full_name, email")
    .eq("id", userId)
    .maybeSingle();

  if (!profile) {
    return;
  }

  if (profile.role === "admin") {
    return;
  }

  await admin.auth.admin.deleteUser(userId);

  revalidatePath("/admin");
}

export async function approveGroupAction(formData: FormData) {
  const adminUser = await requireRole("admin", "/admin");
  const groupId = String(formData.get("group_id") ?? "");

  const admin = createSupabaseAdminClient();
  await admin
    .from("agent_groups")
    .update({
      status: "approved",
      approved_by: adminUser.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId);

  revalidatePath("/admin");
  revalidatePath("/dashboard/grupper");
}

export async function rejectGroupAction(formData: FormData) {
  const adminUser = await requireRole("admin", "/admin");
  const groupId = String(formData.get("group_id") ?? "");

  const admin = createSupabaseAdminClient();
  await admin
    .from("agent_groups")
    .update({
      status: "rejected",
      approved_by: adminUser.id,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", groupId);

  revalidatePath("/admin");
  revalidatePath("/dashboard/grupper");
}

export async function approveModerationItemAction(formData: FormData) {
  const adminUser = await requireRole("admin", "/admin");
  const queueId = String(formData.get("queue_id") ?? "");

  const admin = createSupabaseAdminClient();
  const now = new Date().toISOString();

  const { data: queued, error: fetchError } = await admin
    .from("moderation_queue")
    .select("id, question_id, proposed_by, body, status")
    .eq("id", queueId)
    .single();

  if (fetchError || !queued || queued.status !== "pending") {
    return;
  }

  if (!queued.question_id) {
    return;
  }

  const { data: question } = await admin
    .from("questions")
    .select("id")
    .eq("id", queued.question_id)
    .maybeSingle();

  if (!question) {
    await admin
      .from("moderation_queue")
      .update({
        status: "rejected",
        reviewed_by: adminUser.id,
        reviewed_at: now,
      })
      .eq("id", queueId);
    revalidatePath("/admin");
    return;
  }

  const { error: upsertError } = await admin.from("answers").upsert(
    {
      question_id: queued.question_id,
      answered_by: queued.proposed_by,
      body: queued.body,
      updated_at: now,
    },
    { onConflict: "question_id,answered_by" },
  );

  if (upsertError) {
    return;
  }

  await admin
    .from("moderation_queue")
    .update({
      status: "approved",
      reviewed_by: adminUser.id,
      reviewed_at: now,
    })
    .eq("id", queueId);

  revalidatePath("/admin");
  revalidatePath("/fragor");
}

export async function rejectModerationItemAction(formData: FormData) {
  const adminUser = await requireRole("admin", "/admin");
  const queueId = String(formData.get("queue_id") ?? "");

  const admin = createSupabaseAdminClient();

  await admin
    .from("moderation_queue")
    .update({
      status: "rejected",
      reviewed_by: adminUser.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", queueId);

  revalidatePath("/admin");
}
