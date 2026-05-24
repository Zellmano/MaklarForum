"use server";

import { revalidatePath } from "next/cache";
import { requireVerifiedAgent } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { canPublish } from "@/lib/moderation";
import type { ForumCategory } from "@/lib/types";

const VALID_CATEGORIES: ForumCategory[] = ["juridik", "budgivning", "teknik", "rekrytering", "allmant"];

type ActionState = { error?: string; success?: string };

export async function createForumPostAction(_: ActionState | undefined, formData: FormData): Promise<ActionState> {
  const user = await requireVerifiedAgent("/dashboard/forum");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "allmant").trim();
  const isRecruiting = formData.get("is_recruiting") === "on";

  if (!title || title.length < 3) {
    return { error: "Titel måste vara minst 3 tecken." };
  }
  if (!body || body.length < 10) {
    return { error: "Inlägget måste vara minst 10 tecken." };
  }

  const category: ForumCategory = (VALID_CATEGORIES as string[]).includes(categoryRaw)
    ? (categoryRaw as ForumCategory)
    : "allmant";

  const moderation = canPublish(`${title}\n${body}`);
  if (!moderation.ok) {
    return { error: `Inlägget blockerades. Otillåtna ord: ${moderation.blocked.join(", ")}` };
  }

  const rateLimit = await checkRateLimit("forum_posts", user.id);
  if (!rateLimit.ok) {
    return { error: rateLimit.error };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("forum_posts").insert({
    author_id: user.id,
    title,
    body,
    category,
    is_recruiting: category === "rekrytering" ? true : isRecruiting,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/forum");
  return { success: "Inlägget publicerades." };
}

export async function updateForumPostAction(postId: string, formData: FormData): Promise<ActionState> {
  await requireVerifiedAgent("/dashboard/forum");

  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const categoryRaw = String(formData.get("category") ?? "allmant").trim();

  if (!title || title.length < 3) {
    return { error: "Titel måste vara minst 3 tecken." };
  }
  if (!body || body.length < 10) {
    return { error: "Inlägget måste vara minst 10 tecken." };
  }

  const category: ForumCategory = (VALID_CATEGORIES as string[]).includes(categoryRaw)
    ? (categoryRaw as ForumCategory)
    : "allmant";

  const moderation = canPublish(`${title}\n${body}`);
  if (!moderation.ok) {
    return { error: `Inlägget blockerades. Otillåtna ord: ${moderation.blocked.join(", ")}` };
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("forum_posts")
    .update({ title, body, category })
    .eq("id", postId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/forum");
  return { success: "Inlägget uppdaterades." };
}

export async function deleteForumPostAction(postId: string): Promise<ActionState> {
  await requireVerifiedAgent("/dashboard/forum");

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("forum_posts").delete().eq("id", postId);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/dashboard/forum");
  return { success: "Inlägget raderades." };
}
