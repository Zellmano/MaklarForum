"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function openNotificationAction(notificationId: string, link: string) {
  const user = await requireUser("/dashboard/notiser");
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);
  const safeLink = link.startsWith("/") ? link : "/dashboard/notiser";
  redirect(safeLink);
}

export async function markAllNotificationsReadAction() {
  const user = await requireUser("/dashboard/notiser");
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", user.id)
    .is("read_at", null);
  revalidatePath("/dashboard/notiser");
  revalidatePath("/dashboard");
}

export async function markNotificationReadAction(notificationId: string) {
  const user = await requireUser("/dashboard/notiser");
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", user.id);
  revalidatePath("/dashboard/notiser");
}
