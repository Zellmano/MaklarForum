"use client";

export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card max-w-2xl">
      <h1 className="text-2xl">Något gick fel</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Adminpanelen kunde inte laddas. Kontrollera att databasen är korrekt konfigurerad.
      </p>
      <pre className="mt-4 overflow-auto rounded-lg bg-[var(--line)] p-3 text-xs">
        {error.message}
      </pre>
      <button onClick={reset} className="pill pill-dark mt-4">
        Försök igen
      </button>
    </div>
  );
}
