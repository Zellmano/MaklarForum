import Link from "next/link";
import { requireRole } from "@/lib/auth";

export default async function PendingPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const user = await requireRole("agent", "/dashboard/pending");
  const params = await searchParams;
  const isSuspended = params.status === "suspended" || user.verificationStatus === "suspended";

  return (
    <div className="card max-w-2xl">
      <h1 className="text-3xl">
        {isSuspended ? "Kontot är pausat" : "Väntar på godkännande"}
      </h1>
      <p className="mt-3 text-[var(--muted)]">
        {isSuspended
          ? "Din profil har pausats av en admin. Vanligast är att vi behöver verifiera något — kontakta oss på maklarforum@gmail.com så hjälper vi dig snabbt."
          : "Tack för att du registrerade dig på MäklarForum. En admin granskar din profil och aktiverar kontot inom 1–2 vardagar."}
      </p>

      {!isSuspended ? (
        <div className="mt-6 space-y-3 text-sm">
          <p className="font-semibold">Medan du väntar:</p>
          <ul className="list-disc space-y-1 pl-5 text-[var(--muted)]">
            <li>Fyll i din profil så vi kan verifiera dig snabbare</li>
            <li>Vi mailar dig så snart du är godkänd</li>
          </ul>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/dashboard/profil" className="pill pill-dark">
          Min profil
        </Link>
        <Link href="/" className="pill pill-light">
          Tillbaka till startsidan
        </Link>
      </div>

      <p className="mt-6 text-xs text-[var(--muted)]">
        Inloggad som <strong>{user.email}</strong>
      </p>
    </div>
  );
}
