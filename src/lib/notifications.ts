import { createSupabaseAdminClient } from "@/lib/supabase/server";

export type NotificationRow = {
  user_id: string;
  type: "new_message" | "new_group_post" | "group_approved" | "join_request";
  title: string;
  body?: string | null;
  link?: string | null;
};

/**
 * Inserts in-app notifications using the service-role client (the notifications
 * INSERT path is closed to normal users). Safe to call with an empty array.
 */
export async function createNotifications(rows: NotificationRow[]): Promise<void> {
  if (rows.length === 0) return;
  try {
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("notifications").insert(rows);
    if (error) console.error("createNotifications failed", error);
  } catch (err) {
    console.error("createNotifications threw", err);
  }
}

export async function createNotification(row: NotificationRow): Promise<void> {
  await createNotifications([row]);
}
