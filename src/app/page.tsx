import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const user = await getCurrentUser();
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="pb-8">
      <section className="rounded-3xl border border-[var(--line)] bg-[var(--paper)] p-8 shadow-sm">
        <p className="pill pill-light">Beta 2026 • Endast för verifierade mäklare</p>
        <h1 className="mt-4 max-w-3xl text-4xl leading-tight sm:text-5xl">
          Sveriges B2B-community för fastighetsmäklare.
        </h1>
        <p className="mt-4 max-w-3xl text-[var(--muted)]">
          MäklarForum är ett slutet community där du som mäklare kan diskutera juridik, budgivning, teknik och vardagsfrågor med kollegor i din kommun, region eller hela landet — utan brus från konsumenter.
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
