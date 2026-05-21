"use server";

import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

type ActionState = { error?: string; success?: string };

const MAX_OPTIONS = 10;
const MIN_OPTIONS = 2;

export async function createPollAction(
  groupId: string,
  groupSlug: string,
  _: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireRole("agent", `/dashboard/grupper/${groupSlug}`);
  const supabase = await createSupabaseServerClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("verification_status, role")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profil saknas." };
  if (profile.role !== "admin" && (profile.role !== "agent" || profile.verification_status !== "verified")) {
    return { error: "Din profil måste vara verifierad för att skapa omröstningar." };
  }

  const { data: membership } = await supabase
    .from("agent_group_members")
    .select("role")
    .eq("group_id", groupId)
    .eq("agent_id", user.id)
    .maybeSingle();

  if (!membership) {
    return { error: "Du måste vara medlem i gruppen." };
  }

  const title = String(formData.get("title") ?? "").trim().slice(0, 200);
  const description = String(formData.get("description") ?? "").trim().slice(0, 1000);

  const options: string[] = [];
  for (let i = 0; i < MAX_OPTIONS; i++) {
    const opt = String(formData.get(`option_${i}`) ?? "").trim().slice(0, 200);
    if (opt) options.push(opt);
  }

  if (!title) return { error: "Rubrik krävs." };
  if (options.length < MIN_OPTIONS) return { error: "Minst 2 alternativ krävs." };

  const { error } = await supabase.from("group_polls").insert({
    group_id: groupId,
    created_by: user.id,
    title,
    description: description || null,
    options: JSON.stringify(options),
  });

  if (error) return { error: error.message };

  revalidatePath(`/dashboard/grupper/${groupSlug}`);
  return { success: "Omröstningen skapades." };
}

export async function votePollAction(
  pollId: string,
  groupSlug: string,
  optionIndex: number,
) {
  const user = await requireRole("agent", `/dashboard/grupper/${groupSlug}`);
  const supabase = await createSupabaseServerClient();

  const { data: existing } = await supabase
    .from("group_poll_votes")
    .select("id, option_index")
    .eq("poll_id", pollId)
    .eq("voter_id", user.id)
    .maybeSingle();

  if (existing) {
    if (existing.option_index === optionIndex) {
      await supabase.from("group_poll_votes").delete().eq("id", existing.id);
    } else {
      await supabase
        .from("group_poll_votes")
        .delete()
        .eq("id", existing.id);
      await supabase.from("group_poll_votes").insert({
        poll_id: pollId,
        voter_id: user.id,
        option_index: optionIndex,
      });
    }
  } else {
    await supabase.from("group_poll_votes").insert({
      poll_id: pollId,
      voter_id: user.id,
      option_index: optionIndex,
    });
  }

  revalidatePath(`/dashboard/grupper/${groupSlug}`);
}
