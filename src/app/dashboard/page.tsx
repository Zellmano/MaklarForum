import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { formatDate } from "@/lib/format";
import { getAgentGroupsForUser, getMessageThreads, getWatchedThreads } from "@/lib/data";
import Link from "next/link";
import InviteColleagueForm from "@/components/invite-colleague-form";

const verificationLabels: Record<string, string> = {
  pending: "Väntar på godkännande",
  verified: "Verifierad",
  suspended: "Avstängd",
};

export default async function AgentDashboardPage() {
  const user = await requireUser("/dashboard");

  let answerCount = 0;
  let questionCount = 0;
  let verification = "pending";

  if (hasSupabaseEnv()) {
    const supabase = await createSupabaseServerClient();
    const [{ count: ac }, { count: qc }, { data: profile }] = await Promise.all([
      supabase.from("answers").select("id", { count: "exact", head: true }).eq("answered_by", user.id),
      supabase.from("questions").select("id", { count: "exact", head: true }),
      supabase.from("profiles").select("verification_status").eq("id", user.id).single(),
    ]);
    answerCount = ac ?? 0;
    questionCount = qc ?? 0;
    verification = profile?.verification_status ?? "pending";
  }

  const [watchedThreads, messageThreads, groups] = await Promise.all([
    getWatchedThreads(user.id),
    getMessageThreads(user.id),
    getAgentGroupsForUser(user.id),
  ]);

  const myGroups = groups.filter((g) => g.isMember);

  return (
    <div>
      <h1 className="text-4xl">Välkommen, {user.fullName.split(" ")[0]}!</h1>
      <p className="mt-2 text-[var(--muted)]">Översikt över din aktivitet på MäklarForum.</p>

      {verification !== "verified" ? (
        <div className="mt-4 rounded-xl border border-yellow-300 bg-yellow-50 p-4 text-sm">
          <strong>Din profil väntar på godkännande.</strong> Du kan utforska plattformen men kan inte ställa frågor, svara eller publicera tips förrän admin har godkänt din profil (vanligtvis inom 24 timmar).
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap gap-2">
        <Link href="/dashboard/grupper" className="pill pill-dark">Grupper</Link>
        <Link href="/dashboard/fragor" className="pill pill-light">Frågor & diskussioner</Link>
        <Link href="/dashboard/medlemmar" className="pill pill-light">Mäklare</Link>
        <Link href="/dashboard/messages" className="pill pill-light">Meddelanden</Link>
        <Link href="/dashboard/profil" className="pill pill-light">Min profil</Link>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="metric">
          <p className="text-2xl font-semibold">{myGroups.length}</p>
          <p className="text-xs text-[var(--muted)]">Mina grupper</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{answerCount}</p>
          <p className="text-xs text-[var(--muted)]">Mina svar</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{questionCount}</p>
          <p className="text-xs text-[var(--muted)]">Frågor i communityt</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{verificationLabels[verification] ?? "Väntar"}</p>
          <p className="text-xs text-[var(--muted)]">Verifieringsstatus</p>
        </div>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Mina grupper</h2>
            <Link href="/dashboard/grupper" className="text-sm text-[var(--accent)]">Visa alla</Link>
          </div>
          <div className="mt-4 space-y-3">
            {myGroups.length === 0 ? (
              <p className="text-sm text-[var(--muted)]">
                Du är inte med i någon grupp ännu. <Link href="/dashboard/grupper" className="text-[var(--accent)]">Gå med eller skapa en</Link>.
              </p>
            ) : null}
            {myGroups.slice(0, 5).map((group) => (
              <Link
                key={group.id}
                href={`/dashboard/grupper/${group.slug}`}
                className="block rounded-xl border border-[var(--line)] bg-white p-3"
              >
                <p className="font-medium">{group.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {group.municipality || "-"} • {group.region || "-"} • {group.memberCount} medlemmar
                </p>
              </Link>
            ))}
          </div>
        </article>

        <article className="card">
          <h2 className="text-xl">Bevakade trådar</h2>
          <div className="mt-4 space-y-3">
            {watchedThreads.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga bevakade trådar.</p> : null}
            {watchedThreads.slice(0, 5).map((thread) => (
              <Link
                key={thread.questionId}
                href={`/dashboard/fragor/${thread.questionSlug}`}
                className="block rounded-xl border border-[var(--line)] bg-white p-3"
              >
                <p className="font-medium">{thread.title}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{thread.answerCount} svar • {formatDate(thread.createdAt)}</p>
              </Link>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Senaste meddelanden</h2>
            <Link href="/dashboard/messages" className="text-sm text-[var(--accent)]">Öppna inkorg</Link>
          </div>
          <div className="mt-4 space-y-3">
            {messageThreads.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga meddelanden ännu.</p> : null}
            {messageThreads.slice(0, 5).map((thread) => (
              <Link
                key={thread.otherUserId}
                href={`/dashboard/messages/${thread.otherUserId}`}
                className="block rounded-xl border border-[var(--line)] bg-white p-3"
              >
                <p className="font-medium">{thread.otherUserName}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{thread.lastMessage}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {formatDate(thread.lastMessageAt)} • Olästa: {thread.unreadCount}
                </p>
              </Link>
            ))}
          </div>
        </article>

        <article className="card">
          <h2 className="text-xl">Bjud in kollega</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Hjälp communityt växa — bjud in mäklarkollegor du vill ha med på MäklarForum.
          </p>
          <div className="mt-4">
            <InviteColleagueForm appUrl={process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"} />
          </div>
        </article>
      </section>
    </div>
  );
}
