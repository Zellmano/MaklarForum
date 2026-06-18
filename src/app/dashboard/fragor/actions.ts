"use server";

import { revalidatePath } from "next/cache";
import { requireUser, requireVerifiedAgent } from "@/lib/auth";
import { toSlug } from "@/lib/format";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { canPublish } from "@/lib/moderation";
import { checkRateLimit } from "@/lib/rate-limit";
import { createNotifications } from "@/lib/notifications";
import { emailNotificationsEnabled, sendNewGroupPostEmail } from "@/lib/email";

const MAX_BODY_LENGTH = 10000;
const MAX_TITLE_LENGTH = 200;

type ActionState = { error?: string; success?: string };

async function ensureVerifiedAgent(userId: string) {
  const supabase = await createSupabaseServerClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("verification_status, role")
    .eq("id", userId)
    .single();
  if (!profile) return false;
  if (profile.role === "admin") return true;
  return profile.role === "agent" && profile.verification_status === "verified";
}

export async function submitAnswerAction(
  questionId: string,
  slug: string,
  _: ActionState | undefined,
  formData: FormData,
) {
  const user = await requireVerifiedAgent(`/dashboard/fragor/${slug}`);
  const supabase = await createSupabaseServerClient();

  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY_LENGTH);
  if (!body) {
    return { error: "Svar kan inte vara tomt." };
  }

  const moderation = canPublish(body);
  if (!moderation.ok) {
    const { error: moderationError } = await supabase.from("moderation_queue").insert({
      item_type: "answer",
      question_id: questionId,
      proposed_by: user.id,
      body,
      blocked_terms: moderation.blocked,
      status: "pending",
    });
    if (moderationError) {
      return { error: moderationError.message };
    }
    revalidatePath("/admin");
    return { success: "Svar skickat till admin för granskning innan publicering." };
  }

  if (!(await ensureVerifiedAgent(user.id))) {
    return { error: "Din mäklarprofil är inte verifierad ännu." };
  }

  const rateLimit = await checkRateLimit("answers", user.id);
  if (!rateLimit.ok) {
    return { error: rateLimit.error };
  }

  const { error } = await supabase.from("answers").insert({
    question_id: questionId,
    answered_by: user.id,
    body,
  });

  if (error) {
    return { error: error.message };
  }

  await supabase.from("question_watchers").upsert(
    { question_id: questionId, user_id: user.id },
    { onConflict: "question_id,user_id" },
  );

  revalidatePath(`/dashboard/fragor/${slug}`);
  return { success: "Svar publicerat." };
}

export async function askQuestionAction(_: ActionState | undefined, formData: FormData) {
  const user = await requireVerifiedAgent("/dashboard/fragor");

  const title = String(formData.get("title") ?? "").trim().slice(0, MAX_TITLE_LENGTH);
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY_LENGTH);
  const category = String(formData.get("category") ?? "ovrigt");
  const geoScope = String(formData.get("geo_scope") ?? "open");
  const municipality = String(formData.get("municipality") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();
  const groupId = String(formData.get("group_id") ?? "").trim() || null;

  if (!title || !body) {
    return { error: "Rubrik och fråga är obligatoriska." };
  }

  if (!(await ensureVerifiedAgent(user.id))) {
    return { error: "Din mäklarprofil måste vara verifierad för att ställa frågor." };
  }

  const rateLimit = await checkRateLimit("questions", user.id);
  if (!rateLimit.ok) {
    return { error: rateLimit.error };
  }

  const questionSlug = `${toSlug(title)}-${Date.now().toString().slice(-6)}`;
  const supabase = await createSupabaseServerClient();
  const { data: inserted, error } = await supabase
    .from("questions")
    .insert({
      asked_by: user.id,
      title,
      question_slug: questionSlug,
      body,
      audience: "general",
      category,
      geo_scope: geoScope,
      municipality: municipality || null,
      region: region || null,
      group_id: groupId,
    })
    .select("id")
    .single();

  if (error) {
    return { error: `Kunde inte publicera frågan: ${error.message}` };
  }

  if (inserted) {
    await supabase.from("question_watchers").upsert(
      { question_id: inserted.id, user_id: user.id },
      { onConflict: "question_id,user_id" },
    );

    if (groupId) {
      await notifyNewGroupPost(supabase, groupId, user.id, user.fullName, title, questionSlug);
    }
  }

  revalidatePath("/dashboard/fragor");
  return { success: "Frågan är publicerad." };
}

/**
 * Notifies every member of a group (except the author) about a new post —
 * both in-app and by email (respecting each member's mail-notification toggle).
 */
async function notifyNewGroupPost(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  groupId: string,
  authorId: string,
  authorName: string,
  questionTitle: string,
  questionSlug: string,
) {
  const [{ data: group }, { data: members }] = await Promise.all([
    supabase.from("agent_groups").select("name").eq("id", groupId).maybeSingle(),
    supabase
      .from("agent_group_members")
      .select("agent_id, profiles:agent_id(email, full_name, notification_prefs)")
      .eq("group_id", groupId),
  ]);

  if (!group) return;

  const recipients = (members ?? [])
    .filter((m) => m.agent_id !== authorId)
    .map((m) => {
      const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
      return { agentId: m.agent_id, profile: p as { email: string | null; full_name: string | null; notification_prefs: Record<string, unknown> | null } | null };
    })
    .filter((r) => r.profile);

  if (recipients.length === 0) return;

  await createNotifications(
    recipients.map((r) => ({
      user_id: r.agentId,
      type: "new_group_post" as const,
      title: `Nytt inlägg i ${group.name}`,
      body: questionTitle,
      link: `/dashboard/fragor/${questionSlug}`,
    })),
  );

  await Promise.all(
    recipients
      .filter((r) => r.profile?.email && emailNotificationsEnabled(r.profile.notification_prefs))
      .map((r) =>
        sendNewGroupPostEmail({
          to: r.profile!.email!,
          name: r.profile!.full_name ?? "",
          groupName: group.name,
          authorName,
          questionTitle,
          questionSlug,
        }),
      ),
  );
}

export async function toggleWatchThreadAction(questionId: string, slug: string, watching: boolean) {
  const user = await requireUser(`/dashboard/fragor/${slug}`);
  const supabase = await createSupabaseServerClient();

  if (watching) {
    await supabase.from("question_watchers").delete().eq("question_id", questionId).eq("user_id", user.id);
  } else {
    await supabase.from("question_watchers").insert({
      question_id: questionId,
      user_id: user.id,
    });
  }

  revalidatePath(`/dashboard/fragor/${slug}`);
  revalidatePath("/dashboard");
}

export async function voteAnswerAction(_: ActionState | undefined, formData: FormData) {
  const user = await requireVerifiedAgent("/dashboard/fragor");

  const answerId = String(formData.get("answer_id") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const voteRaw = Number(formData.get("vote") ?? 0);
  const vote = voteRaw === -1 ? -1 : 1;

  if (!answerId || !slug) {
    return { error: "Ogiltig röst." };
  }

  if (!(await ensureVerifiedAgent(user.id))) {
    return { error: "Din mäklarprofil måste vara verifierad för att rösta." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("answer_votes")
    .select("vote")
    .eq("answer_id", answerId)
    .eq("consumer_id", user.id)
    .maybeSingle();

  if (existing && existing.vote === vote) {
    await supabase.from("answer_votes").delete().eq("answer_id", answerId).eq("consumer_id", user.id);
  } else {
    await supabase.from("answer_votes").upsert({
      answer_id: answerId,
      consumer_id: user.id,
      vote,
      updated_at: new Date().toISOString(),
    });
  }

  revalidatePath(`/dashboard/fragor/${slug}`);
  return { success: "Röst registrerad." };
}

export async function createAgentTipAction(_: ActionState | undefined, formData: FormData) {
  const user = await requireVerifiedAgent("/dashboard/fragor");

  const title = String(formData.get("title") ?? "").trim().slice(0, MAX_TITLE_LENGTH);
  const body = String(formData.get("body") ?? "").trim().slice(0, MAX_BODY_LENGTH);
  const geoScope = String(formData.get("geo_scope") ?? "open");
  const municipality = String(formData.get("municipality") ?? "").trim();
  const region = String(formData.get("region") ?? "").trim();

  if (!title || !body) {
    return { error: "Rubrik och innehåll krävs." };
  }

  const moderation = canPublish(body);
  if (!moderation.ok) {
    return { error: `Tips blockerat. Otillåtna ord: ${moderation.blocked.join(", ")}` };
  }

  if (!(await ensureVerifiedAgent(user.id))) {
    return { error: "Din mäklarprofil måste vara verifierad för att publicera tips." };
  }

  const rateLimit = await checkRateLimit("agent_tips", user.id);
  if (!rateLimit.ok) {
    return { error: rateLimit.error };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("agent_tips").insert({
    author_id: user.id,
    title,
    body,
    audience: "general",
    geo_scope: geoScope,
    municipality: municipality || null,
    region: region || null,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/fragor");
  return { success: "Tipset publicerades." };
}

export async function voteTipAction(_: ActionState | undefined, formData: FormData) {
  const user = await requireVerifiedAgent("/dashboard/fragor");
  const tipId = String(formData.get("tip_id") ?? "").trim();
  const voteRaw = Number(formData.get("vote") ?? 0);
  const vote = voteRaw === -1 ? -1 : 1;

  if (!tipId) {
    return { error: "Ogiltig röst." };
  }

  if (!(await ensureVerifiedAgent(user.id))) {
    return { error: "Din mäklarprofil måste vara verifierad för att rösta." };
  }

  const supabase = await createSupabaseServerClient();
  const { data: existing } = await supabase
    .from("agent_tip_votes")
    .select("vote")
    .eq("tip_id", tipId)
    .eq("consumer_id", user.id)
    .maybeSingle();

  if (existing && existing.vote === vote) {
    await supabase.from("agent_tip_votes").delete().eq("tip_id", tipId).eq("consumer_id", user.id);
  } else {
    await supabase.from("agent_tip_votes").upsert({
      tip_id: tipId,
      consumer_id: user.id,
      vote,
      updated_at: new Date().toISOString(),
    });
  }

  revalidatePath("/dashboard/fragor");
  return { success: "Röst registrerad." };
}
