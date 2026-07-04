"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { joinAgentGroupAction } from "@/app/dashboard/actions";

export interface DirectoryGroup {
  id: string;
  name: string;
  slug: string;
  description: string;
  municipality: string;
  region: string;
  memberCount: number;
  isPrivate: boolean;
  emailDomain: string | null;
  category: "city" | "firm" | "school" | null;
}

const categoryTitles: Array<{ key: DirectoryGroup["category"]; title: string }> = [
  { key: "city", title: "Städer" },
  { key: "firm", title: "Mäklarfirmor & kedjor" },
  { key: "school", title: "Högskolor & utbildningar" },
  { key: null, title: "Övriga grupper" },
];

export function GroupDirectory({
  groups,
  pendingGroupIds,
  userEmailDomain,
  showJoin,
}: {
  groups: DirectoryGroup[];
  pendingGroupIds: string[];
  userEmailDomain: string;
  showJoin: boolean;
}) {
  const [query, setQuery] = useState("");
  const pending = useMemo(() => new Set(pendingGroupIds), [pendingGroupIds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return groups;
    return groups.filter((g) =>
      [g.name, g.municipality, g.region, g.description]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [groups, query]);

  const sections = categoryTitles
    .map(({ key, title }) => ({ title, groups: filtered.filter((g) => g.category === key) }))
    .filter((s) => s.groups.length > 0);

  return (
    <div>
      <label className="block">
        <span className="sr-only">Sök grupper</span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Sök på stad, firma, skola eller gruppnamn..."
          className="w-full rounded-xl border border-[var(--line)] bg-white p-3 text-sm"
        />
      </label>

      {filtered.length === 0 ? (
        <p className="mt-6 text-sm text-[var(--muted)]">
          Inga grupper matchar din sökning. Du kan skapa en ny grupp längre ner på sidan.
        </p>
      ) : null}

      {sections.map(({ title, groups: sectionGroups }) => (
        <section key={title} className="mt-6">
          <h2 className="text-xl">
            {title} <span className="text-sm text-[var(--muted)]">({sectionGroups.length})</span>
          </h2>
          <div className="mt-3 space-y-3">
            {sectionGroups.map((group) => {
              const domainMatch =
                !!group.emailDomain &&
                userEmailDomain === group.emailDomain.toLowerCase();
              const instantJoin = !group.isPrivate || domainMatch;
              return (
                <article key={group.id} className="rounded-xl border border-[var(--line)] bg-white p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/dashboard/grupper/${group.slug}`}
                          className="font-semibold hover:text-[var(--accent)]"
                        >
                          {group.name}
                        </Link>
                        {group.isPrivate && !instantJoin ? (
                          <span className="rounded-full border border-[var(--line)] px-2 py-0.5 text-[10px] text-[var(--muted)]">
                            Ansökan krävs
                          </span>
                        ) : null}
                      </div>
                      <p className="text-sm text-[var(--muted)]">
                        {group.municipality || "-"} • {group.region || "-"}
                      </p>
                      {group.description ? (
                        <p className="mt-1 text-sm text-[var(--muted)]">{group.description}</p>
                      ) : null}
                    </div>
                    <p className="text-xs text-[var(--muted)]">{group.memberCount} medlemmar</p>
                  </div>
                  {showJoin ? (
                    <div className="mt-3">
                      {pending.has(group.id) ? (
                        <span className="pill pill-light opacity-60">Ansökan inskickad</span>
                      ) : (
                        <form action={joinAgentGroupAction.bind(null, group.id)}>
                          <button className="pill pill-dark">
                            {instantJoin ? "Gå med" : "Ansök om medlemskap"}
                          </button>
                          {domainMatch ? (
                            <span className="ml-2 text-xs text-[var(--muted)]">
                              Din företagsmail matchar — du går med direkt.
                            </span>
                          ) : null}
                        </form>
                      )}
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
