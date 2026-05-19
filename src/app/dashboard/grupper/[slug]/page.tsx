import { notFound } from "next/navigation";
import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { joinAgentGroupAction, leaveAgentGroupAction } from "@/app/dashboard/actions";
import { formatDate } from "@/lib/format";

export default async function GroupDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await requireRole("agent", `/dashboard/grupper/${slug}`);

  if (!hasSupabaseEnv()) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  const { data: group } = await supabase
    .from("agent_groups")
    .select("id, name, slug, description, municipality, region, status, is_private, created_at")
    .eq("slug", slug)
    .maybeSingle();

  if (!group) {
    notFound();
  }

  const [{ data: membership }, { data: members }, { data: questions }] = await Promise.all([
    supabase
      .from("agent_group_members")
      .select("role")
      .eq("group_id", group.id)
      .eq("agent_id", user.id)
      .maybeSingle(),
    supabase
      .from("agent_group_members")
      .select("agent_id, role, profiles:agent_id(id, full_name, profile_slug, firm, city)")
      .eq("group_id", group.id)
      .limit(50),
    supabase
      .from("questions")
      .select("id, title, question_slug, body, created_at")
      .eq("group_id", group.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const isMember = Boolean(membership);

  return (
    <div>
      <div className="mb-4">
        <Link href="/dashboard/grupper" className="text-sm text-[var(--accent)] hover:underline">← Alla grupper</Link>
      </div>

      <section className="card">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-2">
              {group.is_private ? <span className="pill pill-light">Privat</span> : <span className="pill pill-light">Offentlig</span>}
              <span className="pill pill-light">{group.municipality || "-"} • {group.region || "-"}</span>
            </div>
            <h1 className="mt-3 text-3xl">{group.name}</h1>
            {group.description ? <p className="mt-2 text-[var(--muted)]">{group.description}</p> : null}
          </div>
          <div>
            {isMember ? (
              <form action={leaveAgentGroupAction.bind(null, group.id)}>
                <button className="pill pill-light">Lämna grupp</button>
              </form>
            ) : (
              <form action={joinAgentGroupAction.bind(null, group.id)}>
                <button className="pill pill-dark">{group.is_private ? "Begär medlemskap" : "Gå med"}</button>
              </form>
            )}
          </div>
        </div>
      </section>

      <section className="mt-6 card">
        <h2 className="text-xl">Diskussioner i gruppen</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Visa diskussioner som är knutna till gruppen. Skapa en ny via &quot;Ställ en fråga&quot;.
        </p>
        <div className="mt-4 space-y-3">
          {(!questions || questions.length === 0) ? (
            <p className="text-sm text-[var(--muted)]">Inga diskussioner ännu.</p>
          ) : null}
          {(questions ?? []).map((q) => (
            <Link key={q.id} href={`/dashboard/fragor/${q.question_slug}`} className="block rounded-xl border border-[var(--line)] bg-white p-3">
              <p className="font-medium">{q.title}</p>
              <p className="mt-1 text-xs text-[var(--muted)]">{formatDate(q.created_at)}</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-6 card">
        <h2 className="text-xl">Medlemmar ({members?.length ?? 0})</h2>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          {(members ?? []).map((m) => {
            const profile = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
            if (!profile) return null;
            return (
              <Link
                key={m.agent_id}
                href={`/dashboard/medlemmar/${profile.profile_slug}`}
                className="rounded-xl border border-[var(--line)] bg-white p-3 text-sm hover:border-[var(--accent)]"
              >
                <p className="font-medium">{profile.full_name}</p>
                <p className="text-xs text-[var(--muted)]">{profile.firm || "-"} • {profile.city || "-"}</p>
                {m.role === "owner" ? <p className="mt-1 text-xs text-[var(--accent)]">Ägare</p> : null}
              </Link>
            );
          })}
        </div>
      </section>
    </div>
  );
}
