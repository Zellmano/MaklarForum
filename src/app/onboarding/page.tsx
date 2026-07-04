import Link from "next/link";
import { requireRole } from "@/lib/auth";
import { getAgentGroupsForUser } from "@/lib/data";
import { joinAgentGroupAction } from "@/app/dashboard/actions";

export default async function OnboardingPage() {
  const user = await requireRole("agent", "/onboarding");
  const groups = await getAgentGroupsForUser(user.id);
  const approved = groups.filter((g) => g.status === "approved");
  const myCount = groups.filter((g) => g.isMember).length;
  const userEmailDomain = user.email.split("@")[1]?.toLowerCase() ?? "";

  const sections = [
    { title: "Din stad", groups: approved.filter((g) => g.category === "city") },
    { title: "Din mäklarfirma", groups: approved.filter((g) => g.category === "firm") },
    { title: "Din skola", groups: approved.filter((g) => g.category === "school") },
    { title: "Övriga grupper", groups: approved.filter((g) => g.category === null) },
  ];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="card">
        <p className="pill pill-light">Steg 1 av 1</p>
        <h1 className="mt-3 text-3xl">Välkommen till MäklarForum!</h1>
        <p className="mt-2 text-[var(--muted)]">
          Din profil är skickad för granskning. Medan du väntar — välj 1-3 grupper som matchar din kommun, region eller specialisering. Du kan ändra detta senare.
        </p>

        {myCount > 0 ? (
          <div className="mt-4 rounded-xl border border-[var(--accent)] bg-white p-3 text-sm">
            Du har gått med i <strong>{myCount}</strong> grupp{myCount === 1 ? "" : "er"}. Bra start!
          </div>
        ) : null}

        {approved.length === 0 ? (
          <p className="mt-6 text-sm text-[var(--muted)]">Inga grupper finns ännu. Du kan skapa en själv från dashboarden!</p>
        ) : null}
        {sections.map(({ title, groups: sectionGroups }) =>
          sectionGroups.length === 0 ? null : (
            <div key={title} className="mt-6">
              <h2 className="text-lg font-semibold">{title}</h2>
              <div className="mt-3 space-y-3">
                {sectionGroups.map((group) => (
                  <article key={group.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold">{group.name}</p>
                        <p className="text-sm text-[var(--muted)]">
                          {group.municipality || "-"} | {group.region || "-"}
                        </p>
                      </div>
                      <p className="text-xs text-[var(--muted)]">{group.memberCount} medlemmar</p>
                    </div>
                    <div className="mt-3">
                      {group.isMember ? (
                        <span className="pill pill-light">Du är medlem</span>
                      ) : (
                        <form action={joinAgentGroupAction.bind(null, group.id)}>
                          <button className="pill pill-dark">
                            {!group.isPrivate ||
                            (group.emailDomain && userEmailDomain === group.emailDomain.toLowerCase())
                              ? "Gå med"
                              : "Ansök om medlemskap"}
                          </button>
                        </form>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          ),
        )}

        <div className="mt-8 flex justify-between gap-3">
          <Link href="/dashboard" className="pill pill-light">Hoppa över</Link>
          <Link href="/dashboard" className="pill pill-dark">Klar — gå till dashboard</Link>
        </div>
      </div>
    </div>
  );
}
