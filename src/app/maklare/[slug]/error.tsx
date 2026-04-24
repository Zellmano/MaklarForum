"use client";

import Link from "next/link";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card max-w-xl text-center">
      <h2 className="text-2xl">Något gick fel</h2>
      <p className="mt-2 text-sm text-[var(--muted)]">Kunde inte ladda mäklarprofilen. Försök igen eller gå tillbaka.</p>
      <div className="mt-4 flex justify-center gap-3">
        <button onClick={reset} className="pill pill-dark">Försök igen</button>
        <Link href="/maklare" className="pill pill-light">Alla mäklare</Link>
      </div>
    </div>
  );
}
