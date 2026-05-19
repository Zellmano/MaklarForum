import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { AgentProfileForm } from "@/components/agent-profile-form";
import { formatDate } from "@/lib/format";
import {
  getAgentDashboardQuestionFeed,
  getAgentGroupsForUser,
  getAgentLeadMetrics,
  getAgentProfile,
  getAnswersByAgent,
  getMessageThreads,
} from "@/lib/data";

export default async function AgentProfileDashboardPage() {
  const user = await requireRole("agent", "/dashboard/profil");
  const supabase = await createSupabaseServerClient();

  const [profile, answers, threads, groups, questionFeed, leads, areaRows, listingsCount] = await Promise.all([
    getAgentProfile(user.id),
    getAnswersByAgent(user.id),
    getMessageThreads(user.id),
    getAgentGroupsForUser(user.id),
    getAgentDashboardQuestionFeed(user.id),
    getAgentLeadMetrics(user.id),
    supabase.from("agent_areas").select("municipality, region").eq("agent_id", user.id),
    supabase.from("agent_listings").select("id", { count: "exact", head: true }).eq("agent_id", user.id).eq("status", "active"),
  ]);

  const myGroups = groups.filter((group) => group.isMember);
  const suggestedGroups = groups.filter((group) => !group.isMember && group.status === "approved").slice(0, 6);

  return (
    <div>
      <h1 className="text-4xl">Min mäklarprofil</h1>
      <p className="mt-2 text-[var(--muted)]">
        Här hanterar du all information som kunder ser om dig samt dina meddelanden, grupper och aktiva trådar.
      </p>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <div className="metric">
          <p className="text-2xl font-semibold">{answers.length}</p>
          <p className="text-xs text-[var(--muted)]">Publicerade svar</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{threads.reduce((acc, thread) => acc + thread.unreadCount, 0)}</p>
          <p className="text-xs text-[var(--muted)]">Olästa meddelanden</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{myGroups.length}</p>
          <p className="text-xs text-[var(--muted)]">Mina grupper</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{listingsCount.count ?? 0}</p>
          <p className="text-xs text-[var(--muted)]">Aktiva objekt</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="metric">
          <p className="text-2xl font-semibold">{leads.sentTotal}</p>
          <p className="text-xs text-[var(--muted)]">Automatiska tips/leads totalt</p>
        </div>
        <div className="metric">
          <p className="text-2xl font-semibold">{leads.sentLast30Days}</p>
          <p className="text-xs text-[var(--muted)]">Automatiska tips/leads senaste 30 dagar</p>
        </div>
      </div>

      <section className="mt-6 card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-xl">Profilinformation</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Allt här syns på din publika profilsida för kunder.
            </p>
          </div>
          {profile?.slug ? (
            <Link href={`/maklare/${profile.slug}`} className="pill pill-light">
              Förhandsvisa kundprofil
            </Link>
          ) : null}
        </div>

        {profile ? (
          <div className="mt-4">
            <AgentProfileForm
              defaults={{
                fullName: profile.fullName,
                firm: profile.firm,
                title: profile.title,
                city: profile.city,
                bio: profile.bio,
              }}
            />
          </div>
        ) : (
          <p className="mt-4 text-sm text-[var(--muted)]">Ingen profil hittades ännu.</p>
        )}

        <div className="mt-4 rounded-xl border border-[var(--line)] bg-white p-3 text-sm text-[var(--muted)]">
          <p className="font-medium text-[var(--ink)]">Områden du verkar i</p>
          {areaRows.data && areaRows.data.length > 0 ? (
            <p className="mt-1">
              {areaRows.data.map((row) => `${row.municipality}, ${row.region}`).join(" | ")}
            </p>
          ) : (
            <p className="mt-1">Inga områden sparade ännu.</p>
          )}
        </div>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <article className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Meddelanden</h2>
            <Link href="/dashboard/messages" className="text-sm text-[var(--accent)]">
              Öppna inkorg
            </Link>
          </div>
          <div className="mt-4 space-y-3">
            {threads.slice(0, 5).map((thread) => (
              <Link
                key={thread.otherUserId}
                href={`/dashboard/messages/${thread.otherUserId}`}
                className="block rounded-xl border border-[var(--line)] bg-white p-3"
              >
                <p className="font-medium">{thread.otherUserName}</p>
                <p className="mt-1 text-sm text-[var(--muted)]">{thread.lastMessage}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(thread.lastMessageAt)} • Olästa: {thread.unreadCount}</p>
              </Link>
            ))}
            {threads.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga meddelanden ännu.</p> : null}
          </div>
        </article>

        <article className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-xl">Grupper</h2>
            <Link href="/dashboard/grupper" className="text-sm text-[var(--accent)]">
              Hantera grupper
            </Link>
          </div>
          <p className="mt-2 text-sm text-[var(--muted)]">Förslag baserat på din ort och dina nuvarande medlemskap.</p>
          <div className="mt-4 space-y-3">
            {myGroups.slice(0, 3).map((group) => (
              <div key={group.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
                <p className="font-medium">{group.name}</p>
                <p className="text-xs text-[var(--muted)]">Medlem • {group.memberCount} medlemmar</p>
              </div>
            ))}
            {suggestedGroups.slice(0, 3).map((group) => (
              <div key={group.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
                <p className="font-medium">{group.name}</p>
                <p className="text-xs text-[var(--muted)]">Förslag • {group.memberCount} medlemmar</p>
              </div>
            ))}
            {groups.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga grupper ännu.</p> : null}
          </div>
        </article>
      </section>

      <section className="mt-6 card">
        <div className="flex items-center justify-between">
          <h2 className="text-xl">Frågor att svara på</h2>
          <Link href="/dashboard/fragor" className="text-sm text-[var(--accent)]">
            Se alla frågor
          </Link>
        </div>
        <div className="mt-4 space-y-3">
          {questionFeed.slice(0, 8).map((question) => (
            <Link key={question.id} href={`/fragor/${question.slug}`} className="block rounded-xl border border-[var(--line)] bg-white p-3">
              <p className="font-medium">{question.title}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">
                {question.category} • {question.geoScope}
                {question.municipality ? ` • ${question.municipality}` : ""}
                {question.region ? `, ${question.region}` : ""}
              </p>
              <p className="mt-1 text-xs text-[var(--muted)]">{question.answeredByMe ? "Du har svarat" : "Ej besvarad av dig"}</p>
            </Link>
          ))}
          {questionFeed.length === 0 ? <p className="text-sm text-[var(--muted)]">Inga frågor hittades ännu.</p> : null}
        </div>
      </section>
    </div>
  );
}
