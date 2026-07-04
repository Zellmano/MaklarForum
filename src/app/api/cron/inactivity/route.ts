import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { emailNotificationsEnabled, sendReactivationEmail } from "@/lib/email";
import { createNotifications } from "@/lib/notifications";

const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

/**
 * Weekly cron (see vercel.json): finds verified members who haven't been seen
 * for over a year, emails them a "kom in och kika"-reminder and notifies all
 * admins in-app. Each member is reminded at most once per year
 * (reactivation_email_sent_at gates re-sends).
 *
 * Protected by CRON_SECRET — Vercel Cron sends it as a Bearer token.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let admin;
  try {
    admin = createSupabaseAdminClient();
  } catch {
    return NextResponse.json({ error: "Supabase admin env missing" }, { status: 500 });
  }

  const yearAgo = new Date(Date.now() - YEAR_MS).toISOString();

  const { data: inactive, error } = await admin
    .from("profiles")
    .select("id, email, full_name, last_seen_at, notification_prefs")
    .eq("role", "agent")
    .eq("verification_status", "verified")
    .lt("last_seen_at", yearAgo)
    .or(`reactivation_email_sent_at.is.null,reactivation_email_sent_at.lt.${yearAgo}`)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const reminded: string[] = [];
  for (const profile of inactive ?? []) {
    if (emailNotificationsEnabled(profile.notification_prefs)) {
      await sendReactivationEmail({ to: profile.email, name: profile.full_name });
    }
    await admin
      .from("profiles")
      .update({ reactivation_email_sent_at: new Date().toISOString() })
      .eq("id", profile.id);
    reminded.push(profile.full_name);
  }

  if (reminded.length > 0) {
    const { data: admins } = await admin.from("profiles").select("id").eq("role", "admin");
    await createNotifications(
      (admins ?? []).map((a) => ({
        user_id: a.id,
        type: "inactive_member" as const,
        title: `${reminded.length} ${reminded.length === 1 ? "medlem" : "medlemmar"} har varit inaktiva i över ett år`,
        body: `Påminnelsemail har skickats till: ${reminded.join(", ")}`,
        link: "/admin",
      })),
    );
  }

  return NextResponse.json({ checked: inactive?.length ?? 0, reminded: reminded.length });
}
