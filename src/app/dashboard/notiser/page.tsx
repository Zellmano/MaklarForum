import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/format";
import { markAllNotificationsReadAction, markNotificationReadAction, openNotificationAction } from "./actions";

export default async function NotificationsPage() {
  const user = await requireUser("/dashboard/notiser");
  const supabase = await createSupabaseServerClient();

  const { data: notifications } = await supabase
    .from("notifications")
    .select("id, type, title, body, link, read_at, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(100);

  const hasUnread = (notifications ?? []).some((n) => !n.read_at);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-4xl">Notiser</h1>
        {hasUnread && (
          <form action={markAllNotificationsReadAction}>
            <button className="pill pill-light">Markera alla som lästa</button>
          </form>
        )}
      </div>
      <p className="mt-2 text-[var(--muted)]">Nya meddelanden, gruppinlägg och godkännanden.</p>

      <section className="mt-6 space-y-3">
        {(!notifications || notifications.length === 0) && (
          <div className="card text-sm text-[var(--muted)]">Inga notiser ännu.</div>
        )}
        {(notifications ?? []).map((n) => {
          const inner = (
            <div className={`flex items-start justify-between gap-3 rounded-xl border p-4 ${n.read_at ? "border-[var(--line)] bg-white" : "border-[var(--accent)] bg-[var(--paper)]"}`}>
              <div>
                <p className="font-medium">{n.title}</p>
                {n.body ? <p className="mt-1 text-sm text-[var(--muted)]">{n.body}</p> : null}
                <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(n.created_at)}</p>
              </div>
              {!n.read_at && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" />}
            </div>
          );
          return n.link ? (
            <form key={n.id} action={openNotificationAction.bind(null, n.id, n.link)} className="block w-full">
              <button type="submit" className="block w-full text-left">{inner}</button>
            </form>
          ) : (
            <form key={n.id} action={markNotificationReadAction.bind(null, n.id)} className="block w-full">
              <button type="submit" className="block w-full text-left">{inner}</button>
            </form>
          );
        })}
      </section>
    </div>
  );
}
