import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPublicDefaultGroupPolls, getPublicGroupPreviews } from "@/lib/public-preview";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect(user.role === "admin" ? "/admin" : "/dashboard");
  }

  const [groups, polls] = await Promise.all([
    getPublicGroupPreviews(6),
    getPublicDefaultGroupPolls(1),
  ]);

  return (
    <div className="pb-8">
      <section className="hero relative overflow-hidden rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-8 shadow-sm sm:p-12">
        <div className="hero-image absolute inset-0" aria-hidden="true" />
        <div className="hero-overlay absolute inset-0" aria-hidden="true" />
        <div className="relative">
          <p className="pill pill-light">Beta 2026 • Endast för verifierade mäklare</p>
          <h1 className="mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl">
            Sveriges största community för fastighetsmäklare.
          </h1>
          <p className="mt-4 max-w-3xl text-[var(--ink)]">
            MäklarForum är ett slutet community där du som mäklare kan skapa grupper i området du
            bor eller i kedjan du jobbar i och diskutera allt från vardagsfrågor med kollegor i din
            kommun, region eller hela landet till juridik och sälj.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/register" className="pill pill-dark">
              Skapa mäklarkonto
            </Link>
            <Link href="/login" className="pill pill-light">
              Logga in
            </Link>
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Du behöver företagsmail för att registrera dig. Profilen godkänns manuellt av admin innan du får tillgång.
          </p>
        </div>
      </section>

      <section className="mt-10 grid gap-4 md:grid-cols-3">
        <article className="card">
          <h3 className="text-lg font-semibold">Geografiska grupper</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Gå med i offentliga eller privata grupper för din kommun, region eller specialisering. Diskutera lokala marknadsläget och utbyt erfarenheter med kollegor du faktiskt möter.
          </p>
        </article>
        <article className="card">
          <h3 className="text-lg font-semibold">Frågor & röstning</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Ställ frågor till andra mäklare. Bra svar röstas upp av kollegor och lyfts fram i flödet.
          </p>
        </article>
        <article className="card">
          <h3 className="text-lg font-semibold">Direktmeddelanden</h3>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Bygg nätverk över hela landet med direktmeddelanden mellan verifierade mäklare.
          </p>
        </article>
      </section>

      {groups.length > 0 ? (
        <section className="mt-10">
          <div className="flex items-end justify-between">
            <h2 className="text-2xl">Populära grupper just nu</h2>
            <p className="text-xs text-[var(--muted)]">
              Logga in för att se diskussioner och gå med
            </p>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {groups.map((g) => (
              <article
                key={g.slug}
                className="rounded-2xl border border-[var(--line)] bg-white p-4"
              >
                <p className="font-semibold">{g.name}</p>
                <p className="mt-1 text-xs text-[var(--muted)]">
                  {[g.municipality, g.region].filter(Boolean).join(", ") || "Sverige"}
                </p>
                <p className="mt-3 text-sm">
                  <span className="font-medium">{g.memberCount}</span>{" "}
                  <span className="text-[var(--muted)]">
                    {g.memberCount === 1 ? "medlem" : "medlemmar"}
                  </span>
                </p>
              </article>
            ))}
          </div>
        </section>
      ) : null}

      {polls.length > 0 ? (
        <section className="mt-10 card">
          <p className="text-xs uppercase tracking-wide text-[var(--muted)]">
            Aktuell omröstning &bull; {polls[0].groupName}
          </p>
          <h2 className="mt-2 text-2xl">{polls[0].title}</h2>
          {polls[0].description ? (
            <p className="mt-2 text-sm text-[var(--muted)]">{polls[0].description}</p>
          ) : null}
          <div className="mt-4 space-y-2">
            {polls[0].options.map((opt, idx) => {
              const pct = polls[0].totalVotes > 0 ? Math.round((opt.votes / polls[0].totalVotes) * 100) : 0;
              return (
                <div key={idx} className="rounded-xl border border-[var(--line)] bg-white p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span>{opt.label}</span>
                    <span className="text-[var(--muted)]">
                      {opt.votes} röster &bull; {pct}%
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 rounded-full bg-gray-100">
                    <div
                      className="h-full rounded-full bg-[var(--accent)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-4 text-xs text-[var(--muted)]">
            Totalt {polls[0].totalVotes} {polls[0].totalVotes === 1 ? "röst" : "röster"} &bull;{" "}
            <Link href="/register" className="text-[var(--accent)]">
              Skapa konto för att rösta
            </Link>
          </p>
        </section>
      ) : null}

      <section className="mt-10 card">
        <h2 className="text-2xl">Så funkar det</h2>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm">
          <li>
            <strong>Registrera dig</strong> med ditt namn, företagsmail, mäklarfirma och stad.
          </li>
          <li>
            <strong>Admin verifierar</strong> profilen manuellt (vanligtvis inom 24 timmar).
          </li>
          <li>
            <strong>Välj grupper</strong> du vill vara med i baserat på din kommun och region.
          </li>
          <li>
            <strong>Börja diskutera</strong> med andra verifierade mäklare i hela Sverige.
          </li>
        </ol>
      </section>
    </div>
  );
}
