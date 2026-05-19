import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-4xl">Priser</h1>
      <p className="mt-2 max-w-3xl text-[var(--muted)]">
        Under betaperioden är MäklarForum helt gratis för verifierade mäklare. Vi planerar att lansera Pro- och Team-planer efter beta — du som är med från start får förmånliga villkor.
      </p>

      <section className="mt-8 card">
        <span className="pill pill-light">Beta 2026</span>
        <h2 className="mt-3 text-3xl">Gratis under beta</h2>
        <p className="mt-2 text-[var(--muted)]">
          Alla funktioner ingår: grupper, diskussioner, röstning, meddelanden och mäklarkatalog.
        </p>
        <ul className="mt-4 space-y-2 text-sm">
          <li>✓ Verifierad mäklarprofil</li>
          <li>✓ Skapa och gå med i obegränsat antal grupper</li>
          <li>✓ Ställ frågor, svara och rösta</li>
          <li>✓ Direktmeddelanden mellan mäklare</li>
          <li>✓ Internt forum för bransch-diskussioner</li>
        </ul>
        <div className="mt-6">
          <Link href="/register" className="pill pill-dark">
            Skapa mäklarkonto
          </Link>
        </div>
      </section>

      <section className="mt-6 card">
        <h2 className="text-2xl">Efter beta</h2>
        <p className="mt-2 text-sm text-[var(--muted)]">
          Planerade planer (preliminärt, exakta priser sätts efter beta):
        </p>
        <ul className="mt-4 space-y-3 text-sm">
          <li>
            <strong>Bas — gratis:</strong> Verifierad profil, gå med i grupper, läs och delta i diskussioner.
          </li>
          <li>
            <strong>Pro:</strong> Skapa privata grupper, profilbild, prioriterad support, profilstatistik.
          </li>
          <li>
            <strong>Team:</strong> Kontorsfunktioner, gemensam administration, fakturering per kontor.
          </li>
        </ul>
        <p className="mt-4 text-xs text-[var(--muted)]">
          Som beta-användare får du erbjudande om förmånliga villkor när Pro-planen lanseras.
        </p>
      </section>
    </div>
  );
}
