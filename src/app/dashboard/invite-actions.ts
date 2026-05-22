"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const MAX_INVITES_PER_DAY = 3;

type ActionState = { error?: string; success?: string; inviteUrl?: string };

export async function createInvitationAction(
  _: ActionState | undefined,
  formData: FormData,
): Promise<ActionState> {
  const user = await requireUser("/dashboard");
  const supabase = await createSupabaseServerClient();

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const groupId = String(formData.get("group_id") ?? "").trim() || null;

  if (!email || !email.includes("@")) {
    return { error: "Ange en giltig e-postadress." };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("inviter_id", user.id)
    .gte("created_at", today.toISOString());

  if ((count ?? 0) >= MAX_INVITES_PER_DAY) {
    return { error: "Du har redan skickat 3 inbjudningar idag. Prova igen imorgon." };
  }

  const { data: existing } = await supabase
    .from("invitations")
    .select("id")
    .eq("inviter_id", user.id)
    .eq("email", email)
    .maybeSingle();

  if (existing) {
    return { error: "Du har redan bjudit in den här personen." };
  }

  const { data: invite, error } = await supabase
    .from("invitations")
    .insert({
      inviter_id: user.id,
      email,
      group_id: groupId,
    })
    .select("token")
    .single();

  if (error) {
    return { error: error.message };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  const inviteUrl = `${appUrl}/register?ref=${invite.token}`;

  revalidatePath("/dashboard");
  return {
    success: `Inbjudan skapad! Skicka länken till ${email}.`,
    inviteUrl,
  };
}
